import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../../bar/bar';
import { BarSeries } from '../../../bar/bar-series';
import { ClosePriceIndicator } from '../../price-indicators';
import { isNaNValue } from '../../nan';
import { ConstantIndicator } from '../constant-indicator';
import { PreviousValueIndicator } from '../previous-value-indicator';
import { HighestValueIndicator } from '../highest-value-indicator';
import { LowestValueIndicator } from '../lowest-value-indicator';
import { SumIndicator } from '../sum-indicator';
import { DifferenceIndicator } from '../difference-indicator';
import { CombineIndicator } from '../combine-indicator';
import { GainIndicator } from '../gain-indicator';
import { LossIndicator } from '../loss-indicator';
import { MMAIndicator } from '../mma-indicator';

function createTestBar(close: number, index: number): Bar {
  const time = new Date(2024, 0, index + 1);
  const c = new Decimal(close.toString());
  return new Bar({ time, open: c, high: c, low: c, close: c, volume: new Decimal('0') });
}

function makeSeries(closes: number[]): { series: BarSeries; close: ClosePriceIndicator } {
  const bars = closes.map((c, i) => createTestBar(c, i));
  const series = new BarSeries({ name: 'Test' }, bars);
  return { series, close: new ClosePriceIndicator(series) };
}

// ---------------------------------------------------------------------------
// ConstantIndicator
// ---------------------------------------------------------------------------

test('ConstantIndicator - always returns fixed value', () => {
  const { series } = makeSeries([1, 2, 3]);
  const c = new ConstantIndicator(series, new Decimal('42'));
  assert.strictEqual(c.getName(), 'Constant(42)');
  assert.strictEqual(c.getValue(0).toString(), '42');
  assert.strictEqual(c.getValue(2).toString(), '42');
  assert.strictEqual(c.isReady(0), true);
  assert.strictEqual(c.isReady(2), true);
});

test('ConstantIndicator - not ready for invalid index', () => {
  const { series } = makeSeries([1]);
  const c = new ConstantIndicator(series, new Decimal('5'));
  assert.strictEqual(c.isReady(99), false);
});

// ---------------------------------------------------------------------------
// PreviousValueIndicator
// ---------------------------------------------------------------------------

test('PreviousValueIndicator - returns value at index - n', () => {
  const { close } = makeSeries([10, 20, 30, 40]);
  const prev = new PreviousValueIndicator(close, 1);
  assert.ok(isNaNValue(prev.getValue(0)));
  assert.strictEqual(prev.getValue(1).toString(), '10');
  assert.strictEqual(prev.getValue(2).toString(), '20');
  assert.strictEqual(prev.getValue(3).toString(), '30');
});

test('PreviousValueIndicator - n=2 skips two bars', () => {
  const { close } = makeSeries([5, 10, 15, 20]);
  const prev = new PreviousValueIndicator(close, 2);
  assert.ok(isNaNValue(prev.getValue(0)));
  assert.ok(isNaNValue(prev.getValue(1)));
  assert.strictEqual(prev.getValue(2).toString(), '5');
  assert.strictEqual(prev.getValue(3).toString(), '10');
});

// ---------------------------------------------------------------------------
// HighestValueIndicator
// ---------------------------------------------------------------------------

test('HighestValueIndicator - warm-up returns NaN', () => {
  // closes: [3, 1, 4, 1, 5, 9, 2, 6], barCount=3
  const { close } = makeSeries([3, 1, 4, 1, 5, 9, 2, 6]);
  const highest = new HighestValueIndicator(close, 3);
  assert.ok(isNaNValue(highest.getValue(0)));
  assert.ok(isNaNValue(highest.getValue(1)));
  assert.strictEqual(highest.isReady(1), false);
});

test('HighestValueIndicator - correct values with barCount=3', () => {
  const { close } = makeSeries([3, 1, 4, 1, 5, 9, 2, 6]);
  const highest = new HighestValueIndicator(close, 3);
  // index 2: max(3,1,4)=4
  assert.strictEqual(highest.getValue(2).toString(), '4');
  // index 3: max(1,4,1)=4
  assert.strictEqual(highest.getValue(3).toString(), '4');
  // index 4: max(4,1,5)=5
  assert.strictEqual(highest.getValue(4).toString(), '5');
  // index 5: max(1,5,9)=9
  assert.strictEqual(highest.getValue(5).toString(), '9');
  // index 6: max(5,9,2)=9
  assert.strictEqual(highest.getValue(6).toString(), '9');
  // index 7: max(9,2,6)=9
  assert.strictEqual(highest.getValue(7).toString(), '9');
});

// ---------------------------------------------------------------------------
// LowestValueIndicator
// ---------------------------------------------------------------------------

test('LowestValueIndicator - warm-up returns NaN', () => {
  const { close } = makeSeries([3, 1, 4, 1, 5, 9, 2, 6]);
  const lowest = new LowestValueIndicator(close, 3);
  assert.ok(isNaNValue(lowest.getValue(0)));
  assert.ok(isNaNValue(lowest.getValue(1)));
});

test('LowestValueIndicator - correct values with barCount=3', () => {
  const { close } = makeSeries([3, 1, 4, 1, 5, 9, 2, 6]);
  const lowest = new LowestValueIndicator(close, 3);
  // index 2: min(3,1,4)=1
  assert.strictEqual(lowest.getValue(2).toString(), '1');
  // index 3: min(1,4,1)=1
  assert.strictEqual(lowest.getValue(3).toString(), '1');
  // index 4: min(4,1,5)=1
  assert.strictEqual(lowest.getValue(4).toString(), '1');
  // index 5: min(1,5,9)=1
  assert.strictEqual(lowest.getValue(5).toString(), '1');
  // index 6: min(5,9,2)=2
  assert.strictEqual(lowest.getValue(6).toString(), '2');
  // index 7: min(9,2,6)=2
  assert.strictEqual(lowest.getValue(7).toString(), '2');
});

// ---------------------------------------------------------------------------
// SumIndicator
// ---------------------------------------------------------------------------

test('SumIndicator - warm-up returns NaN', () => {
  const { close } = makeSeries([1, 2, 3, 4]);
  const sum = new SumIndicator(close, 3);
  assert.ok(isNaNValue(sum.getValue(0)));
  assert.ok(isNaNValue(sum.getValue(1)));
});

test('SumIndicator - correct sum over window', () => {
  const { close } = makeSeries([1, 2, 3, 4, 5]);
  const sum = new SumIndicator(close, 3);
  // index 2: 1+2+3=6
  assert.strictEqual(sum.getValue(2).toString(), '6');
  // index 3: 2+3+4=9
  assert.strictEqual(sum.getValue(3).toString(), '9');
  // index 4: 3+4+5=12
  assert.strictEqual(sum.getValue(4).toString(), '12');
});

// ---------------------------------------------------------------------------
// DifferenceIndicator
// ---------------------------------------------------------------------------

test('DifferenceIndicator - left minus right', () => {
  const { series } = makeSeries([10, 20, 30]);
  const ca = new ConstantIndicator(series, new Decimal('10'));
  const cb = new ConstantIndicator(series, new Decimal('3'));
  const diff = new DifferenceIndicator(ca, cb);
  assert.strictEqual(diff.getValue(0).toString(), '7');
  assert.strictEqual(diff.getValue(2).toString(), '7');
});

test('DifferenceIndicator - NaN when source not ready', () => {
  const { close } = makeSeries([1, 2, 3]);
  // SumIndicator with barCount=2 is not ready at index 0
  const sum = new SumIndicator(close, 2);
  // Use the same series as close to satisfy DifferenceIndicator
  const cst = new ConstantIndicator(close.getSeries(), new Decimal('1'));
  const diff = new DifferenceIndicator(sum, cst);
  assert.ok(isNaNValue(diff.getValue(0)));
});

// ---------------------------------------------------------------------------
// CombineIndicator
// ---------------------------------------------------------------------------

test('CombineIndicator - multiply op', () => {
  const { series } = makeSeries([1, 2, 3]);
  const c2 = new ConstantIndicator(series, new Decimal('2'));
  const c3 = new ConstantIndicator(series, new Decimal('3'));
  const combined = new CombineIndicator(c2, c3, (a, b) => a.multiply(b), 'Mul(2,3)');
  assert.strictEqual(combined.getName(), 'Mul(2,3)');
  assert.strictEqual(combined.getValue(0).toString(), '6');
});

test('CombineIndicator - default name', () => {
  const { series } = makeSeries([1]);
  const a = new ConstantIndicator(series, new Decimal('5'));
  const b = new ConstantIndicator(series, new Decimal('2'));
  const combined = new CombineIndicator(a, b, (x, y) => x.add(y));
  assert.ok(combined.getName().startsWith('Combine('));
});

// ---------------------------------------------------------------------------
// GainIndicator
// ---------------------------------------------------------------------------

test('GainIndicator - NaN at beginIndex', () => {
  const { close } = makeSeries([10, 12, 11, 14]);
  const gain = new GainIndicator(close);
  assert.ok(isNaNValue(gain.getValue(0)));
});

test('GainIndicator - correct gains [10,12,11,14]', () => {
  const { close } = makeSeries([10, 12, 11, 14]);
  const gain = new GainIndicator(close);
  // index 1: 12-10=2
  assert.strictEqual(gain.getValue(1).toString(), '2');
  // index 2: 11-12=-1 => 0
  assert.strictEqual(gain.getValue(2).toString(), '0');
  // index 3: 14-11=3
  assert.strictEqual(gain.getValue(3).toString(), '3');
});

// ---------------------------------------------------------------------------
// LossIndicator
// ---------------------------------------------------------------------------

test('LossIndicator - NaN at beginIndex', () => {
  const { close } = makeSeries([10, 12, 11, 14]);
  const loss = new LossIndicator(close);
  assert.ok(isNaNValue(loss.getValue(0)));
});

test('LossIndicator - correct losses [10,12,11,14]', () => {
  const { close } = makeSeries([10, 12, 11, 14]);
  const loss = new LossIndicator(close);
  // index 1: 10-12=-2 => 0
  assert.strictEqual(loss.getValue(1).toString(), '0');
  // index 2: 12-11=1
  assert.strictEqual(loss.getValue(2).toString(), '1');
  // index 3: 11-14=-3 => 0
  assert.strictEqual(loss.getValue(3).toString(), '0');
});

// ---------------------------------------------------------------------------
// MMAIndicator
// ---------------------------------------------------------------------------

test('MMAIndicator - NaN before seed', () => {
  // closes [1,2,3,4,5,6], n=3; seed at index 2
  const { close } = makeSeries([1, 2, 3, 4, 5, 6]);
  const mma = new MMAIndicator(close, 3);
  assert.ok(isNaNValue(mma.getValue(0)));
  assert.ok(isNaNValue(mma.getValue(1)));
  assert.strictEqual(mma.isReady(1), false);
  assert.strictEqual(mma.isReady(2), true);
});

test('MMAIndicator - seed equals SMA of first n bars', () => {
  // closes [1,2,3,4,5,6], n=3
  // seed = SMA(1,2,3) = 2
  const { close } = makeSeries([1, 2, 3, 4, 5, 6]);
  const mma = new MMAIndicator(close, 3);
  assert.strictEqual(mma.getValue(2).toString(), '2');
});

test('MMAIndicator - recursive formula after seed', () => {
  // closes [1,2,3,4,5,6], n=3
  // index 2: seed = 2
  // index 3: 2 * 2/3 + 4/3 = 4/3 + 4/3 = 8/3
  // index 4: (8/3) * 2/3 + 5/3 = 16/9 + 15/9 = 31/9
  // index 5: (31/9) * 2/3 + 6/3 = 62/27 + 54/27 = 116/27
  const { close } = makeSeries([1, 2, 3, 4, 5, 6]);
  const mma = new MMAIndicator(close, 3);

  const v3 = mma.getValue(3);
  // 8/3 ≈ 2.6666...
  const expected3 = new Decimal('8').divide(new Decimal('3'));
  assert.ok(
    v3.subtract(expected3).abs().isLessThan(new Decimal('0.0001')),
    `index 3: expected ~${expected3.toString()}, got ${v3.toString()}`
  );

  const v4 = mma.getValue(4);
  // 31/9 ≈ 3.4444...
  const expected4 = new Decimal('31').divide(new Decimal('9'));
  assert.ok(
    v4.subtract(expected4).abs().isLessThan(new Decimal('0.0001')),
    `index 4: expected ~${expected4.toString()}, got ${v4.toString()}`
  );
});

test('MMAIndicator - name', () => {
  const { close } = makeSeries([1, 2, 3]);
  const mma = new MMAIndicator(close, 14);
  assert.ok(mma.getName().startsWith('MMA('));
  assert.ok(mma.getName().includes('14'));
});
