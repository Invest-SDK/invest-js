import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { TradingRecord, PositionType } from '../../trading/trading-record';
import { ReturnCriterion } from '../return-criterion';
import { BuyAndHoldReturnCriterion } from '../buy-and-hold-criterion';
import { MaximumDrawdownCriterion } from '../max-drawdown-criterion';
import { ProfitFactorCriterion } from '../profit-factor-criterion';
import { NumberOfBarsCriterion, NumberOfPositionsCriterion } from '../number-of-bars-criterion';

function makeSeries(prices: number[]): BarSeries {
  const bars = prices.map(
    (p, i) =>
      new Bar({
        time: new Date(2024, 0, 1 + i),
        open: new Decimal(p.toString()),
        high: new Decimal(p.toString()),
        low: new Decimal(p.toString()),
        close: new Decimal(p.toString()),
        volume: new Decimal('1'),
      })
  );
  return new BarSeries({ name: 'T' }, bars);
}

test('ReturnCriterion compounds per-position returns', () => {
  const series = makeSeries([100, 110, 120, 132]);
  const record = new TradingRecord(PositionType.LONG);
  record.entry(0, new Decimal('100'), new Decimal('1'));
  record.exit(1, new Decimal('110'), new Decimal('1'));
  record.entry(2, new Decimal('120'), new Decimal('1'));
  record.exit(3, new Decimal('132'), new Decimal('1'));

  const c = new ReturnCriterion();
  // 1.1 * 1.1 = 1.21
  assert.equal(c.calculate(series, record).toString(), '1.21');
});

test('BuyAndHoldReturnCriterion uses series endpoints', () => {
  const series = makeSeries([100, 150, 120, 200]);
  const record = new TradingRecord(PositionType.LONG);
  const c = new BuyAndHoldReturnCriterion();
  assert.equal(c.calculate(series, record).toString(), '2');
});

test('MaximumDrawdownCriterion finds peak-to-trough', () => {
  const series = makeSeries([100, 110, 105, 90]);
  const record = new TradingRecord(PositionType.LONG);
  // +10 then -10 then -10 -> equity: 10, 0, -10. peak=10, max DD = (10 - -10)/10 = 2
  record.entry(0, new Decimal('100'), new Decimal('1'));
  record.exit(1, new Decimal('110'), new Decimal('1'));
  record.entry(1, new Decimal('110'), new Decimal('1'));
  record.exit(2, new Decimal('100'), new Decimal('1'));
  record.entry(2, new Decimal('100'), new Decimal('1'));
  record.exit(3, new Decimal('90'), new Decimal('1'));

  const c = new MaximumDrawdownCriterion();
  const dd = c.calculate(series, record);
  assert.equal(dd.toString(), '2');
  assert.equal(c.betterThan(new Decimal('0.1'), new Decimal('0.5')), true);
});

test('ProfitFactorCriterion = grossProfit / grossLoss', () => {
  const series = makeSeries([100, 110, 105, 90]);
  const record = new TradingRecord(PositionType.LONG);
  record.entry(0, new Decimal('100'), new Decimal('1'));
  record.exit(1, new Decimal('120'), new Decimal('1')); // +20
  record.entry(2, new Decimal('120'), new Decimal('1'));
  record.exit(3, new Decimal('110'), new Decimal('1')); // -10

  const c = new ProfitFactorCriterion();
  assert.equal(c.calculate(series, record).toString(), '2');
});

test('NumberOfBars / NumberOfPositions criteria', () => {
  const series = makeSeries([100, 101, 102, 103]);
  const record = new TradingRecord(PositionType.LONG);
  record.entry(0, new Decimal('100'), new Decimal('1'));
  record.exit(2, new Decimal('102'), new Decimal('1'));

  assert.equal(new NumberOfBarsCriterion().calculate(series, record).toString(), '2');
  assert.equal(new NumberOfPositionsCriterion().calculate(series, record).toString(), '1');
});
