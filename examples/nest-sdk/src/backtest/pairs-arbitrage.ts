/**
 * Парный арбитраж — бэктест на 5 классах пар.
 *
 * Запуск (sandbox):
 *   tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts
 *
 * Запуск с mock-данными (без сети):
 *   tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts --mock
 *
 * Требует INVEST_API_HOST + INVEST_API_TOKEN в examples/nest-sdk/.env (для
 * sandbox-режима). Скрипт читает .env синхронно перед стартом.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BarSeriesManager, PositionType } from '@ttech-pub/invest-engine-node';
import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { CandleInterval } from '@ttech-pub/grpc-node-client';
import { PAIRS } from './config/pairs.config';
import type { PairConfig } from './config/pairs.config';
import { BACKTEST_CONFIG } from './config/backtest.config';
import { InstrumentsResolver, isExpired } from './data/instruments-resolver';
import { CandlesLoader } from './data/candles-loader';
import type { CandleSample } from './data/candles-loader';
import { alignByTime } from './data/align';
import { generateMockPair } from './data/mock-data';
import { buildSpreadSeries } from './strategy/build-spread-series';
import { createPairStrategy } from './strategy/pairs-strategy';
import type { PairSide } from './strategy/pairs-strategy';
import { formatPairReport, REPORT_NOTES } from './reporter/report';
import type { PairBacktestResult } from './reporter/report';

const ENV_PATH = path.resolve(__dirname, '../../.env');

function loadEnv(): void {
  if (!fs.existsSync(ENV_PATH)) return;
  const text = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of text.split(/\r?\n/)) {
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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

interface PairData {
  legA: { ticker: string; samples: CandleSample[] };
  legB: { ticker: string; samples: CandleSample[] };
}

async function loadPairData(
  pair: PairConfig,
  resolver: InstrumentsResolver,
  loader: CandlesLoader
): Promise<PairData | { skipped: string }> {
  const ra = await resolver.resolve(pair.legA.ticker, pair.legA.class);
  const rb = await resolver.resolve(pair.legB.ticker, pair.legB.class);
  if (!ra) return { skipped: `legA ${pair.legA.ticker} not found in instruments` };
  if (!rb) return { skipped: `legB ${pair.legB.ticker} not found in instruments` };

  const expiredA = isExpired(ra);
  const expiredB = isExpired(rb);
  if (expiredA)
    return { skipped: `legA ${ra.ticker} expired (${ra.expirationDate?.toISOString()})` };
  if (expiredB)
    return { skipped: `legB ${rb.ticker} expired (${rb.expirationDate?.toISOString()})` };

  const to = new Date();
  const from = new Date(to.getTime() - BACKTEST_CONFIG.lookbackDays * 24 * 60 * 60 * 1000);
  const interval = CandleInterval.CANDLE_INTERVAL_HOUR;

  let samplesA: CandleSample[];
  let samplesB: CandleSample[];
  try {
    [samplesA, samplesB] = await Promise.all([
      loader.load({ figi: ra.figi, from, to, interval }),
      loader.load({ figi: rb.figi, from, to, interval }),
    ]);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (msg.includes('GetCandles') || msg.includes('70001') || msg.includes('INTERNAL')) {
      return { skipped: `candles unavailable in sandbox (${msg.split('\n')[0]})` };
    }
    throw err;
  }

  return {
    legA: { ticker: ra.ticker, samples: samplesA },
    legB: { ticker: rb.ticker, samples: samplesB },
  };
}

function runBacktest(
  pairData: PairData,
  pair: PairConfig,
  side: PairSide
): PairBacktestResult | null {
  const aligned = alignByTime(pairData.legA.samples, pairData.legB.samples);
  if (aligned.length < BACKTEST_CONFIG.zscoreWindow * 2) return null;

  const series = buildSpreadSeries(aligned, { name: pair.name });
  const { strategy } = createPairStrategy(series, {
    side,
    zscoreWindow: BACKTEST_CONFIG.zscoreWindow,
    entryThreshold: BACKTEST_CONFIG.entryThreshold,
    exitThreshold: BACKTEST_CONFIG.exitThreshold,
    stopThreshold: BACKTEST_CONFIG.stopThreshold,
  });

  const manager = new BarSeriesManager(series);
  const record = manager.run(strategy, {
    positionType: side === 'long' ? PositionType.LONG : PositionType.SHORT,
  });

  return {
    pairName: pair.name,
    side,
    series,
    record,
    transactionCostFraction: BACKTEST_CONFIG.transactionCostFraction,
    bars: series.barCount,
  };
}

async function main(): Promise<void> {
  loadEnv();
  const useMock = process.argv.includes('--mock');

  console.log('# Pairs arbitrage backtest');
  console.log(`# Mode: ${useMock ? 'MOCK (no network)' : 'SANDBOX'}`);
  console.log(`# Lookback: ${BACKTEST_CONFIG.lookbackDays} days, 1H candles`);
  console.log(
    `# z-score window=${BACKTEST_CONFIG.zscoreWindow}, entry=|z|>${BACKTEST_CONFIG.entryThreshold.toString()}, ` +
      `exit=z=${BACKTEST_CONFIG.exitThreshold.toString()}, stop=|z|>${BACKTEST_CONFIG.stopThreshold.toString()}`
  );
  for (const note of REPORT_NOTES) console.log(`# ${note}`);
  console.log('');

  let sdk: InvestNodeSDK | null = null;
  let resolver: InstrumentsResolver | null = null;
  let loader: CandlesLoader | null = null;

  if (!useMock) {
    const token = process.env.INVEST_API_TOKEN;
    const url = process.env.INVEST_API_HOST;
    if (!token) {
      console.error(
        'INVEST_API_TOKEN не задан. Положите его в examples/nest-sdk/.env или передайте флаг --mock.'
      );
      process.exit(1);
    }
    sdk = await InvestNodeSDK.create({ token, url, useMincifryCertificate: true });
    resolver = new InstrumentsResolver(sdk);
    loader = new CandlesLoader(sdk);
  }

  for (const pair of PAIRS) {
    console.log(`\n--- ${pair.name}: ${pair.description}`);
    let pairData: PairData | { skipped: string };

    if (useMock) {
      const seed = (PAIRS.indexOf(pair) + 1) * 1000;
      const { a, b } = generateMockPair({
        barCount: 500,
        basePriceA: 100 + PAIRS.indexOf(pair) * 10,
        basePriceB: 95 + PAIRS.indexOf(pair) * 9,
        seed,
      });
      pairData = {
        legA: { ticker: pair.legA.ticker, samples: a },
        legB: { ticker: pair.legB.ticker, samples: b },
      };
    } else {
      try {
        pairData = await loadPairData(
          pair,
          resolver as InstrumentsResolver,
          loader as CandlesLoader
        );
      } catch (err) {
        console.log(`  ERROR loading pair: ${(err as Error).message}`);
        continue;
      }
    }

    if ('skipped' in pairData) {
      console.log(`  SKIPPED: ${pairData.skipped}`);
      continue;
    }

    if (pairData.legA.samples.length === 0 || pairData.legB.samples.length === 0) {
      console.log(
        `  EMPTY data: legA=${pairData.legA.samples.length} bars, legB=${pairData.legB.samples.length} bars`
      );
      continue;
    }

    for (const side of ['long', 'short'] as const) {
      const result = runBacktest(pairData, pair, side);
      if (!result) {
        console.log(
          `  ${side.toUpperCase()}: insufficient aligned data for z-window=${BACKTEST_CONFIG.zscoreWindow}`
        );
        continue;
      }
      for (const line of formatPairReport(result)) {
        console.log(line);
      }
    }
  }
  console.log('\n# Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
