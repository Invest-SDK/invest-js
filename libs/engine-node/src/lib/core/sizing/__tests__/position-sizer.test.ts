import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { TradingRecord, PositionType } from '../../trading/trading-record';
import { ATRIndicator } from '../../indicators/volatility/atr-indicator';
import { FixedQuantitySizer, PercentEquitySizer, ATRBasedSizer } from '../position-sizer';

function makeSeries(rows: number[]): BarSeries {
  const bars = rows.map(
    (p, i) =>
      new Bar({
        time: new Date(2024, 0, 1 + i),
        open: new Decimal(p.toString()),
        high: new Decimal((p + 1).toString()),
        low: new Decimal((p - 1).toString()),
        close: new Decimal(p.toString()),
        volume: new Decimal('1'),
      })
  );
  return new BarSeries({ name: 'T' }, bars);
}

test('FixedQuantitySizer always returns its amount', () => {
  const s = new FixedQuantitySizer(new Decimal('5'));
  const series = makeSeries([100]);
  const record = new TradingRecord(PositionType.LONG);
  const qty = s.size({
    series,
    index: 0,
    price: new Decimal('100'),
    record,
    initialEquity: new Decimal('1000'),
  });
  assert.equal(qty.toString(), '5');
});

test('PercentEquitySizer: floor of (equity * pct / price)', () => {
  // equity = 1000, percent = 0.1 → 100, price = 33.33 → 3.0003... → floor = 3
  const s = new PercentEquitySizer(new Decimal('0.1'));
  const series = makeSeries([33.33]);
  const record = new TradingRecord(PositionType.LONG);
  const qty = s.size({
    series,
    index: 0,
    price: new Decimal('33.33'),
    record,
    initialEquity: new Decimal('1000'),
  });
  assert.equal(qty.toString(), '3');
});

test('PercentEquitySizer respects floorDigits', () => {
  // equity = 1000, percent = 0.1, price = 333.33, floorDigits = 2
  // raw = 100 / 333.33 = 0.30003..., floor to 2 = 0.30
  const s = new PercentEquitySizer(new Decimal('0.1'), 2);
  const series = makeSeries([333.33]);
  const record = new TradingRecord(PositionType.LONG);
  const qty = s.size({
    series,
    index: 0,
    price: new Decimal('333.33'),
    record,
    initialEquity: new Decimal('1000'),
  });
  assert.equal(qty.toString(), '0.3');
});

test('ATRBasedSizer returns 0 while ATR not ready', () => {
  const series = makeSeries([100, 101, 102]);
  const atr = new ATRIndicator(series, 14);
  const s = new ATRBasedSizer(new Decimal('0.01'), atr, new Decimal('2'));
  const record = new TradingRecord(PositionType.LONG);
  const qty = s.size({
    series,
    index: 2,
    price: new Decimal('102'),
    record,
    initialEquity: new Decimal('10000'),
  });
  assert.equal(qty.toString(), '0');
});

test('ATRBasedSizer: risk-fraction based quantity once warmed up', () => {
  // 20 bars of upward trend; ATR(5) is well-defined.
  const series = makeSeries(Array.from({ length: 20 }, (_, i) => 100 + i));
  const atr = new ATRIndicator(series, 5);
  const s = new ATRBasedSizer(new Decimal('0.01'), atr, new Decimal('1'));
  const record = new TradingRecord(PositionType.LONG);
  const qty = s.size({
    series,
    index: 19,
    price: new Decimal('119'),
    record,
    initialEquity: new Decimal('10000'),
  });
  // ATR(5) на чистом trend = 2.0 (high-low = 2 каждый бар, prevClose внутри hl).
  // risk = 10000 * 0.01 = 100. qty = 100 / 2.0 = 50, floor = 50.
  assert.equal(qty.toString(), '50');
});
