import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { OhlcvBarAggregator, DurationBarAggregator, aggregateBarSeries } from '../bar-aggregator';
import { toHeikinAshiSeries } from '../heikin-ashi';

function bar(time: Date, o: number, h: number, l: number, c: number, v = 1): Bar {
  return new Bar({
    time,
    open: new Decimal(o.toString()),
    high: new Decimal(h.toString()),
    low: new Decimal(l.toString()),
    close: new Decimal(c.toString()),
    volume: new Decimal(v.toString()),
  });
}

test('OhlcvBarAggregator merges OHLC and sums volume', () => {
  const t = new Date(2024, 0, 1);
  const bars = [
    bar(t, 10, 12, 9, 11, 1),
    bar(new Date(t.getTime() + 60_000), 11, 13, 10, 12, 2),
    bar(new Date(t.getTime() + 120_000), 12, 15, 11, 14, 3),
  ];
  const agg = new OhlcvBarAggregator().aggregate(bars);
  assert.ok(agg);
  assert.equal(agg.open.toString(), '10');
  assert.equal(agg.close.toString(), '14');
  assert.equal(agg.high.toString(), '15');
  assert.equal(agg.low.toString(), '9');
  assert.equal(agg.volume.toString(), '6');
});

test('DurationBarAggregator groups by epoch slots', () => {
  // 5 одноминутных баров в первом 5m-слоте + 1 в следующем, чтобы первый слот
  // закрылся. aggregateSeries отдаёт только закрытые слоты — это и тестируем.
  const t0 = new Date(2024, 0, 1, 10, 0).getTime();
  const bars: Bar[] = [];
  for (let i = 0; i < 5; i++) {
    bars.push(bar(new Date(t0 + i * 60_000), 100 + i, 100 + i + 1, 100 + i - 1, 100 + i, 1));
  }
  bars.push(bar(new Date(t0 + 5 * 60_000), 110, 111, 109, 110, 1)); // открывает следующий слот
  const series = new BarSeries({ name: 'T' }, bars);
  const result = aggregateBarSeries(series, 5 * 60_000);
  assert.equal(result.barCount, 1);
  const onlyBar = result.getBar(result.beginIndex);
  assert.ok(onlyBar);
  assert.equal(onlyBar.open.toString(), '100');
  assert.equal(onlyBar.close.toString(), '104');
  assert.equal(onlyBar.volume.toString(), '5');
});

test('DurationBarAggregator.flushSeries includes partial last bucket', () => {
  const t0 = new Date(2024, 0, 1, 10, 0).getTime();
  const bars: Bar[] = [];
  for (let i = 0; i < 7; i++) {
    bars.push(bar(new Date(t0 + i * 60_000), 100, 101, 99, 100, 1));
  }
  const series = new BarSeries({ name: 'T' }, bars);
  const agg = new DurationBarAggregator(5 * 60_000);
  assert.equal(agg.flushSeries(series).length, 2);
  assert.equal(agg.aggregateSeries(series).length, 1);
});

test('Heikin-Ashi: first bar HA-Open = (O+C)/2', () => {
  const series = new BarSeries({ name: 'T' }, [
    bar(new Date(2024, 0, 1), 10, 12, 9, 11),
    bar(new Date(2024, 0, 2), 11, 13, 10, 12),
  ]);
  const ha = toHeikinAshiSeries(series);
  const first = ha.getBar(0);
  assert.ok(first);
  // (10 + 11) / 2 = 10.5
  assert.equal(first.open.toString(), '10.5');
  // (10 + 12 + 9 + 11) / 4 = 10.5
  assert.equal(first.close.toString(), '10.5');
});
