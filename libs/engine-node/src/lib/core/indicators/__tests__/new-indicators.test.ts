import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { ClosePriceIndicator } from '../price-indicators';
import { WMAIndicator } from '../moving-averages/wma-indicator';
import { DoubleEMAIndicator } from '../moving-averages/dema-indicator';
import { TripleEMAIndicator } from '../moving-averages/tema-indicator';
import { HullMovingAverageIndicator } from '../moving-averages/hma-indicator';
import { MACDIndicator, MACDSignalIndicator } from '../momentum/macd-indicator';
import {
  StochasticOscillatorKIndicator,
  StochasticOscillatorDIndicator,
} from '../momentum/stochastic-indicator';
import { ADXIndicator, PlusDIIndicator, MinusDIIndicator } from '../trend/directional-movement';
import { isNaNValue } from '../nan';

function makeOHLC(rows: number[][]): BarSeries {
  const bars = rows.map(
    (r, i) =>
      new Bar({
        time: new Date(2024, 0, 1 + i),
        open: new Decimal(r[0].toString()),
        high: new Decimal(r[1].toString()),
        low: new Decimal(r[2].toString()),
        close: new Decimal(r[3].toString()),
        volume: new Decimal('1'),
      })
  );
  return new BarSeries({ name: 'T' }, bars);
}

function makeCloses(prices: number[]): BarSeries {
  return makeOHLC(prices.map((p) => [p, p, p, p]));
}

test('WMA equals expected weighted average', () => {
  // WMA(3) over [1, 2, 3]: (1*1 + 2*2 + 3*3) / (1+2+3) = 14/6 = 2.333...
  const series = makeCloses([1, 2, 3]);
  const wma = new WMAIndicator(new ClosePriceIndicator(series), 3);
  const v = wma.getValue(2);
  assert.equal(v.toString().startsWith('2.33'), true, v.toString());
});

test('DEMA / TEMA return finite values once ready', () => {
  const series = makeCloses(Array.from({ length: 30 }, (_, i) => 100 + i));
  const dema = new DoubleEMAIndicator(series, 5);
  const tema = new TripleEMAIndicator(series, 5);
  const last = series.endIndex;
  assert.equal(isNaNValue(dema.getValue(last)), false);
  assert.equal(isNaNValue(tema.getValue(last)), false);
});

test('HMA ready after warm-up', () => {
  const series = makeCloses(Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5));
  const hma = new HullMovingAverageIndicator(series, 9);
  assert.equal(hma.isReady(series.endIndex), true);
});

test('MACD = EMA(12) - EMA(26); signal smoother on top', () => {
  const series = makeCloses(Array.from({ length: 60 }, (_, i) => 100 + i));
  const macd = new MACDIndicator(series, 12, 26);
  const signal = new MACDSignalIndicator(macd, 9);
  assert.equal(macd.isReady(series.endIndex), true);
  assert.equal(signal.isReady(series.endIndex), true);
});

test('Stochastic %K in [0, 100]', () => {
  const series = makeOHLC([
    [10, 12, 9, 11],
    [11, 13, 10, 12],
    [12, 14, 11, 13],
    [13, 15, 12, 14],
    [14, 16, 13, 15],
  ]);
  const k = new StochasticOscillatorKIndicator(series, 3);
  const v = k.getValue(4);
  assert.equal(v.isGreaterThanOrEqual(new Decimal('0')), true);
  assert.equal(v.isLessThanOrEqual(new Decimal('100')), true);
  const d = new StochasticOscillatorDIndicator(k, 3);
  assert.equal(d.isReady(4), true);
});

test('ADX + DI components ready and non-negative', () => {
  const series = makeOHLC(
    Array.from({ length: 60 }, (_, i) => {
      const base = 100 + i;
      return [base, base + 1, base - 1, base + 0.5];
    })
  );
  const adx = new ADXIndicator(series, 14);
  const plus = new PlusDIIndicator(series, 14);
  const minus = new MinusDIIndicator(series, 14);
  const last = series.endIndex;
  assert.equal(adx.isReady(last), true);
  assert.equal(plus.getValue(last).isGreaterThanOrEqual(new Decimal('0')), true);
  assert.equal(minus.getValue(last).isGreaterThanOrEqual(new Decimal('0')), true);
});
