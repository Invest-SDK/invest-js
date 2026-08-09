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

test('Parabolic SAR rebuilds recurrence state after setBars', () => {
  const initial = Array.from({ length: 8 }, (_, i) => {
    const p = 10 + i;
    return [p, p + 1, p - 1, p, 1] as [number, number, number, number, number];
  });
  const replacement = Array.from({ length: 8 }, (_, i) => {
    const p = 20 - i;
    return [p, p + 2, p - 2, p, 1] as [number, number, number, number, number];
  });
  const series = ohlcv(initial);
  const sar = new ParabolicSARIndicator(series);
  const oldValue = sar.getValue(series.endIndex);

  const replacementSeries = ohlcv(replacement);
  series.setBars(replacementSeries.getAllBars());
  const expected = new ParabolicSARIndicator(series).getValue(series.endIndex);

  assert.notEqual(oldValue.toString(), expected.toString());
  assert.equal(sar.getValue(series.endIndex).toString(), expected.toString());
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
  // Chikou возвращает исторический close и не готов до накопления offset баров.
  assert.equal(chikou.getValue(last).toString(), '193');
  assert.equal(isNaNValue(chikou.getValue(25)), true);
});

test('Ichimoku Chikou offset 2 returns lagged close after readiness boundary', () => {
  const series = ohlcv([
    [10, 10, 10, 10, 1],
    [11, 11, 11, 11, 1],
    [12, 12, 12, 12, 1],
  ]);
  const chikou = new IchimokuChikouSpanIndicator(series, 2);

  assert.equal(isNaNValue(chikou.getValue(0)), true);
  assert.equal(isNaNValue(chikou.getValue(1)), true);
  assert.equal(chikou.getValue(2).toString(), '10');
});

test('Ichimoku Chikou value cannot change when future closes are replaced', () => {
  const series = ohlcv([
    [10, 10, 10, 10, 1],
    [11, 11, 11, 11, 1],
    [12, 12, 12, 12, 1],
    [13, 13, 13, 13, 1],
    [14, 14, 14, 14, 1],
  ]);
  const chikou = new IchimokuChikouSpanIndicator(series, 2);
  const before = chikou.getValue(2).toString();

  const replacement = ohlcv([
    [10, 10, 10, 10, 1],
    [11, 11, 11, 11, 1],
    [12, 12, 12, 12, 1],
    [50, 50, 50, 50, 1],
    [99, 99, 99, 99, 1],
  ]);
  series.setBars(replacement.getAllBars());
  const after = chikou.getValue(2).toString();

  assert.deepEqual({ before, after }, { before: '10', after: '10' });
});

test('Ichimoku Chikou offset 0 returns current close', () => {
  const series = ohlcv([
    [10, 10, 10, 10, 1],
    [11, 11, 11, 11, 1],
  ]);
  const chikou = new IchimokuChikouSpanIndicator(series, 0);

  assert.equal(chikou.getValue(1).toString(), '11');
});

test('Ichimoku Chikou rejects negative and non-integer offsets', () => {
  const series = ohlcv([[10, 10, 10, 10, 1]]);

  assert.throws(
    () => new IchimokuChikouSpanIndicator(series, -1),
    /offset must be a non-negative integer/
  );
  assert.throws(
    () => new IchimokuChikouSpanIndicator(series, 1.5),
    /offset must be a non-negative integer/
  );
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
