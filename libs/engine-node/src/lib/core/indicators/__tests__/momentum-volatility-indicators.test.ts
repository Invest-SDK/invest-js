import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { ClosePriceIndicator } from '../price-indicators';
import { isNaNValue } from '../nan';
import { RSIIndicator } from '../momentum/rsi-indicator';
import { TrueRangeIndicator } from '../volatility/true-range-indicator';
import { ATRIndicator } from '../volatility/atr-indicator';
import { VarianceIndicator } from '../volatility/variance-indicator';
import { StandardDeviationIndicator } from '../volatility/standard-deviation-indicator';
import { BollingerBandsMiddleIndicator } from '../volatility/bollinger-bands-middle-indicator';
import { BollingerBandsUpperIndicator } from '../volatility/bollinger-bands-upper-indicator';
import { BollingerBandsLowerIndicator } from '../volatility/bollinger-bands-lower-indicator';

// Fixture helpers
function makeBar(close: number, high?: number, low?: number, open?: number): Bar {
  const c = close;
  const h = high ?? c;
  const l = low ?? c;
  const o = open ?? c;
  return new Bar({
    time: new Date(),
    open: new Decimal(o.toString()),
    high: new Decimal(h.toString()),
    low: new Decimal(l.toString()),
    close: new Decimal(c.toString()),
    volume: new Decimal('1000'),
  });
}

function makeSeries(closes: number[], highs?: number[], lows?: number[]): BarSeries {
  const bars = closes.map((c, i) => makeBar(c, highs?.[i], lows?.[i]));
  return new BarSeries({ name: 'Test' }, bars);
}

function withinTolerance(actual: Decimal, expected: Decimal, tol = '0.0001'): boolean {
  return actual.subtract(expected).abs().isLessThan(new Decimal(tol));
}

// ─── RSIIndicator ────────────────────────────────────────────────────────────

test('RSIIndicator - constructor name', () => {
  const series = makeSeries([1, 2, 3]);
  const rsi = new RSIIndicator(series, 14);
  assert.strictEqual(rsi.getName(), 'RSI(14)');
  assert.strictEqual(rsi.getSeries(), series);
});

test('RSIIndicator - warm-up: indices 0..barCount-1 are not ready', () => {
  // RSI(3) warm-up guard: index < beginIndex + barCount = 3
  const closes = [10, 12, 11, 13, 14, 15, 14];
  const series = makeSeries(closes);
  const rsi = new RSIIndicator(series, 3);

  assert.ok(isNaNValue(rsi.getValue(0)));
  assert.strictEqual(rsi.isReady(0), false);
  assert.ok(isNaNValue(rsi.getValue(1)));
  assert.strictEqual(rsi.isReady(1), false);
  assert.ok(isNaNValue(rsi.getValue(2)));
  assert.strictEqual(rsi.isReady(2), false);
  // Index 3 is the first potentially valid index
  assert.strictEqual(rsi.isReady(3), true);
});

test('RSIIndicator - RSI(3) seeds from three real price changes', () => {
  const rsi = new RSIIndicator(makeSeries([10, 11, 10, 11]), 3);

  for (let index = 0; index < 3; index++) {
    assert.strictEqual(rsi.isReady(index), false);
  }
  assert.strictEqual(rsi.isReady(3), true);
  assert.ok(
    withinTolerance(rsi.getValue(3), new Decimal('66.666666666666666667'), '0.000000000000000001'),
    rsi.getValue(3).toString()
  );
});

test('RSIIndicator - monotone up → RSI approaches 100', () => {
  // All gains, no losses → avgLoss → 0 → RSI = 100
  const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const series = makeSeries(closes);
  const rsi = new RSIIndicator(series, 3);

  const lastIndex = series.endIndex;
  assert.ok(rsi.isReady(lastIndex));
  // With all gains, avgLoss converges to 0 → RSI = 100
  const val = rsi.getValue(lastIndex);
  assert.ok(
    val.isGreaterThan(new Decimal('99')),
    `Expected RSI > 99 for monotone up, got ${val.toString()}`
  );
});

test('RSIIndicator - monotone down → RSI approaches 0', () => {
  // All losses, no gains → avgGain → 0 → RSI approaches 0
  const closes = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const series = makeSeries(closes);
  const rsi = new RSIIndicator(series, 3);

  const lastIndex = series.endIndex;
  assert.ok(rsi.isReady(lastIndex));
  const val = rsi.getValue(lastIndex);
  assert.ok(
    val.isLessThan(new Decimal('1')),
    `Expected RSI < 1 for monotone down, got ${val.toString()}`
  );
});

test('RSIIndicator - avgLoss=0 and avgGain=0 returns 100 (flat sequence)', () => {
  // Flat prices → all gains=0, all losses=0 → avgLoss=0 → RSI = 100 (ta4j convention).
  // ZeroOnNaNIndicator coerces gain[0]/loss[0] to 0, so MMA seed is clean.
  // RSI warm-up guard: index < beginIndex + barCount = 3.
  const closes = [5, 5, 5, 5, 5, 5];
  const series = makeSeries(closes);
  const rsi = new RSIIndicator(series, 3);

  assert.strictEqual(rsi.isReady(0), false);
  assert.strictEqual(rsi.isReady(1), false);
  assert.strictEqual(rsi.isReady(2), false);
  assert.strictEqual(rsi.isReady(3), true);
  // At index 3: avgGain=0, avgLoss=0 → RSI = 100
  assert.strictEqual(rsi.getValue(3).toString(), '100');
});

test('RSIIndicator - calculate with known sequence (RSI(3))', () => {
  // Mixed sequence: verify RSI is in [0,100] for all ready indices.
  const closes = [10, 12, 11, 13, 12, 14, 13];
  const series = makeSeries(closes);
  const rsi = new RSIIndicator(series, 3);

  for (let i = 0; i <= series.endIndex; i++) {
    if (rsi.isReady(i)) {
      const val = rsi.getValue(i);
      assert.ok(
        !val.isLessThan(new Decimal('0')) && !val.isGreaterThan(new Decimal('100')),
        `RSI at index ${i} out of [0,100]: ${val.toString()}`
      );
    } else {
      assert.ok(isNaNValue(rsi.getValue(i)), `Expected NaN at index ${i}`);
    }
  }
});

// ─── TrueRangeIndicator ──────────────────────────────────────────────────────

test('TrueRangeIndicator - constructor', () => {
  const series = makeSeries([10]);
  const tr = new TrueRangeIndicator(series);
  assert.strictEqual(tr.getName(), 'TR');
  assert.strictEqual(tr.getSeries(), series);
});

test('TrueRangeIndicator - beginIndex: TR = high - low', () => {
  // bar0: H=10, L=8, C=9 → TR = 2
  const series = new BarSeries({ name: 'T' }, [makeBar(9, 10, 8)]);
  const tr = new TrueRangeIndicator(series);
  assert.ok(tr.isReady(0));
  assert.strictEqual(tr.getValue(0).toString(), '2');
});

test('TrueRangeIndicator - with gap: max(HL, |H-prevC|, |L-prevC|)', () => {
  // bar0: H=10, L=8, C=8.5
  // bar1: H=12, L=9, C=11
  //   HL = 3, |12-8.5| = 3.5, |9-8.5| = 0.5 → TR = 3.5
  const bars = [makeBar(8.5, 10, 8), makeBar(11, 12, 9)];
  const series = new BarSeries({ name: 'T' }, bars);
  const tr = new TrueRangeIndicator(series);

  assert.strictEqual(tr.getValue(0).toString(), '2');
  assert.ok(tr.isReady(1));
  assert.ok(
    withinTolerance(tr.getValue(1), new Decimal('3.5')),
    `TR at 1: ${tr.getValue(1).toString()}`
  );
});

test('TrueRangeIndicator - always ready for valid indices', () => {
  const series = makeSeries([10, 12, 11]);
  const tr = new TrueRangeIndicator(series);
  assert.strictEqual(tr.isReady(0), true);
  assert.strictEqual(tr.isReady(1), true);
  assert.strictEqual(tr.isReady(2), true);
  assert.strictEqual(tr.isReady(-1), false);
});

// ─── ATRIndicator ────────────────────────────────────────────────────────────

test('ATRIndicator - constructor', () => {
  const series = makeSeries([1, 2, 3]);
  const atr = new ATRIndicator(series, 3);
  assert.strictEqual(atr.getName(), 'ATR(3)');
  assert.strictEqual(atr.getSeries(), series);
});

test('ATRIndicator - warm-up', () => {
  const closes = [10, 11, 12, 13, 14];
  const series = makeSeries(closes);
  const atr = new ATRIndicator(series, 3);

  // MMA(3) seeds at index 2; before that: NaN
  assert.ok(isNaNValue(atr.getValue(0)));
  assert.strictEqual(atr.isReady(0), false);
  assert.ok(isNaNValue(atr.getValue(1)));
  assert.strictEqual(atr.isReady(1), false);
  assert.strictEqual(atr.isReady(2), true);
});

test('ATRIndicator - seed equals SMA of first 3 TrueRanges', () => {
  // All bars same close, varying H/L for predictable TR
  // bar0: H=12, L=8, C=10 → TR=4
  // bar1: H=13, L=9, C=11 → TR=max(4, |13-10|, |9-10|) = max(4,3,1) = 4
  // bar2: H=14, L=10, C=12 → TR=max(4, |14-11|, |10-11|) = max(4,3,1) = 4
  // ATR seed = (4+4+4)/3 = 4
  const bars = [makeBar(10, 12, 8), makeBar(11, 13, 9), makeBar(12, 14, 10)];
  const series = new BarSeries({ name: 'T' }, bars);
  const atr = new ATRIndicator(series, 3);

  assert.ok(atr.isReady(2));
  assert.ok(withinTolerance(atr.getValue(2), new Decimal('4')));
});

// ─── VarianceIndicator ───────────────────────────────────────────────────────

test('VarianceIndicator - constructor', () => {
  const series = makeSeries([1, 2, 3]);
  const vari = new VarianceIndicator(series, 3);
  assert.ok(vari.getName().includes('Var'));
  assert.strictEqual(vari.getSeries(), series);
});

test('VarianceIndicator - warm-up', () => {
  const series = makeSeries([1, 2, 3, 4, 5]);
  const vari = new VarianceIndicator(series, 3);

  assert.ok(isNaNValue(vari.getValue(0)));
  assert.strictEqual(vari.isReady(0), false);
  assert.ok(isNaNValue(vari.getValue(1)));
  assert.strictEqual(vari.isReady(1), false);
  assert.strictEqual(vari.isReady(2), true);
});

test('VarianceIndicator - population variance [2,4,4,4,5,5,7,9] n=8 = 4', () => {
  // mean=5, sum of sq deviations = 9+1+1+1+0+0+4+16 = 32, var = 32/8 = 4
  const closes = [2, 4, 4, 4, 5, 5, 7, 9];
  const series = makeSeries(closes);
  const vari = new VarianceIndicator(series, 8);

  assert.ok(vari.isReady(7));
  assert.ok(
    withinTolerance(vari.getValue(7), new Decimal('4')),
    `Variance: ${vari.getValue(7).toString()}`
  );
});

test('VarianceIndicator - rolling window', () => {
  // [1,2,3]: mean=2, var=(1+0+1)/3=2/3
  const series = makeSeries([1, 2, 3, 4, 5]);
  const vari = new VarianceIndicator(series, 3);

  const expected23 = new Decimal('2').divide(new Decimal('3'));
  assert.ok(
    withinTolerance(vari.getValue(2), expected23, '0.0001'),
    `Var at idx2: ${vari.getValue(2).toString()}`
  );

  // [2,3,4]: mean=3, var=(1+0+1)/3=2/3
  assert.ok(
    withinTolerance(vari.getValue(3), expected23, '0.0001'),
    `Var at idx3: ${vari.getValue(3).toString()}`
  );
});

// ─── StandardDeviationIndicator ──────────────────────────────────────────────

test('StandardDeviationIndicator - constructor', () => {
  const series = makeSeries([1, 2, 3]);
  const std = new StandardDeviationIndicator(series, 3);
  assert.ok(std.getName().includes('StdDev'));
  assert.strictEqual(std.getSeries(), series);
});

test('StandardDeviationIndicator - warm-up mirrors variance warm-up', () => {
  const series = makeSeries([1, 2, 3, 4, 5]);
  const std = new StandardDeviationIndicator(series, 3);

  assert.ok(isNaNValue(std.getValue(0)));
  assert.strictEqual(std.isReady(0), false);
  assert.ok(isNaNValue(std.getValue(1)));
  assert.strictEqual(std.isReady(1), false);
  assert.strictEqual(std.isReady(2), true);
});

test('StandardDeviationIndicator - [2,4,4,4,5,5,7,9] n=8 = 2', () => {
  const closes = [2, 4, 4, 4, 5, 5, 7, 9];
  const series = makeSeries(closes);
  const std = new StandardDeviationIndicator(series, 8);

  assert.ok(std.isReady(7));
  assert.ok(
    withinTolerance(std.getValue(7), new Decimal('2'), '0.0001'),
    `StdDev: ${std.getValue(7).toString()}`
  );
});

test('StandardDeviationIndicator - zero variance → stdDev = 0', () => {
  const closes = [5, 5, 5, 5];
  const series = makeSeries(closes);
  const std = new StandardDeviationIndicator(series, 4);

  assert.ok(std.isReady(3));
  assert.strictEqual(std.getValue(3).toString(), '0');
});

// ─── Bollinger Bands ─────────────────────────────────────────────────────────

test('BollingerBandsMiddleIndicator - constructor and name', () => {
  const series = makeSeries([1, 2, 3]);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);
  assert.ok(bbm.getName().includes('BBM'));
  assert.strictEqual(bbm.getSeries(), series);
});

test('BollingerBandsMiddleIndicator - warm-up', () => {
  const series = makeSeries([1, 2, 3, 4, 5]);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);

  assert.ok(isNaNValue(bbm.getValue(0)));
  assert.strictEqual(bbm.isReady(0), false);
  assert.ok(isNaNValue(bbm.getValue(1)));
  assert.strictEqual(bbm.isReady(1), false);
  assert.strictEqual(bbm.isReady(2), true);
});

test('BollingerBandsMiddleIndicator - value equals SMA', () => {
  const closes = [1, 2, 3, 4, 5];
  const series = makeSeries(closes);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);

  // SMA([1,2,3]) = 2
  assert.ok(withinTolerance(bbm.getValue(2), new Decimal('2')));
  // SMA([2,3,4]) = 3
  assert.ok(withinTolerance(bbm.getValue(3), new Decimal('3')));
  // SMA([3,4,5]) = 4
  assert.ok(withinTolerance(bbm.getValue(4), new Decimal('4')));
});

test('BollingerBandsUpperIndicator - constructor and name', () => {
  const series = makeSeries([1, 2, 3]);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);
  const std = new StandardDeviationIndicator(series, 3);
  const bbu = new BollingerBandsUpperIndicator(bbm, std);
  assert.strictEqual(bbu.getName(), 'BBU(k=2)');
});

test('BollingerBandsLowerIndicator - constructor and name', () => {
  const series = makeSeries([1, 2, 3]);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);
  const std = new StandardDeviationIndicator(series, 3);
  const bbl = new BollingerBandsLowerIndicator(bbm, std);
  assert.strictEqual(bbl.getName(), 'BBL(k=2)');
});

test('BollingerBands - warm-up: upper/lower not ready during warm-up', () => {
  const closes = [1, 2, 3, 4, 5];
  const series = makeSeries(closes);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 3);
  const std = new StandardDeviationIndicator(series, 3);
  const bbu = new BollingerBandsUpperIndicator(bbm, std);
  const bbl = new BollingerBandsLowerIndicator(bbm, std);

  assert.ok(isNaNValue(bbu.getValue(0)));
  assert.strictEqual(bbu.isReady(0), false);
  assert.ok(isNaNValue(bbl.getValue(0)));
  assert.strictEqual(bbl.isReady(0), false);
  assert.ok(isNaNValue(bbu.getValue(1)));
  assert.strictEqual(bbu.isReady(1), false);
  assert.ok(isNaNValue(bbl.getValue(1)));
  assert.strictEqual(bbl.isReady(1), false);
});

test('BollingerBands - at index 4 with closes [1..15] n=5 k=2', () => {
  // closes[0..4] = [1,2,3,4,5], mean=3
  // population var = ((1-3)^2+(2-3)^2+0+(4-3)^2+(5-3)^2)/5 = (4+1+0+1+4)/5 = 2
  // stddev = sqrt(2) ≈ 1.41421
  // upper = 3 + 2*sqrt(2) ≈ 5.82842
  // lower = 3 - 2*sqrt(2) ≈ 0.17157
  const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const series = makeSeries(closes);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 5);
  const std = new StandardDeviationIndicator(close, 5);
  const bbu = new BollingerBandsUpperIndicator(bbm, std);
  const bbl = new BollingerBandsLowerIndicator(bbm, std);

  assert.ok(bbu.isReady(4));
  assert.ok(bbl.isReady(4));

  const expectedUpper = new Decimal('5.82842712');
  const expectedLower = new Decimal('0.17157287');

  assert.ok(
    withinTolerance(bbu.getValue(4), expectedUpper, '0.0001'),
    `Upper at 4: ${bbu.getValue(4).toString()}, expected ~${expectedUpper.toString()}`
  );
  assert.ok(
    withinTolerance(bbl.getValue(4), expectedLower, '0.0001'),
    `Lower at 4: ${bbl.getValue(4).toString()}, expected ~${expectedLower.toString()}`
  );
});

test('BollingerBands - upper > middle > lower', () => {
  const closes = [10, 12, 11, 13, 14, 12, 10, 15, 14, 13];
  const series = makeSeries(closes);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 5);
  const std = new StandardDeviationIndicator(close, 5);
  const bbu = new BollingerBandsUpperIndicator(bbm, std);
  const bbl = new BollingerBandsLowerIndicator(bbm, std);

  for (let i = 4; i <= series.endIndex; i++) {
    assert.ok(bbu.isReady(i), `BBU not ready at ${i}`);
    assert.ok(bbl.isReady(i), `BBL not ready at ${i}`);
    assert.ok(
      bbu.getValue(i).isGreaterThan(bbm.getValue(i)) || bbu.getValue(i).isEqualTo(bbm.getValue(i)),
      `BBU < BBM at index ${i}`
    );
    assert.ok(
      bbm.getValue(i).isGreaterThan(bbl.getValue(i)) || bbm.getValue(i).isEqualTo(bbl.getValue(i)),
      `BBM < BBL at index ${i}`
    );
  }
});

test('BollingerBands - custom k=1', () => {
  const closes = [1, 2, 3, 4, 5];
  const series = makeSeries(closes);
  const close = new ClosePriceIndicator(series);
  const bbm = new BollingerBandsMiddleIndicator(close, 5);
  const std = new StandardDeviationIndicator(close, 5);
  const k = new Decimal('1');
  const bbu = new BollingerBandsUpperIndicator(bbm, std, k);
  const bbl = new BollingerBandsLowerIndicator(bbm, std, k);

  assert.strictEqual(bbu.getName(), 'BBU(k=1)');
  assert.strictEqual(bbl.getName(), 'BBL(k=1)');

  assert.ok(bbu.isReady(4));
  // upper(k=1) = 3 + sqrt(2) ≈ 4.41421
  const expectedUpper1 = new Decimal('4.41421356');
  assert.ok(
    withinTolerance(bbu.getValue(4), expectedUpper1, '0.0001'),
    `Upper k=1: ${bbu.getValue(4).toString()}`
  );
});
