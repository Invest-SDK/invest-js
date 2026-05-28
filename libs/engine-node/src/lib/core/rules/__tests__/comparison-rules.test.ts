import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import {
  OverIndicatorRule,
  OverOrEqualIndicatorRule,
  UnderIndicatorRule,
  UnderOrEqualIndicatorRule,
  EqualsIndicatorRule,
  CrossedUpIndicatorRule,
  CrossedDownIndicatorRule,
  CrossedUpValueRule,
  CrossedDownValueRule,
  IndicatorOverIndicatorRule,
  IndicatorUnderIndicatorRule,
} from '../comparison-rules';
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

test('OverIndicatorRule - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const threshold = new Decimal('100');

  const rule = new OverIndicatorRule(indicator, threshold);

  assert.strictEqual(rule.getName(), 'OverIndicatorRule(ClosePrice, 100)');
  assert.strictEqual(rule.getIndicator(), indicator);
});

test('OverIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000), // close = 105
    createTestBar(new Date('2023-01-02'), 105, 110, 90, 92, 1200), // close = 92
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const threshold = new Decimal('100');

  const rule = new OverIndicatorRule(indicator, threshold);

  // 105 > 100 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 92 > 100 = false
  assert.strictEqual(rule.isSatisfied(1), false);

  // Test with invalid index
  assert.strictEqual(rule.isSatisfied(2), false);
});

test('OverOrEqualIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // close = 100
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-03'), 105, 110, 90, 95, 1200), // close = 95
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const threshold = new Decimal('100');

  const rule = new OverOrEqualIndicatorRule(indicator, threshold);

  // 100 >= 100 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 105 >= 100 = true
  assert.strictEqual(rule.isSatisfied(1), true);

  // 95 >= 100 = false
  assert.strictEqual(rule.isSatisfied(2), false);
});

test('UnderIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000), // close = 105
    createTestBar(new Date('2023-01-02'), 105, 110, 90, 92, 1200), // close = 92
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const threshold = new Decimal('100');

  const rule = new UnderIndicatorRule(indicator, threshold);

  // 105 < 100 = false
  assert.strictEqual(rule.isSatisfied(0), false);

  // 92 < 100 = true
  assert.strictEqual(rule.isSatisfied(1), true);
});

test('UnderOrEqualIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // close = 100
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-03'), 95, 110, 90, 105, 1200), // close = 105
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const threshold = new Decimal('100');

  const rule = new UnderOrEqualIndicatorRule(indicator, threshold);

  // 100 <= 100 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 95 <= 100 = true
  assert.strictEqual(rule.isSatisfied(1), true);

  // 105 <= 100 = false
  assert.strictEqual(rule.isSatisfied(2), false);
});

test('EqualsIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // close = 100
    createTestBar(new Date('2023-01-02'), 100, 110, 90, 105, 1200), // close = 105
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const value = new Decimal('100');

  const rule = new EqualsIndicatorRule(indicator, value);

  // 100 == 100 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 105 == 100 = false
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('CrossedUpIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 90, 100, 80, 90, 1000), // close = 90
    createTestBar(new Date('2023-01-02'), 90, 100, 80, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-03'), 95, 110, 80, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-04'), 105, 120, 80, 110, 1200), // close = 110
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const fastIndicator = new ClosePriceIndicator(series);
  const slowIndicator = new SMAIndicator(series, 3);

  const rule = new CrossedUpIndicatorRule(fastIndicator, slowIndicator);

  // Index 0: Not enough data for SMA
  assert.strictEqual(rule.isSatisfied(0), false);

  // Index 1: Not enough data for SMA
  assert.strictEqual(rule.isSatisfied(1), false);

  // Index 2: Close = 105, SMA = (90+95+105)/3 = 96.67
  // Previous: Close = 95, SMA = not ready (index < period-1)
  // So we can't have a crossing because previous SMA is not ready
  assert.strictEqual(rule.isSatisfied(2), false);

  // Index 3: Close = 110, SMA = (95+105+110)/3 = 103.33
  // Previous: Close = 105, SMA = 96.67 -> 105 > 96.67
  // Current: Close = 110, SMA = 103.33 -> 110 > 103.33
  // Already above, so not crossing
  assert.strictEqual(rule.isSatisfied(3), false);

  // Create a clearer crossing scenario
  const crossBars = [
    createTestBar(new Date('2023-01-01'), 90, 100, 80, 90, 1000), // close = 90
    createTestBar(new Date('2023-01-02'), 90, 100, 80, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-03'), 95, 110, 80, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-04'), 105, 120, 80, 110, 1200), // close = 110
  ];

  const crossSeries = new BarSeries({ name: 'CrossSeries' }, crossBars);
  const crossFast = new ClosePriceIndicator(crossSeries);
  const crossSlowValues = [
    new Decimal('100'),
    new Decimal('100'),
    new Decimal('100'),
    new Decimal('100'),
  ];
  const crossSlow = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return crossSlowValues[index] || new Decimal('0');
    }
  })(crossSeries);

  const crossRule = new CrossedUpIndicatorRule(crossFast, crossSlow);

  // Index 0: Fast = 90, Slow = 100 -> Fast < Slow
  assert.strictEqual(crossRule.isSatisfied(0), false);

  // Index 1: Fast = 95, Slow = 100 -> Fast < Slow
  assert.strictEqual(crossRule.isSatisfied(1), false);

  // Index 2: Fast = 105, Slow = 100 -> Fast > Slow (crossing up!)
  // Previous: Fast = 95, Slow = 100 -> Fast < Slow
  assert.strictEqual(crossRule.isSatisfied(2), true);

  // Index 3: Fast = 110, Slow = 100 -> Fast > Slow (already above)
  assert.strictEqual(crossRule.isSatisfied(3), false);
});

test('CrossedDownIndicatorRule - isSatisfied method', () => {
  const crossBars = [
    createTestBar(new Date('2023-01-01'), 110, 120, 100, 110, 1000), // close = 110
    createTestBar(new Date('2023-01-02'), 105, 120, 100, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-03'), 95, 110, 80, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-04'), 90, 100, 80, 90, 1200), // close = 90
  ];

  const crossSeries = new BarSeries({ name: 'CrossSeries' }, crossBars);
  const crossFast = new ClosePriceIndicator(crossSeries);
  const crossSlowValues = [
    new Decimal('100'),
    new Decimal('100'),
    new Decimal('100'),
    new Decimal('100'),
  ];
  const crossSlow = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return crossSlowValues[index] || new Decimal('0');
    }
  })(crossSeries);

  const crossRule = new CrossedDownIndicatorRule(crossFast, crossSlow);

  // Index 0: Fast = 110, Slow = 100 -> Fast > Slow
  assert.strictEqual(crossRule.isSatisfied(0), false);

  // Index 1: Fast = 105, Slow = 100 -> Fast > Slow
  assert.strictEqual(crossRule.isSatisfied(1), false);

  // Index 2: Fast = 95, Slow = 100 -> Fast < Slow (crossing down!)
  // Previous: Fast = 105, Slow = 100 -> Fast > Slow
  assert.strictEqual(crossRule.isSatisfied(2), true);

  // Index 3: Fast = 90, Slow = 100 -> Fast < Slow (already below)
  assert.strictEqual(crossRule.isSatisfied(3), false);
});

test('CrossedUpValueRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 90, 100, 80, 90, 1000), // close = 90
    createTestBar(new Date('2023-01-02'), 90, 100, 80, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-03'), 95, 110, 80, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-04'), 105, 120, 80, 110, 1200), // close = 110
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const value = new Decimal('100');

  const rule = new CrossedUpValueRule(indicator, value);

  // Index 0: 90 (not ready for crossing check)
  assert.strictEqual(rule.isSatisfied(0), false);

  // Index 1: 95, Previous: 90 -> 95 > 100? No, 90 <= 100? Yes -> Not crossing
  assert.strictEqual(rule.isSatisfied(1), false);

  // Index 2: 105, Previous: 95 -> 105 > 100? Yes, 95 <= 100? Yes -> Crossing up!
  assert.strictEqual(rule.isSatisfied(2), true);

  // Index 3: 110, Previous: 105 -> 110 > 100? Yes, 105 > 100? Yes -> Already above
  assert.strictEqual(rule.isSatisfied(3), false);
});

test('CrossedDownValueRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 110, 120, 100, 110, 1000), // close = 110
    createTestBar(new Date('2023-01-02'), 105, 120, 100, 105, 1200), // close = 105
    createTestBar(new Date('2023-01-03'), 95, 110, 80, 95, 1200), // close = 95
    createTestBar(new Date('2023-01-04'), 90, 100, 80, 90, 1200), // close = 90
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new ClosePriceIndicator(series);
  const value = new Decimal('100');

  const rule = new CrossedDownValueRule(indicator, value);

  // Index 0: 110 (not ready for crossing check)
  assert.strictEqual(rule.isSatisfied(0), false);

  // Index 1: 105, Previous: 110 -> 105 < 100? No, 110 >= 100? Yes -> Not crossing
  assert.strictEqual(rule.isSatisfied(1), false);

  // Index 2: 95, Previous: 105 -> 95 < 100? Yes, 105 >= 100? Yes -> Crossing down!
  assert.strictEqual(rule.isSatisfied(2), true);

  // Index 3: 90, Previous: 95 -> 90 < 100? Yes, 95 < 100? Yes -> Already below
  assert.strictEqual(rule.isSatisfied(3), false);
});

test('IndicatorOverIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000), // close = 105
    createTestBar(new Date('2023-01-02'), 105, 110, 90, 95, 1200), // close = 95
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const firstIndicator = new ClosePriceIndicator(series);

  // Mock SMA values for testing
  const mockSMAValues = [new Decimal('100'), new Decimal('100')];
  const mockSecondIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockSMAValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new IndicatorOverIndicatorRule(firstIndicator, mockSecondIndicator);

  // 105 > 100 = true
  assert.strictEqual(rule.isSatisfied(0), true);

  // 95 > 100 = false
  assert.strictEqual(rule.isSatisfied(1), false);
});

test('IndicatorUnderIndicatorRule - isSatisfied method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000), // close = 105
    createTestBar(new Date('2023-01-02'), 105, 110, 90, 95, 1200), // close = 95
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const firstIndicator = new ClosePriceIndicator(series);

  // Mock SMA values for testing
  const mockSMAValues = [new Decimal('100'), new Decimal('100')];
  const mockSecondIndicator = new (class extends ClosePriceIndicator {
    protected calculate(index: number): Decimal {
      return mockSMAValues[index] || new Decimal('0');
    }
  })(series);

  const rule = new IndicatorUnderIndicatorRule(firstIndicator, mockSecondIndicator);

  // 105 < 100 = false
  assert.strictEqual(rule.isSatisfied(0), false);

  // 95 < 100 = true
  assert.strictEqual(rule.isSatisfied(1), true);
});

test('Rules - handle not ready indicators', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];
  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Create a mock indicator that's never ready
  const neverReadyIndicator = new (class extends ClosePriceIndicator {
    isReady(_index: number): boolean {
      return false;
    }
  })(series);

  const threshold = new Decimal('100');

  const overRule = new OverIndicatorRule(neverReadyIndicator, threshold);
  assert.strictEqual(overRule.isSatisfied(0), false);

  const underRule = new UnderIndicatorRule(neverReadyIndicator, threshold);
  assert.strictEqual(underRule.isSatisfied(0), false);

  const equalsRule = new EqualsIndicatorRule(neverReadyIndicator, threshold);
  assert.strictEqual(equalsRule.isSatisfied(0), false);
});
