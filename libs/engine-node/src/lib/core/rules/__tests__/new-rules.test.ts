import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { ClosePriceIndicator } from '../../indicators/price-indicators';
import { TradingRecord, PositionType } from '../../trading/trading-record';
import { BooleanRule, FixedRule } from '../boolean-rules';
import { IsRisingRule, IsFallingRule } from '../slope-rules';
import { IsHighestRule, IsLowestRule, InPipeRule } from '../extremum-rules';
import { ChainRule } from '../chain-rule';
import { OpenedPositionMinimumBarCountRule } from '../position-rules';
import { DayOfWeekRule, TimeRangeRule } from '../time-rules';

function makeSeries(prices: number[], baseDate = new Date(2024, 0, 1)): BarSeries {
  const bars = prices.map((p, i) => {
    const time = new Date(baseDate);
    time.setDate(time.getDate() + i);
    return new Bar({
      time,
      open: new Decimal(p.toString()),
      high: new Decimal(p.toString()),
      low: new Decimal(p.toString()),
      close: new Decimal(p.toString()),
      volume: new Decimal('1'),
    });
  });
  return new BarSeries({ name: 'T' }, bars);
}

test('BooleanRule TRUE/FALSE constants', () => {
  assert.equal(BooleanRule.TRUE.isSatisfied(0), true);
  assert.equal(BooleanRule.FALSE.isSatisfied(0), false);
});

test('FixedRule matches only listed indexes', () => {
  const r = new FixedRule(1, 3, 5);
  assert.equal(r.isSatisfied(0), false);
  assert.equal(r.isSatisfied(1), true);
  assert.equal(r.isSatisfied(2), false);
  assert.equal(r.isSatisfied(5), true);
});

test('IsRisingRule detects strict rise', () => {
  const series = makeSeries([1, 2, 3, 4]);
  const close = new ClosePriceIndicator(series);
  const rule = new IsRisingRule(close, 3);
  assert.equal(rule.isSatisfied(3), true);
});

test('IsFallingRule detects strict fall', () => {
  const series = makeSeries([4, 3, 2, 1]);
  const close = new ClosePriceIndicator(series);
  const rule = new IsFallingRule(close, 3);
  assert.equal(rule.isSatisfied(3), true);
});

test('IsHighestRule returns true at last bar with highest value', () => {
  const series = makeSeries([1, 5, 3, 7]);
  const close = new ClosePriceIndicator(series);
  assert.equal(new IsHighestRule(close, 4).isSatisfied(3), true);
  assert.equal(new IsHighestRule(close, 4).isSatisfied(2), false);
});

test('IsLowestRule symmetric', () => {
  const series = makeSeries([5, 2, 3, 1]);
  const close = new ClosePriceIndicator(series);
  assert.equal(new IsLowestRule(close, 4).isSatisfied(3), true);
});

test('InPipeRule with Decimal bounds', () => {
  const series = makeSeries([100, 105, 110, 95]);
  const close = new ClosePriceIndicator(series);
  const rule = new InPipeRule(close, new Decimal('108'), new Decimal('100'));
  assert.equal(rule.isSatisfied(0), true);
  assert.equal(rule.isSatisfied(1), true);
  assert.equal(rule.isSatisfied(2), false);
  assert.equal(rule.isSatisfied(3), false);
});

test('ChainRule fires when links pass within thresholds', () => {
  const initial = new FixedRule(5);
  const link1 = new FixedRule(3);
  const rule = new ChainRule(initial, { rule: link1, threshold: 3 });
  assert.equal(rule.isSatisfied(5), true);
  assert.equal(rule.isSatisfied(4), false);
});

test('OpenedPositionMinimumBarCountRule respects hold duration', () => {
  const record = new TradingRecord(PositionType.LONG);
  record.entry(10, new Decimal('100'), new Decimal('1'));
  const rule = new OpenedPositionMinimumBarCountRule(3);
  assert.equal(rule.isSatisfied(11, record), false);
  assert.equal(rule.isSatisfied(13, record), true);
});

test('DayOfWeekRule matches weekday', () => {
  const series = makeSeries([1, 2, 3], new Date(2024, 0, 1)); // Mon, Tue, Wed
  const rule = new DayOfWeekRule(series, 1, 3); // Mon, Wed
  assert.equal(rule.isSatisfied(0), true);
  assert.equal(rule.isSatisfied(1), false);
  assert.equal(rule.isSatisfied(2), true);
});

test('TimeRangeRule includes-from, excludes-to', () => {
  const t = new Date(2024, 0, 1, 10, 30);
  const bar = new Bar({
    time: t,
    open: new Decimal('1'),
    high: new Decimal('1'),
    low: new Decimal('1'),
    close: new Decimal('1'),
    volume: new Decimal('1'),
  });
  const series = new BarSeries({ name: 'T' }, [bar]);
  const inRange = new TimeRangeRule(series, [{ fromHour: 10, toHour: 11 }]);
  const outRange = new TimeRangeRule(series, [{ fromHour: 11, toHour: 12 }]);
  assert.equal(inRange.isSatisfied(0), true);
  assert.equal(outRange.isSatisfied(0), false);
});
