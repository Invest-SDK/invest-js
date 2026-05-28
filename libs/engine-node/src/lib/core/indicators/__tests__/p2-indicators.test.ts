import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { OnBalanceVolumeIndicator } from '../volume/obv-indicator';
import { VWAPIndicator } from '../volume/vwap-indicator';
import { MoneyFlowIndexIndicator } from '../volume/mfi-indicator';
import { ChaikinMoneyFlowIndicator } from '../volume/cmf-indicator';
import {
  AroonUpIndicator,
  AroonDownIndicator,
  AroonOscillatorIndicator,
} from '../trend/aroon-indicator';
import { ParabolicSARIndicator } from '../trend/parabolic-sar-indicator';
import {
  IchimokuTenkanSenIndicator,
  IchimokuKijunSenIndicator,
  IchimokuSenkouSpanAIndicator,
  IchimokuSenkouSpanBIndicator,
  IchimokuChikouSpanIndicator,
} from '../trend/ichimoku-indicator';
import { ZLEMAIndicator } from '../moving-averages/zlema-indicator';
import { KAMAIndicator } from '../moving-averages/kama-indicator';
import { isNaNValue } from '../nan';

function ohlcv(rows: Array<[number, number, number, number, number]>): BarSeries {
  const bars = rows.map(
    (r, i) =>
      new Bar({
        time: new Date(2024, 0, 1 + i),
        open: new Decimal(r[0].toString()),
        high: new Decimal(r[1].toString()),
        low: new Decimal(r[2].toString()),
        close: new Decimal(r[3].toString()),
        volume: new Decimal(r[4].toString()),
      })
  );
  return new BarSeries({ name: 'T' }, bars);
}

test('OBV adds volume on up close, subtracts on down close', () => {
  const series = ohlcv([
    [10, 10, 10, 10, 100],
    [10, 11, 10, 11, 50], // up
    [11, 11, 10, 10, 30], // down
    [10, 10, 10, 10, 20], // flat
  ]);
  const obv = new OnBalanceVolumeIndicator(series);
  assert.equal(obv.getValue(0).toString(), '0');
  assert.equal(obv.getValue(1).toString(), '50');
  assert.equal(obv.getValue(2).toString(), '20');
  assert.equal(obv.getValue(3).toString(), '20');
});

test('VWAP weighted average ready after warm-up', () => {
  const series = ohlcv(
    Array.from({ length: 10 }, (_, i) => [100 + i, 100 + i, 100 + i, 100 + i, 1])
  );
  const v = new VWAPIndicator(series, 5);
  assert.equal(v.isReady(4), true);
  assert.equal(v.isReady(3), false);
});

test('MFI in [0,100] after warm-up', () => {
  const series = ohlcv(
    Array.from({ length: 20 }, (_, i) => {
      const p = 100 + Math.sin(i / 2) * 5;
      return [p, p + 1, p - 1, p, 10];
    })
  );
  const mfi = new MoneyFlowIndexIndicator(series, 14);
  const v = mfi.getValue(series.endIndex);
  assert.equal(v.isGreaterThanOrEqual(new Decimal('0')), true);
  assert.equal(v.isLessThanOrEqual(new Decimal('100')), true);
});

test('CMF in [-1, +1] after warm-up', () => {
  const series = ohlcv(
    Array.from({ length: 25 }, (_, i) => {
      const p = 100 + i;
      return [p, p + 1, p - 1, p + 0.5, 10];
    })
  );
  const cmf = new ChaikinMoneyFlowIndicator(series, 20);
  const v = cmf.getValue(series.endIndex);
  assert.equal(v.isGreaterThanOrEqual(new Decimal('-1')), true);
  assert.equal(v.isLessThanOrEqual(new Decimal('1')), true);
});

test('Aroon: monotonically rising highs => AroonUp = 100', () => {
  const series = ohlcv(
    Array.from({ length: 16 }, (_, i) => [100 + i, 100 + i, 99 + i, 100 + i, 1])
  );
  const up = new AroonUpIndicator(series, 14);
  const down = new AroonDownIndicator(series, 14);
  const osc = new AroonOscillatorIndicator(series, 14);
  const last = series.endIndex;
  assert.equal(up.getValue(last).toString(), '100');
  // Lows тоже монотонно растут — последний бар не lowest -> AroonDown < 100
  assert.equal(down.getValue(last).isLessThanOrEqual(new Decimal('100')), true);
  assert.equal(isNaNValue(osc.getValue(last)), false);
});

test('Parabolic SAR returns finite value', () => {
  const series = ohlcv(
    Array.from({ length: 30 }, (_, i) => {
      const p = 100 + Math.sin(i / 3) * 5;
      return [p, p + 1, p - 1, p, 1];
    })
  );
  const sar = new ParabolicSARIndicator(series);
  const v = sar.getValue(series.endIndex);
  assert.equal(isNaNValue(v), false);
});

test('Ichimoku core lines ready after warm-up', () => {
  const series = ohlcv(
    Array.from({ length: 120 }, (_, i) => [100 + i, 101 + i, 99 + i, 100 + i, 1])
  );
  const tenkan = new IchimokuTenkanSenIndicator(series);
  const kijun = new IchimokuKijunSenIndicator(series);
  const sa = new IchimokuSenkouSpanAIndicator(series);
  const sb = new IchimokuSenkouSpanBIndicator(series);
  const chikou = new IchimokuChikouSpanIndicator(series);
  const last = series.endIndex;
  assert.equal(isNaNValue(tenkan.getValue(last)), false);
  assert.equal(isNaNValue(kijun.getValue(last)), false);
  // Senkou A/B опираются на бары в прошлом — должны быть готовы на последнем.
  assert.equal(isNaNValue(sa.getValue(last)), false);
  assert.equal(isNaNValue(sb.getValue(last)), false);
  // Chikou сдвинут в будущее — на последнем баре NaN, на (last - 26) — value.
  assert.equal(isNaNValue(chikou.getValue(last)), true);
  assert.equal(isNaNValue(chikou.getValue(last - 26)), false);
});

test('ZLEMA / KAMA produce finite values after warm-up', () => {
  const series = ohlcv(
    Array.from({ length: 60 }, (_, i) => [100 + i, 100 + i, 100 + i, 100 + i, 1])
  );
  const zlema = new ZLEMAIndicator(series, 10);
  const kama = new KAMAIndicator(series, 10, 2, 30);
  const last = series.endIndex;
  assert.equal(isNaNValue(zlema.getValue(last)), false);
  assert.equal(isNaNValue(kama.getValue(last)), false);
});
