import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { AbstractIndicator } from '../indicator';
import { isNaNValue } from '../nan';

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

// Test implementation of AbstractIndicator
class TestIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries, name = 'TestIndicator') {
    super(series, name);
  }

  protected calculate(index: number): Decimal {
    // Simple test implementation that returns the close price multiplied by 2
    return this.getClosePrice(index).multiply(new Decimal('2'));
  }
}

// Test implementation that returns null for certain conditions
class NullTestIndicator extends AbstractIndicator<Decimal | null> {
  constructor(series: BarSeries, name = 'NullTestIndicator') {
    super(series, name);
  }

  protected calculate(index: number): Decimal | null {
    // Return null for index 0, otherwise return close price
    if (index === 0) {
      return null;
    }
    return this.getClosePrice(index);
  }
}

test('AbstractIndicator - constructor and basic functionality', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new TestIndicator(series, 'CustomTestIndicator');

  assert.strictEqual(indicator.getName(), 'CustomTestIndicator');
  assert.strictEqual(indicator.getSeries(), series);
  assert.strictEqual(indicator.getCacheSize(), 0);
});

test('AbstractIndicator - calculate method works correctly', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new TestIndicator(series);

  // Our test implementation multiplies close price by 2
  assert.strictEqual(indicator.getValue(0).toString(), '210'); // 105 * 2
  assert.strictEqual(indicator.getValue(1).toString(), '220'); // 110 * 2
});

test('AbstractIndicator - caching works correctly', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new TestIndicator(series);

  // Cache should be empty initially
  assert.strictEqual(indicator.getCacheSize(), 0);

  // Get value - should populate cache
  const value1 = indicator.getValue(0);
  assert.strictEqual(indicator.getCacheSize(), 1); // Only index 0 has been accessed

  // Get value again - should return cached value
  const value2 = indicator.getValue(0);
  assert.strictEqual(value1.toString(), value2.toString());
  assert.strictEqual(indicator.getCacheSize(), 1); // Still only 1 item in cache

  // Get another value - should increase cache size
  indicator.getValue(1);
  assert.strictEqual(indicator.getCacheSize(), 2); // Indices 0 and 1 have been accessed
});

test('AbstractIndicator - clearCache method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new TestIndicator(series);

  // Calculate some values to populate cache
  indicator.getValue(0);
  indicator.getValue(1);

  assert.strictEqual(indicator.getCacheSize(), 2);

  // Clear cache
  indicator.clearCache();

  assert.strictEqual(indicator.getCacheSize(), 0);
});

test('AbstractIndicator - isReady method with null values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new NullTestIndicator(series);

  // Index 0 returns null, so should not be ready
  assert.strictEqual(indicator.isReady(0), false);

  // Index 1 returns a value, so should be ready
  assert.strictEqual(indicator.isReady(1), true);
});

test('AbstractIndicator - isReady method with non-null values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const indicator = new TestIndicator(series);

  // All indices should be ready since they return non-null values
  assert.strictEqual(indicator.isReady(0), true);
  assert.strictEqual(indicator.isReady(1), true);
});

test('AbstractIndicator - error handling for invalid indices', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];

  // Test with valid index
  const validSeries = new BarSeries({ name: 'ValidSeries' }, bars);
  const validIndicator = new TestIndicator(validSeries);

  // This should work fine
  assert.doesNotThrow(() => {
    validIndicator.getValue(0);
  });

  // Test with invalid index
  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const invalidIndicator = new TestIndicator(emptySeries);

  assert.ok(
    isNaNValue(invalidIndicator.getValue(0)),
    'getValue on invalid index should return NaNValue'
  );
  assert.strictEqual(invalidIndicator.isReady(0), false);
});

test('AbstractIndicator - protected helper methods work through subclass', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Create a test subclass that exposes the protected methods
  class ExposedTestIndicator extends AbstractIndicator<Decimal> {
    constructor(series: BarSeries) {
      super(series, 'ExposedTestIndicator');
    }

    protected calculate(index: number): Decimal {
      return this.getClosePrice(index);
    }

    // Expose protected methods for testing
    public testGetOpenPrice(index: number): Decimal {
      return this.getOpenPrice(index);
    }

    public testGetHighPrice(index: number): Decimal {
      return this.getHighPrice(index);
    }

    public testGetLowPrice(index: number): Decimal {
      return this.getLowPrice(index);
    }

    public testGetClosePrice(index: number): Decimal {
      return this.getClosePrice(index);
    }

    public testGetVolume(index: number): Decimal {
      return this.getVolume(index);
    }

    public testSum(values: Decimal[]): Decimal {
      return this.sum(values);
    }

    public testAverage(values: Decimal[]): Decimal {
      return this.average(values);
    }

    public testMax(values: Decimal[]): Decimal {
      return this.max(values);
    }

    public testMin(values: Decimal[]): Decimal {
      return this.min(values);
    }
  }

  const indicator = new ExposedTestIndicator(series);

  // Test helper methods through exposed interface
  assert.strictEqual(indicator.testGetOpenPrice(0).toString(), '100');
  assert.strictEqual(indicator.testGetHighPrice(0).toString(), '110');
  assert.strictEqual(indicator.testGetLowPrice(0).toString(), '90');
  assert.strictEqual(indicator.testGetClosePrice(0).toString(), '105');
  assert.strictEqual(indicator.testGetVolume(0).toString(), '1000');

  // Test aggregate methods
  const values = [new Decimal('10'), new Decimal('20'), new Decimal('30')];
  assert.strictEqual(indicator.testSum(values).toString(), '60');
  assert.strictEqual(indicator.testAverage(values).toString(), '20');
  assert.strictEqual(indicator.testMax(values).toString(), '30');
  assert.strictEqual(indicator.testMin(values).toString(), '10');

  // Test edge cases
  const emptyValues: Decimal[] = [];
  assert.strictEqual(indicator.testSum(emptyValues).toString(), '0');
  assert.strictEqual(indicator.testAverage(emptyValues).toString(), '0');
  assert.strictEqual(indicator.testMax(emptyValues).toString(), '0');
  assert.strictEqual(indicator.testMin(emptyValues).toString(), '0');
});
