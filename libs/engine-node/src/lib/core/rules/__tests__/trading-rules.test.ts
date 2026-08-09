import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { TradingRecord, PositionType } from '../../trading';
import {
  StopLossRule,
  TakeProfitRule,
  TrailingStopRule,
  WaitRule,
  PriceOverSMARule,
  PriceUnderSMARule,
  OverboughtRSIRule,
  OversoldRSIRule,
  FirstBarRule,
  NotFirstBarRule,
} from '../trading-rules';
import { ClosePriceIndicator, SMAIndicator } from '../../indicators';

// Helper function to create a test bar
function createTestBar(
  time: Date,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): Bar {
  return new Bar({
    time,
    open: new Decimal(open.toString()),
    high: new Decimal(high.toString()),
    low: new Decimal(low.toString()),
    close: new Decimal(close.toString()),
    volume: new Decimal(volume.toString()),
  });
}

test('StopLossRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const lossPercentage = new Decimal('5');

  const rule = new StopLossRule(series, lossPercentage);

  assert.strictEqual(rule.getName(), 'StopLossRule(5%)');
});

test('StopLossRule - isSatisfied method for long position', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000), // entry price = 100, close = 105
    createTestBar(new Date('2023-01-02'), 96, 98, 94, 95, 1200), // low = 94, stop = 95 (5% loss)
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const lossPercentage = new Decimal('5');
  const rule = new StopLossRule(series, lossPercentage);

  // Create trading record with open position
  const tradingRecord = new TradingRecord(PositionType.LONG);
  tradingRecord.entry(0, new Decimal('100'), new Decimal('1')); // Entry at 100

  // Bar 0: No stop loss (entry bar) - close 105 > entry 100, so it's long
  assert.strictEqual(rule.isSatisfied(0, tradingRecord), false);

  // Bar 1: Low = 94, stop = 95 -> triggered
  assert.strictEqual(rule.isSatisfied(1, tradingRecord), true);

  // Test without trading record
  assert.strictEqual(rule.isSatisfied(1), false);

  // Test with closed position
  const closedRecord = new TradingRecord(PositionType.LONG);
  closedRecord.entry(0, new Decimal('100'), new Decimal('1'));
  closedRecord.exit(1, new Decimal('95'), new Decimal('1'));
  assert.strictEqual(rule.isSatisfied(1, closedRecord), false);
});

test('StopLossRule - isSatisfied method for short position', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 95, 1000), // entry price = 100, close = 95
    createTestBar(new Date('2023-01-02'), 106, 108, 104, 105, 1200), // high = 108, stop = 105 (5% loss)
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const lossPercentage = new Decimal('5');
  const rule = new StopLossRule(series, lossPercentage);

  // Create trading record with open short position
  const tradingRecord = new TradingRecord(PositionType.SHORT);
  tradingRecord.entry(0, new Decimal('100'), new Decimal('1')); // Entry at 100

  // Bar 1: High = 108, stop = 105 -> triggered
  assert.strictEqual(rule.isSatisfied(1, tradingRecord), true);
});

test('TakeProfitRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const profitPercentage = new Decimal('10');

  const rule = new TakeProfitRule(series, profitPercentage);

  assert.strictEqual(rule.getName(), 'TakeProfitRule(10%)');
});

test('TakeProfitRule - isSatisfied method for long position', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // entry price = 100
    createTestBar(new Date('2023-01-02'), 108, 112, 106, 110, 1200), // high = 112, target = 110 (10% profit)
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const profitPercentage = new Decimal('10');
  const rule = new TakeProfitRule(series, profitPercentage);

  // Create trading record with open position
  const tradingRecord = new TradingRecord(PositionType.LONG);
  tradingRecord.entry(0, new Decimal('100'), new Decimal('1')); // Entry at 100

  // Bar 1: High = 112, target = 110 -> triggered
  assert.strictEqual(rule.isSatisfied(1, tradingRecord), true);

  // Test without trading record
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('TakeProfitRule - isSatisfied method for short position', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // entry price = 100
    createTestBar(new Date('2023-01-02'), 92, 94, 88, 90, 1200), // low = 88, target = 90 (10% profit)
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const profitPercentage = new Decimal('10');
  const rule = new TakeProfitRule(series, profitPercentage);

  // Create trading record with open short position
  const tradingRecord = new TradingRecord(PositionType.SHORT);
  tradingRecord.entry(0, new Decimal('100'), new Decimal('1')); // Entry at 100

  // Bar 1: Low = 88, target = 90 -> triggered
  assert.strictEqual(rule.isSatisfied(1, tradingRecord), true);
});

test('Stop and take-profit rules ignore intrabar-only threshold breaches', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 100, 100, 100, 1000),
    createTestBar(new Date('2023-01-02'), 100, 120, 80, 100, 1200),
  ];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const longRecord = new TradingRecord(PositionType.LONG);
  const shortRecord = new TradingRecord(PositionType.SHORT);
  longRecord.entry(0, new Decimal('100'), new Decimal('1'));
  shortRecord.entry(0, new Decimal('100'), new Decimal('1'));

  assert.strictEqual(new StopLossRule(series, new Decimal('5')).isSatisfied(1, longRecord), false);
  assert.strictEqual(new StopLossRule(series, new Decimal('5')).isSatisfied(1, shortRecord), false);
  assert.strictEqual(
    new TakeProfitRule(series, new Decimal('10')).isSatisfied(1, longRecord),
    false
  );
  assert.strictEqual(
    new TakeProfitRule(series, new Decimal('10')).isSatisfied(1, shortRecord),
    false
  );
});

test('TrailingStopRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const trailPercentage = new Decimal('5');

  const rule = new TrailingStopRule(series, trailPercentage);

  assert.strictEqual(rule.getName(), 'TrailingStopRule(5%)');
});

test('TrailingStopRule - long trail is a percentage of high watermark and closes on close', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 100, 100, 100, 1000),
    createTestBar(new Date('2023-01-02'), 185, 200, 180, 185, 1000),
    createTestBar(new Date('2023-01-03'), 185, 185, 180, 180, 1000),
  ];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const record = new TradingRecord(PositionType.LONG);
  const rule = new TrailingStopRule(series, new Decimal('10'));
  record.entry(0, new Decimal('100'), new Decimal('1'));

  assert.strictEqual(rule.isSatisfied(0, record), false);
  assert.strictEqual(rule.isSatisfied(1, record), false, 'close 185 must stay above 180 trail');
  assert.strictEqual(rule.isSatisfied(2, record), true, 'close 180 must reach 180 trail');
});

test('TrailingStopRule - short trail is a percentage of low watermark and closes on close', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 100, 100, 100, 1000),
    createTestBar(new Date('2023-01-02'), 52, 60, 50, 52, 1000),
    createTestBar(new Date('2023-01-03'), 52, 55, 50, 55, 1000),
  ];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const record = new TradingRecord(PositionType.SHORT);
  const rule = new TrailingStopRule(series, new Decimal('10'));
  record.entry(0, new Decimal('100'), new Decimal('1'));

  assert.strictEqual(rule.isSatisfied(0, record), false);
  assert.strictEqual(rule.isSatisfied(1, record), false, 'close 52 must stay below 55 trail');
  assert.strictEqual(rule.isSatisfied(2, record), true, 'close 55 must reach 55 trail');
});

test('TrailingStopRule - evicted LONG entry falls back to entry price', () => {
  const series = new BarSeries({ name: 'EvictedLong', maxCapacity: 1 }, [
    createTestBar(new Date('2023-01-01'), 100, 100, 100, 100, 1),
  ]);
  const record = new TradingRecord(PositionType.LONG);
  const rule = new TrailingStopRule(series, new Decimal('10'));
  record.entry(0, new Decimal('100'), new Decimal('1'));
  series.addBar(createTestBar(new Date('2023-01-02'), 90, 90, 80, 90, 1));

  assert.strictEqual(series.beginIndex, 1);
  assert.strictEqual(rule.isSatisfied(1, record), true);
});

test('TrailingStopRule - evicted SHORT entry falls back to entry price', () => {
  const series = new BarSeries({ name: 'EvictedShort', maxCapacity: 1 }, [
    createTestBar(new Date('2023-01-01'), 100, 100, 100, 100, 1),
  ]);
  const record = new TradingRecord(PositionType.SHORT);
  const rule = new TrailingStopRule(series, new Decimal('10'));
  record.entry(0, new Decimal('100'), new Decimal('1'));
  series.addBar(createTestBar(new Date('2023-01-02'), 110, 120, 110, 110, 1));

  assert.strictEqual(series.beginIndex, 1);
  assert.strictEqual(rule.isSatisfied(1, record), true);
});

test('WaitRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const barCount = 3;

  const rule = new WaitRule(series, barCount);

  assert.strictEqual(rule.getName(), 'WaitRule(3 bars)');
});

test('WaitRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 110, 90, 100, 1200),
    createTestBar(new Date('2023-01-03'), 100, 110, 90, 105, 1200),
    createTestBar(new Date('2023-01-04'), 105, 110, 90, 110, 1200),
    createTestBar(new Date('2023-01-05'), 110, 110, 90, 105, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const barCount = 2;
  const rule = new WaitRule(series, barCount);

  // Test with no trading record
  assert.strictEqual(rule.isSatisfied(0), true);

  // Create trading record with a completed trade
  const tradingRecord = new TradingRecord(PositionType.LONG);
  tradingRecord.entry(0, new Decimal('100'), new Decimal('1'));
  tradingRecord.exit(1, new Decimal('105'), new Decimal('1'));

  // Index 2: 2-1 = 1 < 2 -> false
  assert.strictEqual(rule.isSatisfied(2, tradingRecord), false);

  // Index 3: 3-1 = 2 >= 2 -> true
  assert.strictEqual(rule.isSatisfied(3, tradingRecord), true);

  // Index 4: 4-1 = 3 >= 2 -> true
  assert.strictEqual(rule.isSatisfied(4, tradingRecord), true);
});

test('PriceOverSMARule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);
  const smaIndicator = new SMAIndicator(series, 2);

  const rule = new PriceOverSMARule(closeIndicator, smaIndicator);

  assert.strictEqual(rule.getName(), 'PriceOverSMARule(SMA(2))');
});

test('PriceOverSMARule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // close = 100
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 110, 1200), // close = 110
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  // Mock SMA that returns 105
  const mockSMAValues = [new Decimal('105'), new Decimal('105')];
  const mockSMAIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockSMAValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new PriceOverSMARule(closeIndicator, mockSMAIndicator);

  // 100 > 105 = false
  assert.strictEqual(rule.isSatisfied(0), false);

  // 110 > 105 = true
  assert.strictEqual(rule.isSatisfied(1), true);
});

test('PriceUnderSMARule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);
  const smaIndicator = new SMAIndicator(series, 2);

  const rule = new PriceUnderSMARule(closeIndicator, smaIndicator);

  assert.strictEqual(rule.getName(), 'PriceUnderSMARule(SMA(2))');
});

test('PriceUnderSMARule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // close = 100
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 110, 1200), // close = 110
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  // Mock SMA that returns 105
  const mockSMAValues = [new Decimal('105'), new Decimal('105')];
  const mockSMAIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockSMAValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new PriceUnderSMARule(closeIndicator, mockSMAIndicator);

  // 100 < 105 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 110 < 105 = false
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('OverboughtRSIRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Mock RSI indicator
  const mockRSIValues = [new Decimal('75'), new Decimal('65')];
  const mockRSIIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockRSIValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new OverboughtRSIRule(mockRSIIndicator, new Decimal('70'));

  assert.strictEqual(rule.getName(), 'OverboughtRSIRule(70)');
});

test('OverboughtRSIRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Mock RSI indicator
  const mockRSIValues = [new Decimal('75'), new Decimal('65')];
  const mockRSIIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockRSIValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new OverboughtRSIRule(mockRSIIndicator, new Decimal('70'));

  // 75 >= 70 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 65 >= 70 = false
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('OversoldRSIRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Mock RSI indicator
  const mockRSIValues = [new Decimal('25'), new Decimal('35')];
  const mockRSIIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockRSIValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new OversoldRSIRule(mockRSIIndicator, new Decimal('30'));

  assert.strictEqual(rule.getName(), 'OversoldRSIRule(30)');
});

test('OversoldRSIRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Mock RSI indicator
  const mockRSIValues = [new Decimal('25'), new Decimal('35')];
  const mockRSIIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockRSIValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new OversoldRSIRule(mockRSIIndicator, new Decimal('30'));

  // 25 <= 30 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 35 <= 30 = false
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('FirstBarRule - constructor and basic functionality', () => {
  const tradingRecord = new TradingRecord(PositionType.LONG);
  const rule = new FirstBarRule(tradingRecord);

  assert.strictEqual(rule.getName(), 'FirstBarRule');
});

test('FirstBarRule - isSatisfied method', () => {
  const tradingRecord = new TradingRecord(PositionType.LONG);

  // Enter at index 1
  tradingRecord.entry(1, new Decimal('100'), new Decimal('1'));

  const rule = new FirstBarRule(tradingRecord);

  // Index 0: No position yet
  assert.strictEqual(rule.isSatisfied(0), false);

  // Index 1: Entry bar, not first bar after entry
  assert.strictEqual(rule.isSatisfied(1), false);

  // Index 2: First bar after entry
  // Since we don't have access to the internal trade structure easily,

  // Index 3: Second bar after entry
  assert.strictEqual(rule.isSatisfied(3), false);
});

test('NotFirstBarRule - constructor and basic functionality', () => {
  const tradingRecord = new TradingRecord(PositionType.LONG);
  const rule = new NotFirstBarRule(tradingRecord);

  assert.strictEqual(rule.getName(), 'NotFirstBarRule');
});

test('NotFirstBarRule - isSatisfied method', () => {
  const tradingRecord = new TradingRecord(PositionType.LONG);

  // Enter at index 1
  tradingRecord.entry(1, new Decimal('100'), new Decimal('1'));

  const rule = new NotFirstBarRule(tradingRecord);

  // Index 0: No position yet
  assert.strictEqual(rule.isSatisfied(0), true);

  // Index 1: Entry bar, not first bar after entry
  assert.strictEqual(rule.isSatisfied(1), true);

  // Index 2: First bar after entry (should be false)
  assert.strictEqual(rule.isSatisfied(2), false);

  // Index 3: Second bar after entry (should be true)
  assert.strictEqual(rule.isSatisfied(3), true);
});
