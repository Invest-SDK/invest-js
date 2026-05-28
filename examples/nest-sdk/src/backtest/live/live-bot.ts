/**
 * Live pair-trading bot (P6) — демо на sandbox.
 *
 * Запуск:
 *   tsx examples/nest-sdk/src/backtest/live/live-bot.ts [flags]
 *
 * Флаги:
 *   --duration-sec 300        сколько работать (default 300)
 *   --warmup-bars 60          сколько исторических 1H баров грузить
 *   --dry-run                 не отправлять ордера, только лог
 *   --force-entry-after 30    форс-вход через N секунд (для верификации)
 *   --force-exit-after 60     форс-выход через M секунд после force entry
 *   --max-orders 5            safety cap на число intent'ов
 *   --pair sber-sberp         (пока единственное значение)
 *
 * Требует в examples/nest-sdk/.env:
 *   INVEST_API_TOKEN=...
 *   INVEST_API_HOST=https://invest-public-api.tinkoff.ru:443  (опц.)
 *   INVEST_SANDBOX_ACCOUNT_ID=...  (опц. — иначе создадим новый)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Decimal } from '@ttech-pub/invest-core';
import {
  GetMarketdataStreamCommand,
  GetSharesCommand,
  InvestNodeSDK,
} from '@ttech-pub/invest-sdk-node';
import {
  CandleInterval,
  InstrumentStatus,
  SubscriptionInterval,
  SubscriptionAction,
  OrderExecutionReportStatus,
} from '@ttech-pub/grpc-node-client';
import { BarSeries, LiveStrategyRunner, PositionType } from '@ttech-pub/invest-engine-node';
import type { Subscription } from 'rxjs';

import { BACKTEST_CONFIG } from '../config/backtest.config';
import { InstrumentsResolver } from '../data/instruments-resolver';
import type { ResolvedInstrument } from '../data/instruments-resolver';
import { CandlesLoader } from '../data/candles-loader';
import type { CandleSample } from '../data/candles-loader';
import { alignByTime } from '../data/align';
import { buildSpreadBar } from '../strategy/build-spread-series';
import { createPairStrategy } from '../strategy/pairs-strategy';
import { bootstrapSandbox } from './sandbox-bootstrap';
import { TwoLegBarBuffer } from './two-leg-bar-buffer';
import { calculateSpreadCommission, isCompleteFill, TwoLegOrderExecutor } from './order-executor';
import type { SpreadFills } from './order-executor';

const ENV_PATH = path.resolve(__dirname, '../../../.env');

interface CliArgs {
  durationSec: number;
  warmupBars: number;
  dryRun: boolean;
  forceEntryAfter: number | null;
  forceExitAfter: number;
  maxOrders: number;
}

function parseArgs(): CliArgs {
  const out: CliArgs = {
    durationSec: 300,
    warmupBars: BACKTEST_CONFIG.zscoreWindow,
    dryRun: false,
    forceEntryAfter: null,
    forceExitAfter: 60,
    maxOrders: 5,
  };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--duration-sec') out.durationSec = Number(process.argv[++i]);
    else if (a === '--warmup-bars') out.warmupBars = Number(process.argv[++i]);
    else if (a === '--force-entry-after') out.forceEntryAfter = Number(process.argv[++i]);
    else if (a === '--force-exit-after') out.forceExitAfter = Number(process.argv[++i]);
    else if (a === '--max-orders') out.maxOrders = Number(process.argv[++i]);
    else if (a === '--pair') i++;
  }
  return out;
}

function loadEnv(): void {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function log(prefix: string, msg: string): void {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${prefix} ${msg}`);
}

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs();

  const token = process.env.INVEST_API_TOKEN;
  const host = process.env.INVEST_API_HOST;
  if (!token) {
    console.error('INVEST_API_TOKEN missing in .env');
    process.exit(1);
  }

  const sdk = new InvestNodeSDK({ token, url: host });
  log(
    'boot',
    `mode=${args.dryRun ? 'DRY-RUN' : 'LIVE'} dur=${args.durationSec}s warmup=${args.warmupBars}`
  );

  const sandbox = await bootstrapSandbox(sdk, {
    preferredAccountId: process.env.INVEST_SANDBOX_ACCOUNT_ID,
  });
  log(
    'boot',
    `sandbox account=${sandbox.accountId} balance=${sandbox.rubBalance} rub` +
      (sandbox.created ? ' (created)' : '') +
      (sandbox.paidIn ? ` (paid in ${sandbox.paidIn})` : '')
  );
  if (sandbox.created) {
    log('hint', `export INVEST_SANDBOX_ACCOUNT_ID=${sandbox.accountId}`);
  }

  const resolver = new InstrumentsResolver(sdk);
  const sber = await resolver.resolve('SBER', 'share');
  const sberp = await resolver.resolve('SBERP', 'share');
  if (!sber || !sberp) {
    console.error(`Cannot resolve tickers: SBER=${!!sber}, SBERP=${!!sberp}`);
    process.exit(1);
  }
  log('boot', `legA SBER  figi=${sber.figi}`);
  log('boot', `legB SBERP figi=${sberp.figi}`);

  const lots = await resolveLots(sdk, sber, sberp);

  const loader = new CandlesLoader(sdk);
  const to = new Date();
  const from = new Date(to.getTime() - args.warmupBars * 60 * 60 * 1000 * 3);
  const interval = CandleInterval.CANDLE_INTERVAL_HOUR;
  log('warmup', `loading ${args.warmupBars}+ 1H bars per leg…`);
  const [histA, histB] = await Promise.all([
    loader.load({ figi: sber.figi, from, to, interval }),
    loader.load({ figi: sberp.figi, from, to, interval }),
  ]);
  log('warmup', `legA=${histA.length} bars, legB=${histB.length} bars`);
  const aligned = alignByTime(histA, histB).slice(-args.warmupBars);
  log('warmup', `aligned=${aligned.length} bars`);

  const series = new BarSeries({ name: 'SBER/SBERP-live' }, []);
  for (const sample of aligned) {
    const bar = buildSpreadBar(sample);
    if (bar) series.addBar(bar);
  }
  log('warmup', `warm spread bars: ${series.barCount}`);

  const { strategy } = createPairStrategy(series, {
    side: 'long',
    zscoreWindow: BACKTEST_CONFIG.zscoreWindow,
    entryThreshold: BACKTEST_CONFIG.entryThreshold,
    exitThreshold: BACKTEST_CONFIG.exitThreshold,
    stopThreshold: BACKTEST_CONFIG.stopThreshold,
  });
  const runner = new LiveStrategyRunner(series, strategy, { positionType: PositionType.LONG });

  const executor = new TwoLegOrderExecutor(sdk, {
    accountId: sandbox.accountId,
    legA: { ticker: 'SBER', figi: sber.figi, lot: lots.sber },
    legB: { ticker: 'SBERP', figi: sberp.figi, lot: lots.sberp },
    dryRun: args.dryRun,
    subscribeOrderState: !args.dryRun,
  });
  if (!args.dryRun) {
    executor.startOrderStateStream((orderId, status) => {
      log(
        'order-stream',
        `${orderId.slice(0, 8)}… status=${OrderExecutionReportStatus[status] ?? status}`
      );
    });
  }

  const buffer = new TwoLegBarBuffer();
  const stream = await sdk.send(
    new GetMarketdataStreamCommand({
      subscribeCandlesRequest: {
        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
        instruments: [
          {
            figi: sber.figi,
            interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_HOUR,
            instrumentId: sber.uid,
          },
          {
            figi: sberp.figi,
            interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_HOUR,
            instrumentId: sberp.uid,
          },
        ],
        waitingClose: true,
      },
      subscribeOrderBookRequest: undefined,
      subscribeTradesRequest: undefined,
      subscribeInfoRequest: undefined,
      subscribeLastPriceRequest: undefined,
      pingSettings: undefined,
    })
  );
  log('stream', 'subscribed candles SBER + SBERP @ 1H');

  let ordersPlaced = 0;
  let stopped = false;
  const streamSubscription = { current: undefined as Subscription | undefined };
  let activeOrder: Promise<void> | null = null;

  const trackOrder = (work: () => Promise<void>): void => {
    const promise = work().finally(() => {
      if (activeOrder === promise) activeOrder = null;
    });
    activeOrder = promise;
  };

  const onShutdown = async (reason: string): Promise<void> => {
    if (stopped) return;
    stopped = true;
    log('shutdown', reason);
    streamSubscription.current?.unsubscribe();
    executor.stopOrderStateStream();
    if (activeOrder) await activeOrder;

    const open = runner.getRecord().currentTrade;
    if (open && !args.dryRun) {
      const closeIntent = {
        side: open.isBuy() ? ('sell' as const) : ('buy' as const),
        quantity: open.getAmount(),
        referencePrice: open.getPrice(),
        type: 'market' as const,
        index: series.endIndex >= 0 ? series.endIndex : open.getIndex(),
        time: new Date(),
      };
      try {
        const fills = await executor.execute(closeIntent);
        logFills('shutdown-close', fills);
        recordFillsIntoRunner(runner, fills);
      } catch (err) {
        log('shutdown', `CLOSE ERROR ${(err as Error).message}`);
        process.exitCode = 1;
        return;
      }
    }

    const closed = runner.getRecord().getClosedPositions();
    log(
      'summary',
      `closed positions=${closed.length}, open trade=${runner.getRecord().currentTrade ? 'yes' : 'no'}`
    );
    setImmediate(() => process.exit(0));
  };
  process.on('SIGINT', () => void onShutdown('SIGINT'));

  setTimeout(() => void onShutdown('duration reached'), args.durationSec * 1000);

  if (args.forceEntryAfter !== null && !args.dryRun) {
    setTimeout(() => {
      if (stopped || activeOrder || ordersPlaced >= args.maxOrders) return;
      log('force', `force entry triggered after ${args.forceEntryAfter}s`);
      ordersPlaced++;
      const intent = {
        side: 'buy' as const,
        quantity: new Decimal('1'),
        referencePrice: new Decimal('0'),
        type: 'market' as const,
        index: series.endIndex >= 0 ? series.endIndex : 0,
        time: new Date(),
      };
      trackOrder(async () => {
        try {
          const fills = await executor.execute(intent);
          logFills('force-entry', fills);
          recordFillsIntoRunner(runner, fills);
        } catch (err) {
          log('force-entry', `ERROR ${(err as Error).message}`);
          return;
        }
        if (!runner.getRecord().currentTrade) return;
        setTimeout(() => {
          if (stopped || activeOrder) return;
          log('force', `force exit triggered after ${args.forceExitAfter}s`);
          ordersPlaced++;
          const exitIntent = {
            side: 'sell' as const,
            quantity: new Decimal('1'),
            referencePrice: new Decimal('0'),
            type: 'market' as const,
            index: series.endIndex >= 0 ? series.endIndex : 0,
            time: new Date(),
          };
          trackOrder(async () => {
            try {
              const fills = await executor.execute(exitIntent);
              logFills('force-exit', fills);
              recordFillsIntoRunner(runner, fills);
            } catch (err) {
              log('force-exit', `ERROR ${(err as Error).message}`);
            }
          });
        }, args.forceExitAfter * 1000);
      });
    }, args.forceEntryAfter * 1000);
  }

  streamSubscription.current = stream.subscribe({
    next: (item) => {
      if (!item.candle) return;
      const c = item.candle;
      if (!c.figi || !c.open || !c.high || !c.low || !c.close || !c.time) return;
      const leg = c.figi === sber.figi ? 'a' : c.figi === sberp.figi ? 'b' : null;
      if (!leg) return;
      const sample: CandleSample = {
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: Number(c.volume),
      };
      const paired = buffer.push(leg, sample);
      if (!paired) {
        log(
          'candle',
          `leg=${leg} t=${sample.time.toISOString().slice(11, 19)} pending=${buffer.pendingCount()}`
        );
        return;
      }
      log(
        'paired',
        `t=${paired.time.toISOString().slice(11, 19)} a.close=${paired.a.close.toString()} b.close=${paired.b.close.toString()}`
      );
      const bar = buildSpreadBar(paired);
      if (!bar) return;
      const intent = runner.push(bar);
      if (intent) {
        if (activeOrder) {
          log('intent', 'dropped — another order is in flight');
          return;
        }
        if (ordersPlaced >= args.maxOrders) {
          log('intent', `dropped — max orders reached (${args.maxOrders})`);
          return;
        }
        ordersPlaced++;
        log('intent', `side=${intent.side} qty=${intent.quantity.toString()} type=${intent.type}`);
        trackOrder(async () => {
          try {
            const fills = await executor.execute(intent);
            logFills('signal', fills);
            recordFillsIntoRunner(runner, fills);
          } catch (err) {
            log('signal', `ERROR ${(err as Error).message}`);
          }
        });
      }
    },
    error: (err) => {
      log('stream', `ERROR ${(err as Error).message}`);
      void onShutdown('stream error');
    },
    complete: () => {
      log('stream', 'completed');
      void onShutdown('stream complete');
    },
  });
}

function logFills(prefix: string, fills: SpreadFills): void {
  for (const leg of [fills.legA, fills.legB] as const) {
    if ('dryRun' in leg) {
      log(prefix, `  ${leg.direction.toUpperCase()} [dry] orderId=${leg.orderId.slice(0, 8)}…`);
    } else {
      log(
        prefix,
        `  ${leg.direction.toUpperCase()} ${leg.ticker} status=${OrderExecutionReportStatus[leg.executionStatus] ?? leg.executionStatus} ` +
          `price=${leg.executedPrice?.toString() ?? 'n/a'} lots=${leg.lotsExecuted}/${leg.lotsRequested}`
      );
    }
  }
}

function recordFillsIntoRunner(runner: LiveStrategyRunner, fills: SpreadFills): void {
  const a = fills.legA;
  const b = fills.legB;
  if ('dryRun' in a || 'dryRun' in b) return;
  if (!isCompleteFill(a) || !isCompleteFill(b)) {
    throw new Error('cannot record incomplete two-leg fill');
  }
  const priceA = a.executedPrice ?? new Decimal('0');
  const priceB = b.executedPrice ?? new Decimal('0');
  if (priceA.isZero() || priceB.isZero()) {
    throw new Error('cannot record two-leg fill without executed prices');
  }
  const lnRatio = Math.log(parseFloat(priceA.toString()) / parseFloat(priceB.toString()));
  const synthetic = new Decimal('1000').add(new Decimal(lnRatio.toFixed(10)));
  const commission = calculateSpreadCommission(a, b);
  runner.recordFill(fills.intent, synthetic, commission);
}

/** Достаёт `lot` из GetShares, потому что resolver не сохраняет это поле. */
async function resolveLots(
  sdk: InvestNodeSDK,
  sber: ResolvedInstrument,
  sberp: ResolvedInstrument
): Promise<{ sber: number; sberp: number }> {
  const res = await sdk.send(
    new GetSharesCommand({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE })
  );
  const find = (figi: string): number => {
    const x = res.instruments.find((i) => i.figi === figi);
    return x?.lot ?? 1;
  };
  return { sber: find(sber.figi), sberp: find(sberp.figi) };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
