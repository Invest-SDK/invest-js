import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { TradingRecord, PositionType } from '../../trading/trading-record';
import { equityCurve } from '../equity-curve';
import { MaximumDrawdownByBarCriterion } from '../max-drawdown-by-bar-criterion';

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

test('equityCurve marks open position to market', () => {
  // Entry @100, then prices 100->120->90 (open position never closed).
  const series = makeSeries([100, 120, 90]);
  const record = new TradingRecord(PositionType.LONG);
  record.entry(0, new Decimal('100'), new Decimal('1'));

  const curve = equityCurve(record, series);
  // bar 0: equity = mark-to-market 100-100 = 0
  // bar 1: 120-100 = +20
  // bar 2: 90-100 = -10
  assert.equal(curve[0].toString(), '0');
  assert.equal(curve[1].toString(), '20');
  assert.equal(curve[2].toString(), '-10');
});

test('MaximumDrawdownByBarCriterion captures intra-position drawdown', () => {
  // Entry @100, prices go 100->150->50->130 then exit. Closed P&L = +30,
  // но просадка от пика +50 до -50 ловится.
  const series = makeSeries([100, 150, 50, 130]);
  const record = new TradingRecord(PositionType.LONG);
  record.entry(0, new Decimal('100'), new Decimal('1'));
  record.exit(3, new Decimal('130'), new Decimal('1'));

  const initial = new Decimal('1000');
  const c = new MaximumDrawdownByBarCriterion(initial);
  const dd = c.calculate(series, record);
  // peak = 1000 + 50 = 1050, trough = 1000 - 50 = 950, dd = 100/1050 ≈ 0.0952...
  assert.equal(dd.subtract(new Decimal('0.0952')).abs().isLessThan(new Decimal('0.001')), true);
});
