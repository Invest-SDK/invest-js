/**
 * Параметрический sweep по SBER/SBERP на 1-min свечах за последние N часов.
 *
 * Запуск:
 *   tsx examples/nest-sdk/src/backtest/sweep-sber-sberp.ts [--hours 6]
 *
 * Перебирает (zscoreWindow, entryThreshold) и печатает таблицу:
 *   window | entry | trades | wins | net% | mean% | maxDD% | netAfterCost%
 *
 * netAfterCost = net - trades * 4 * 5bp (four legs per round trip).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Decimal } from '@ttech-pub/invest-core';
import { BarSeriesManager, PositionType } from '@ttech-pub/invest-engine-node';
import type { Position } from '@ttech-pub/invest-engine-node';
import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { CandleInterval } from '@ttech-pub/grpc-node-client';
import { InstrumentsResolver } from './data/instruments-resolver';
import { CandlesLoader } from './data/candles-loader';
import { alignByTime } from './data/align';
import { buildSpreadSeries } from './strategy/build-spread-series';
import { createPairStrategy } from './strategy/pairs-strategy';

const ENV_PATH = path.resolve(__dirname, '../../.env');

function loadEnv(): void {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function asNum(d: Decimal | number): number {
  return typeof d === 'number' ? d : parseFloat(d.toString());
}

const COST_FRACTION = 0.0005;

interface SweepResult {
  window: number;
  entry: number;
  trades: number;
  wins: number;
  netLog: number;
  meanLog: number;
  maxDD: number;
}

function runOne(
  aligned: ReturnType<typeof alignByTime>,
  window: number,
  entry: number
): SweepResult {
  const series = buildSpreadSeries(aligned, { name: 'sweep' });
  const out: SweepResult = { window, entry, trades: 0, wins: 0, netLog: 0, meanLog: 0, maxDD: 0 };
  if (series.barCount < window * 2) return out;

  const closed: Position[] = [];
  for (const side of ['long', 'short'] as const) {
    const { strategy } = createPairStrategy(series, {
      side,
      zscoreWindow: window,
      entryThreshold: new Decimal(entry.toString()),
      exitThreshold: new Decimal('0'),
      stopThreshold: new Decimal('4'),
    });
    const mgr = new BarSeriesManager(series);
    const rec = mgr.run(strategy, {
      positionType: side === 'long' ? PositionType.LONG : PositionType.SHORT,
    });
    closed.push(...rec.getClosedPositions());
  }

  const roundTrip = 4 * COST_FRACTION;
  const pnls = closed.map((p) => asNum(p.getProfit()) - roundTrip);
  out.trades = pnls.length;
  out.wins = pnls.filter((x) => x > 0).length;
  out.netLog = pnls.reduce((a, b) => a + b, 0);
  out.meanLog = pnls.length ? out.netLog / pnls.length : 0;

  let eq = 0,
    peak = 0,
    maxDD = 0;
  for (const x of pnls) {
    eq += x;
    if (eq > peak) peak = eq;
    if (peak - eq > maxDD) maxDD = peak - eq;
  }
  out.maxDD = maxDD;
  return out;
}

function pct(logRet: number): number {
  return (Math.exp(logRet) - 1) * 100;
}

async function main(): Promise<void> {
  loadEnv();
  let hours = 6;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--hours') hours = Number(process.argv[++i]);
  }

  const token = process.env.INVEST_API_TOKEN;
  if (!token) {
    console.error('INVEST_API_TOKEN missing');
    process.exit(1);
  }
  const sdk = await InvestNodeSDK.create({
    token,
    url: process.env.INVEST_API_HOST,
    useMincifryCertificate: true,
  });
  const resolver = new InstrumentsResolver(sdk);
  const loader = new CandlesLoader(sdk);

  const sber = await resolver.resolve('SBER', 'share');
  const sberp = await resolver.resolve('SBERP', 'share');
  if (!sber || !sberp) {
    console.error('Cannot resolve SBER/SBERP');
    process.exit(1);
  }

  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  console.log(
    `# Loading 1-min bars from ${from.toISOString()} to ${to.toISOString()} (~${hours}h)`
  );
  const [a, b] = await Promise.all([
    loader.load({ figi: sber.figi, from, to, interval: CandleInterval.CANDLE_INTERVAL_1_MIN }),
    loader.load({ figi: sberp.figi, from, to, interval: CandleInterval.CANDLE_INTERVAL_1_MIN }),
  ]);
  console.log(`# legA=${a.length} bars, legB=${b.length} bars`);
  const aligned = alignByTime(a, b);
  console.log(`# aligned=${aligned.length} bars`);
  console.log('');

  const windows = [10, 20, 30, 60];
  const entries = [0.8, 1.0, 1.5, 2.0];

  console.log(
    'window | entry | trades | wins | winRate% | net %     | mean %    | maxDD %   | gross %   | comm %'
  );
  console.log(
    '-------|-------|--------|------|----------|-----------|-----------|-----------|-----------|--------'
  );

  for (const w of windows) {
    for (const e of entries) {
      const r = runOne(aligned, w, e);
      const winRate = r.trades ? (r.wins / r.trades) * 100 : 0;
      const grossLog = r.netLog + r.trades * 4 * COST_FRACTION;
      const commPct = r.trades * 4 * COST_FRACTION * 100;
      console.log(
        `${String(w).padStart(6)} | ${e.toFixed(2).padStart(5)} | ` +
          `${String(r.trades).padStart(6)} | ${String(r.wins).padStart(4)} | ` +
          `${winRate.toFixed(1).padStart(8)} | ` +
          `${pct(r.netLog).toFixed(3).padStart(9)} | ` +
          `${pct(r.meanLog).toFixed(3).padStart(9)} | ` +
          `${((1 - Math.exp(-r.maxDD)) * 100).toFixed(3).padStart(9)} | ` +
          `${pct(grossLog).toFixed(3).padStart(9)} | ` +
          `${commPct.toFixed(3).padStart(6)}`
      );
    }
  }
  console.log('\n# net % = после комиссии (5bp × 4 ноги per round-trip), gross % = до комиссии.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
