/**
 * LiveStrategyRunner — runtime-агностичный мост «новый бар → решение → намерение ордера».
 *
 * Зачем без rxjs: engine-node должен оставаться лёгким (только invest-core).
 * Потребитель сам адаптирует Observable<Candle> в этот API через .subscribe + .push.
 *
 * Лайфцикл:
 * 1. Создать BarSeries (можно с warmup-историей).
 * 2. Сконструировать Strategy.
 * 3. Создать LiveStrategyRunner(series, strategy, options).
 * 4. На каждом новом баре вызвать runner.push(bar) → получить null или OrderIntent.
 * 5. Намерение замаппить в реальный CreateOrderCommand на стороне приложения.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar/bar';
import { BarSeries } from '../bar/bar-series';
import { TradingRecord, PositionType } from '../trading/trading-record';
import { FixedQuantitySizer, PositionSizer } from '../sizing/position-sizer';
import { OrderSide } from '../slippage/slippage-model';
import { Strategy } from './strategy';

export type OrderType = 'market' | 'limit';

export interface OrderIntent {
  /** При входе в LONG = 'buy', при выходе = 'sell'. Зеркально для SHORT. */
  side: OrderSide;
  /** Желаемый объём в единицах инструмента. */
  quantity: Decimal;
  /** Ориентир цены (close последнего бара). Для market-ордеров — справочно. */
  referencePrice: Decimal;
  /** Тип ордера. По умолчанию runner эмитит 'market'. */
  type: OrderType;
  /** Индекс бара, на котором сработала стратегия. */
  index: number;
  /** Время бара. */
  time: Date;
}

export interface LiveStrategyRunnerOptions {
  positionType?: PositionType;
  positionSizer?: PositionSizer;
  /** Стартовый капитал для %-сайзеров. Default = 0. */
  initialEquity?: Decimal;
  /** Тип эмитируемых ордеров. Default = 'market'. */
  orderType?: OrderType;
  /**
   * Внешняя торговая запись. Default — runner создаёт свою.
   * Передавайте свою, если хотите вести state совместно с реконсилиацией от брокера.
   */
  record?: TradingRecord;
}

export class LiveStrategyRunner {
  private readonly _series: BarSeries;
  private readonly _strategy: Strategy;
  private readonly _record: TradingRecord;
  private readonly _sizer: PositionSizer;
  private readonly _initialEquity: Decimal;
  private readonly _orderType: OrderType;
  private readonly _positionType: PositionType;

  constructor(series: BarSeries, strategy: Strategy, options?: LiveStrategyRunnerOptions) {
    this._series = series;
    this._strategy = strategy;
    this._positionType = options?.positionType ?? PositionType.LONG;
    this._record = options?.record ?? new TradingRecord(this._positionType);
    this._sizer = options?.positionSizer ?? new FixedQuantitySizer(new Decimal('1'));
    this._initialEquity = options?.initialEquity ?? new Decimal('0');
    this._orderType = options?.orderType ?? 'market';
  }

  getSeries(): BarSeries {
    return this._series;
  }

  getRecord(): TradingRecord {
    return this._record;
  }

  /**
   * Push нового бара. Возвращает OrderIntent или null, если стратегия не сработала
   * либо размер позиции = 0 (например, ATR-сайзер на warm-up).
   *
   * Не выполняет ордер — это задача вызывающего кода. После того как ордер
   * подтверждён брокером, потребитель должен вызвать {@link recordFill}.
   */
  push(bar: Bar): OrderIntent | null {
    this._series.addBar(bar);
    const index = this._series.endIndex;

    if (index < this._strategy.getUnstableBars()) return null;
    if (!this._strategy.shouldOperate(index, this._record)) return null;

    const isLong = this._positionType === PositionType.LONG;
    const opened = this._record.isOpened();
    const side: OrderSide = opened ? (isLong ? 'sell' : 'buy') : isLong ? 'buy' : 'sell';

    let quantity: Decimal;
    if (opened) {
      quantity = this._record.currentTrade?.getAmount() ?? new Decimal('0');
    } else {
      quantity = this._sizer.size({
        series: this._series,
        index,
        price: bar.close,
        record: this._record,
        initialEquity: this._initialEquity,
      });
    }
    if (quantity.isZero() || quantity.isNegative()) return null;

    return {
      side,
      quantity,
      referencePrice: bar.close,
      type: this._orderType,
      index,
      time: bar.time,
    };
  }

  /**
   * Подтверждает исполнение последнего intent: записывает entry/exit в record
   * по фактической цене и комиссии (приходят от брокера).
   *
   * Вызывайте после того как `CreateOrderCommand` вернул FILLED и вы получили
   * подтверждённые `executedPrice`/`executedCommission`. На стороне runner
   * нет «pending» состояния — ровно одна запись fill на один push.
   */
  recordFill(intent: OrderIntent, executedPrice: Decimal, executedCommission: Decimal): void {
    const isLong = this._positionType === PositionType.LONG;
    const isEntrySide = (isLong && intent.side === 'buy') || (!isLong && intent.side === 'sell');
    if (isEntrySide) {
      this._record.entry(
        intent.index,
        executedPrice,
        intent.quantity,
        executedCommission,
        intent.time
      );
    } else {
      this._record.exit(
        intent.index,
        executedPrice,
        intent.quantity,
        executedCommission,
        intent.time
      );
    }
  }
}
