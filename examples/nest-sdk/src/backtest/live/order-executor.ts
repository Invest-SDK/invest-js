/**
 * TwoLegOrderExecutor — превращает `OrderIntent` от `LiveStrategyRunner`
 * в две sandbox-заявки (long-A + short-B либо short-A + long-B).
 *
 * Цена исполнения берётся из ответа на PostSandboxOrder (`executedOrderPrice`
 * — Money с currency=RUB). В sandbox MARKET-ордера срабатывают мгновенно,
 * ответ уже содержит фактическую цену.
 *
 * Опционально слушает `GetActiveOrdersStreamCommand` для подтверждения
 * терминального статуса каждого orderId (filter по EXECUTION_REPORT_STATUS_FILL).
 * Это даёт более production-like reconciliation: если `executedOrderPrice`
 * не пришёл сразу, его можно получить из стрима. Подписка опциональна через
 * флаг `subscribeOrderState` — для dry-run она не нужна.
 */

import { Decimal } from '@ttech-pub/invest-core';
import {
  GetActiveOrdersStreamCommand,
  InvestNodeSDK,
  PostSandboxOrderCommand,
} from '@ttech-pub/invest-sdk-node';
import {
  OrderDirection,
  OrderType,
  TimeInForceType,
  PriceType,
  OrderExecutionReportStatus,
} from '@ttech-pub/grpc-node-client';
import type { PostOrderResponse } from '@ttech-pub/grpc-node-client';
import type { Subscription } from 'rxjs';
import type { OrderIntent } from '@ttech-pub/invest-engine-node';

export interface LegInstrument {
  ticker: string;
  figi: string;
  /** Lot size инструмента (Share.lot / Etf.lot). */
  lot: number;
}

export interface ExecutorOptions {
  accountId: string;
  legA: LegInstrument;
  legB: LegInstrument;
  /** True — не отправлять ордера, только логировать. */
  dryRun: boolean;
  /** Подписаться на OrderStateStream и логировать fill-события. */
  subscribeOrderState: boolean;
}

export interface LegFill {
  leg: 'a' | 'b';
  ticker: string;
  direction: 'buy' | 'sell';
  orderId: string;
  executionStatus: OrderExecutionReportStatus;
  executedPrice: Decimal | null;
  executedCommission: Decimal | null;
  lotsRequested: number;
  lotsExecuted: number;
  lot: number;
  message?: string;
}

export interface SpreadFills {
  intent: OrderIntent;
  legA: LegFill | { dryRun: true; orderId: string; direction: 'buy' | 'sell' };
  legB: LegFill | { dryRun: true; orderId: string; direction: 'buy' | 'sell' };
}

export class TwoLegOrderExecutor {
  private _ordersStreamSub: Subscription | null = null;
  private readonly _streamEvents = new Map<string, LegFill>();

  constructor(
    private readonly _sdk: InvestNodeSDK,
    private readonly _options: ExecutorOptions
  ) {}

  /**
   * Включает подписку на стрим состояний ордеров. Логирует терминальные
   * события в map по orderId — executor может опросить их после CreateOrder.
   */
  startOrderStateStream(
    onEvent?: (orderId: string, status: OrderExecutionReportStatus) => void
  ): void {
    if (this._ordersStreamSub || !this._options.subscribeOrderState) return;

    const grouped = this._sdk.send(
      new GetActiveOrdersStreamCommand({ accounts: [this._options.accountId] })
    );

    this._ordersStreamSub = grouped.subscribe({
      next: (group$) => {
        group$.subscribe({
          next: (item) => {
            const s = item.orderState;
            if (!s) return;
            const instrument =
              s.ticker === this._options.legA.ticker
                ? this._options.legA
                : s.ticker === this._options.legB.ticker
                  ? this._options.legB
                  : undefined;
            if (!instrument) return;
            this._streamEvents.set(s.orderId, {
              leg: instrument === this._options.legA ? 'a' : 'b',
              ticker: s.ticker,
              direction: s.direction === OrderDirection.ORDER_DIRECTION_BUY ? 'buy' : 'sell',
              orderId: s.orderId,
              executionStatus: s.executionReportStatus,
              executedPrice: moneyToDecimal(s.executedOrderPrice),
              executedCommission: null,
              lotsRequested: s.lotsRequested,
              lotsExecuted: s.lotsExecuted,
              lot: s.lotSize,
            });
            onEvent?.(s.orderId, s.executionReportStatus);
          },
          error: () => undefined,
        });
      },
      error: (err) => {
        console.warn('[order-state-stream] error:', (err as Error).message);
      },
    });
  }

  stopOrderStateStream(): void {
    this._ordersStreamSub?.unsubscribe();
    this._ordersStreamSub = null;
  }

  /**
   * Исполняет intent: размещает 2 ордера. Возвращает оба fill'а.
   * В dry-run только формирует «фейковые» fills для лог-цели.
   */
  async execute(intent: OrderIntent): Promise<SpreadFills> {
    const dirA: 'buy' | 'sell' = intent.side;
    const dirB: 'buy' | 'sell' = intent.side === 'buy' ? 'sell' : 'buy';
    const ts = intent.time.getTime();
    const orderIdA = makeOrderId(this._options.legA.ticker, dirA, String(ts));
    const orderIdB = makeOrderId(this._options.legB.ticker, dirB, String(ts));

    if (this._options.dryRun) {
      return {
        intent,
        legA: { dryRun: true, orderId: orderIdA, direction: dirA },
        legB: { dryRun: true, orderId: orderIdB, direction: dirB },
      };
    }

    const lots = quantityToLots(intent.quantity);
    const results = await Promise.allSettled([
      this._placeLeg('a', this._options.legA, dirA, lots, orderIdA),
      this._placeLeg('b', this._options.legB, dirB, lots, orderIdB),
    ]);
    const fills = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [String(result.reason)] : []
    );
    const incomplete = fills.filter((fill) => !isCompleteFill(fill));

    if (failures.length > 0 || incomplete.length > 0) {
      const rollbackResults = await Promise.allSettled(
        fills
          .filter((fill) => fill.lotsExecuted > 0)
          .map((fill) => {
            const instrument = fill.leg === 'a' ? this._options.legA : this._options.legB;
            const reverseDirection = fill.direction === 'buy' ? 'sell' : 'buy';
            return this._placeLeg(
              fill.leg,
              instrument,
              reverseDirection,
              fill.lotsExecuted,
              makeOrderId(instrument.ticker, reverseDirection, `${ts}-rollback-${fill.orderId}`)
            );
          })
      );
      const rollbackFailures = rollbackResults.flatMap((result) =>
        result.status === 'rejected'
          ? [String(result.reason)]
          : !isCompleteFill(result.value)
            ? [`${result.value.orderId}: ${result.value.executionStatus}`]
            : []
      );
      const reason = [
        ...failures,
        ...incomplete.map((fill) => `${fill.orderId}: ${fill.executionStatus}`),
      ];
      if (rollbackFailures.length > 0)
        reason.push(`rollback failed: ${rollbackFailures.join('; ')}`);
      throw new Error(`two-leg order failed: ${reason.join('; ')}`);
    }

    return { intent, legA: fills[0], legB: fills[1] };
  }

  /** Возвращает последнее наблюдаемое состояние orderId из стрима (если был). */
  getStreamEvent(orderId: string): LegFill | undefined {
    return this._streamEvents.get(orderId);
  }

  private async _placeLeg(
    leg: 'a' | 'b',
    instrument: LegInstrument,
    direction: 'buy' | 'sell',
    lots: number,
    orderId: string
  ): Promise<LegFill> {
    const response: PostOrderResponse = await this._sdk.send(
      new PostSandboxOrderCommand({
        accountId: this._options.accountId,
        figi: instrument.figi,
        instrumentId: instrument.figi,
        quantity: lots,
        direction:
          direction === 'buy'
            ? OrderDirection.ORDER_DIRECTION_BUY
            : OrderDirection.ORDER_DIRECTION_SELL,
        orderType: OrderType.ORDER_TYPE_MARKET,
        orderId,
        timeInForce: TimeInForceType.TIME_IN_FORCE_DAY,
        priceType: PriceType.PRICE_TYPE_CURRENCY,
        confirmMarginTrade: true,
      })
    );

    return {
      leg,
      ticker: instrument.ticker,
      direction,
      orderId: response.orderId,
      executionStatus: response.executionReportStatus,
      executedPrice: moneyToDecimal(response.executedOrderPrice),
      executedCommission: moneyToDecimal(response.executedCommission),
      lotsRequested: response.lotsRequested,
      lotsExecuted: response.lotsExecuted,
      lot: instrument.lot,
      message: response.message,
    };
  }
}

/** Идемпотентный orderId. UUID v4 от строки-семени. */
function makeOrderId(ticker: string, dir: string, seedPart: string): string {
  const seed = `${ticker}-${dir}-${seedPart}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hex = h.toString(16).padStart(8, '0').repeat(4).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function moneyToDecimal(
  m: { units?: number; nano?: number } | { decimal: Decimal } | undefined
): Decimal | null {
  if (!m) return null;
  if ('decimal' in m) return m.decimal;
  return new Decimal({ units: m.units ?? 0, nano: m.nano ?? 0 });
}

export function calculateSpreadCommission(a: LegFill, b: LegFill): Decimal {
  return normalizedCommission(a).add(normalizedCommission(b));
}

function normalizedCommission(fill: LegFill): Decimal {
  if (!fill.executedCommission || fill.executedCommission.isZero()) {
    return new Decimal('0');
  }
  if (!fill.executedPrice || fill.executedPrice.isZero()) {
    throw new Error(`cannot normalize commission without executed price for ${fill.orderId}`);
  }
  const notional = new Decimal(String(fill.lotsExecuted))
    .multiply(new Decimal(String(fill.lot)))
    .multiply(fill.executedPrice);
  return fill.executedCommission.divide(notional);
}

function quantityToLots(quantity: Decimal): number {
  const lots = Number(quantity.toString());
  if (!Number.isSafeInteger(lots) || lots <= 0) {
    throw new Error(
      `quantity must be a positive integer number of lots, got ${quantity.toString()}`
    );
  }
  return lots;
}

export function isCompleteFill(fill: LegFill): boolean {
  return (
    fill.executionStatus === OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_FILL &&
    fill.lotsRequested > 0 &&
    fill.lotsExecuted === fill.lotsRequested &&
    !!fill.executedPrice &&
    !fill.executedPrice.isZero()
  );
}
