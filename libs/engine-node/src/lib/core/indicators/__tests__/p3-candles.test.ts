import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import {
  RealBodyIndicator,
  UpperShadowIndicator,
  LowerShadowIndicator,
} from '../candles/body-shadow';
import { BullishEngulfingIndicator, BearishEngulfingIndicator } from '../candles/engulfing';
import {
  ThreeWhiteSoldiersIndicator,
  ThreeBlackCrowsIndicator,
} from '../candles/three-bar-patterns';

function ohlc(rows: Array<[number, number, number, number]>): BarSeries {
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

test('RealBody / UpperShadow / LowerShadow basics', () => {
  // open=10, high=15, low=8, close=12 → body=+2, upper=15-12=3, lower=10-8=2
  const series = ohlc([[10, 15, 8, 12]]);
  assert.equal(new RealBodyIndicator(series).getValue(0).toString(), '2');
  assert.equal(new UpperShadowIndicator(series).getValue(0).toString(), '3');
  assert.equal(new LowerShadowIndicator(series).getValue(0).toString(), '2');
});

test('BullishEngulfing detects classic pattern', () => {
  // Bar 0: bearish (open 12, close 10). Bar 1: bullish (open 9.5, close 12.5),
  // engulfs bar 0 body.
  const series = ohlc([
    [12, 12, 10, 10],
    [9.5, 13, 9, 12.5],
  ]);
  const r = new BullishEngulfingIndicator(series);
  assert.equal(r.getValue(0), false); // нет предыдущего
  assert.equal(r.getValue(1), true);
});

test('BearishEngulfing detects classic pattern', () => {
  const series = ohlc([
    [10, 12, 10, 12],
    [13, 13, 9, 9.5],
  ]);
  const r = new BearishEngulfingIndicator(series);
  assert.equal(r.getValue(1), true);
});

test('ThreeWhiteSoldiers / ThreeBlackCrows', () => {
  // Three bullish, each opens inside previous body, each closes higher.
  const whites = ohlc([
    [10, 11, 10, 11],
    [10.5, 12, 10.5, 12],
    [11.5, 13, 11.5, 13],
  ]);
  assert.equal(new ThreeWhiteSoldiersIndicator(whites).getValue(2), true);

  const blacks = ohlc([
    [12, 12, 11, 11],
    [11.5, 11.5, 10, 10],
    [10.5, 10.5, 9, 9],
  ]);
  assert.equal(new ThreeBlackCrowsIndicator(blacks).getValue(2), true);
});
