import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { ClosePriceIndicator, OpenPriceIndicator } from '../price-indicators';
import { MeanDeviationIndicator } from '../statistics/mean-deviation';
import { CovarianceIndicator } from '../statistics/covariance';
import { PearsonCorrelationIndicator } from '../statistics/pearson-correlation';
import { SimpleLinearRegressionIndicator } from '../statistics/simple-linear-regression';
import { isNaNValue } from '../nan';

function makeSeries(rows: Array<[number, number]>): BarSeries {
  // Каждая строка — [open, close]; high/low подставляем безопасно.
  const bars = rows.map(([o, c], i) => {
    const high = Math.max(o, c);
    const low = Math.min(o, c);
    return new Bar({
      time: new Date(2024, 0, 1 + i),
      open: new Decimal(o.toString()),
      high: new Decimal(high.toString()),
      low: new Decimal(low.toString()),
      close: new Decimal(c.toString()),
      volume: new Decimal('1'),
    });
  });
  return new BarSeries({ name: 'T' }, bars);
}

test('MeanDeviation = average |x - mean|', () => {
  // close = [1, 2, 3, 4, 5], window=5, mean=3, |x-3| = [2,1,0,1,2], avg = 6/5 = 1.2
  const series = makeSeries([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ]);
  const md = new MeanDeviationIndicator(new ClosePriceIndicator(series), 5);
  assert.equal(md.getValue(4).toString(), '1.2');
});

test('Covariance: identical streams equal variance', () => {
  // close = [1,2,3,4,5], population var = 2
  const series = makeSeries([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ]);
  const close = new ClosePriceIndicator(series);
  const cov = new CovarianceIndicator(close, close, 5);
  assert.equal(cov.getValue(4).toString(), '2');
});

test('PearsonCorrelation: perfectly correlated streams → 1', () => {
  // close = open + 1 (для всех баров — open и close оба линейны)
  const series = makeSeries([
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
  ]);
  const r = new PearsonCorrelationIndicator(
    new OpenPriceIndicator(series),
    new ClosePriceIndicator(series),
    5
  );
  const v = r.getValue(4);
  // Допускаем погрешность sqrt-аппроксимации
  assert.equal(v.subtract(new Decimal('1')).abs().isLessThan(new Decimal('0.0001')), true);
});

test('SimpleLinearRegression: linear series → exact slope', () => {
  // close = [10, 12, 14, 16, 18] — slope = 2, intercept = 10
  const series = makeSeries([
    [0, 10],
    [0, 12],
    [0, 14],
    [0, 16],
    [0, 18],
  ]);
  const slr = new SimpleLinearRegressionIndicator(new ClosePriceIndicator(series), 5);
  assert.equal(slr.isReady(4), true);
  assert.equal(slr.getSlope(4).toString(), '2');
  assert.equal(slr.getIntercept(4).toString(), '10');
  // На последнем баре регрессия совпадает с фактической ценой.
  const v = slr.getValue(4);
  assert.equal(v.toString(), '18');
  assert.equal(isNaNValue(slr.getValue(3)), true);
});

test('SimpleLinearRegression clears slope and intercept state after setBars', () => {
  const series = makeSeries([
    [1, 10],
    [1, 12],
    [1, 14],
    [1, 16],
    [1, 18],
  ]);
  const slr = new SimpleLinearRegressionIndicator(new ClosePriceIndicator(series), 5);
  assert.equal(slr.getSlope(4).toString(), '2');
  assert.equal(slr.getIntercept(4).toString(), '10');

  const replacement = makeSeries([
    [1, 10],
    [1, 9],
    [1, 8],
    [1, 7],
    [1, 6],
  ]);
  series.setBars(replacement.getAllBars());

  assert.equal(slr.getSlope(4).toString(), '-1');
  assert.equal(slr.getIntercept(4).toString(), '10');
});
