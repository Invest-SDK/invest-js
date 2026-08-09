import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { SMAIndicator, EMAIndicator } from '../moving-average-indicators';
import { ClosePriceIndicator } from '../price-indicators';
import { AbstractIndicator } from '../indicator';
import { NaNValue, isNaNValue } from '../nan';

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

test('SMAIndicator - constructor with BarSeries', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const sma = new SMAIndicator(series, 3);

  assert.strictEqual(sma.getName(), 'SMA(3)');
  assert.strictEqual(sma.getBarCount(), 3);
  assert.strictEqual(sma.getSeries(), series);
});

test('SMAIndicator - constructor with Indicator', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(closeIndicator, 3);

  assert.strictEqual(sma.getName(), 'SMA(3)');
  assert.strictEqual(sma.getBarCount(), 3);
  assert.strictEqual(sma.getSource(), closeIndicator);
});

test('SMAIndicator - constructor with invalid barCount', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);

  assert.throws(() => {
    new SMAIndicator(series, 0);
  }, /Bar count must be positive/);

  assert.throws(() => {
    new SMAIndicator(series, -1);
  }, /Bar count must be positive/);
});

test('SMAIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // Close: 100
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200), // Close: 105
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300), // Close: 110
    createTestBar(new Date('2023-01-04'), 115, 125, 105, 115, 1400), // Close: 115
    createTestBar(new Date('2023-01-05'), 120, 130, 110, 120, 1500), // Close: 120
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const sma3 = new SMAIndicator(series, 3);

  // Not enough data for first 2 bars — sentinel returned, indicator not ready
  assert.ok(isNaNValue(sma3.getValue(0)));
  assert.strictEqual(sma3.isReady(0), false);
  assert.ok(isNaNValue(sma3.getValue(1)));
  assert.strictEqual(sma3.isReady(1), false);

  // SMA(3) for index 2: (100 + 105 + 110) / 3 = 105
  assert.strictEqual(sma3.getValue(2).toString(), '105');

  // SMA(3) for index 3: (105 + 110 + 115) / 3 = 110
  assert.strictEqual(sma3.getValue(3).toString(), '110');

  // SMA(3) for index 4: (110 + 115 + 120) / 3 = 115
  assert.strictEqual(sma3.getValue(4).toString(), '115');
});

test('SMAIndicator - nested source must be ready for the full window', () => {
  const bars = [100, 105, 110, 115].map((close, index) =>
    createTestBar(new Date(2023, 0, index + 1), close, close, close, close, 1)
  );
  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const nested = new SMAIndicator(new SMAIndicator(series, 3), 2);

  assert.strictEqual(nested.isReady(2), false);
  assert.ok(isNaNValue(nested.getValue(2)));
  assert.strictEqual(nested.isReady(3), true);
  assert.strictEqual(nested.getValue(3).toString(), '107.5');
});

test('SMAIndicator - caching works correctly', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const sma = new SMAIndicator(series, 3);

  // Cache should be empty initially
  assert.strictEqual(sma.getCacheSize(), 0);

  // Get value - should populate cache
  const value1 = sma.getValue(2);
  assert.strictEqual(sma.getCacheSize(), 1); // Only index 2 has been accessed

  // Get value again - should return cached value
  const value2 = sma.getValue(2);
  assert.strictEqual(value1.toString(), value2.toString());
  assert.strictEqual(sma.getCacheSize(), 1); // Still only 1 item in cache
});

test('EMAIndicator - constructor with BarSeries', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const ema = new EMAIndicator(series, 3);

  assert.strictEqual(ema.getName(), 'EMA(3)');
  assert.strictEqual(ema.getBarCount(), 3);
  assert.strictEqual(ema.getSeries(), series);
  // Multiplier = 2 / (3 + 1) = 0.5
  assert.strictEqual(ema.getMultiplier().toString(), '0.5');
});

test('EMAIndicator - constructor with Indicator', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);
  const ema = new EMAIndicator(closeIndicator, 3);

  assert.strictEqual(ema.getName(), 'EMA(3)');
  assert.strictEqual(ema.getBarCount(), 3);
  assert.strictEqual(ema.getSource(), closeIndicator);
});

test('EMAIndicator - constructor with invalid barCount', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);

  assert.throws(() => {
    new EMAIndicator(series, 0);
  }, /Bar count must be positive/);

  assert.throws(() => {
    new EMAIndicator(series, -1);
  }, /Bar count must be positive/);
});

test('EMAIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000), // Close: 100
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200), // Close: 105
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300), // Close: 110
    createTestBar(new Date('2023-01-04'), 115, 125, 105, 115, 1400), // Close: 115
    createTestBar(new Date('2023-01-05'), 120, 130, 110, 120, 1500), // Close: 120
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const ema3 = new EMAIndicator(series, 3);

  // Not enough data for first 2 bars — sentinel returned, indicator not ready
  assert.ok(isNaNValue(ema3.getValue(0)));
  assert.strictEqual(ema3.isReady(0), false);
  assert.ok(isNaNValue(ema3.getValue(1)));
  assert.strictEqual(ema3.isReady(1), false);

  // First EMA value (index 2) = SMA of first 3 values = (100 + 105 + 110) / 3 = 105
  assert.strictEqual(ema3.getValue(2).toString(), '105');

  // EMA calculation: EMA = (Close - Previous EMA) * Multiplier + Previous EMA
  // Multiplier = 2 / (3 + 1) = 0.5
  // EMA(3) = (115 - 105) * 0.5 + 105 = 10 + 105 = 110
  assert.strictEqual(ema3.getValue(3).toString(), '110');

  // EMA(4) = (120 - 110) * 0.5 + 110 = 5 + 110 = 115
  assert.strictEqual(ema3.getValue(4).toString(), '115');
});

test('SMA and EMA recompute after setBars but preserve append-only cache', () => {
  const makeBars = (closes: number[]) =>
    closes.map((close, index) =>
      createTestBar(new Date(2023, 0, index + 1), close, close, close, close, 1)
    );
  const series = new BarSeries({ name: 'TestSeries' }, makeBars([1, 2, 3, 4]));
  const sma = new SMAIndicator(series, 3);
  const ema = new EMAIndicator(series, 3);

  assert.strictEqual(sma.getValue(2).toString(), '2');
  assert.strictEqual(ema.getValue(3).toString(), '3');
  const smaCacheSize = sma.getCacheSize();
  const emaCacheSize = ema.getCacheSize();

  series.addBar(createTestBar(new Date(2023, 0, 5), 5, 5, 5, 5, 1));
  assert.strictEqual(sma.getValue(2).toString(), '2');
  assert.strictEqual(ema.getValue(3).toString(), '3');
  assert.strictEqual(sma.getCacheSize(), smaCacheSize);
  assert.strictEqual(ema.getCacheSize(), emaCacheSize);

  series.setBars(makeBars([10, 20, 30, 40]));
  assert.strictEqual(sma.getValue(2).toString(), '20');
  assert.strictEqual(ema.getValue(3).toString(), '30');
});

test('EMAIndicator - reset rebuilds a source-dependent seed index', () => {
  class ThresholdIndicator extends AbstractIndicator<Decimal> {
    protected calculate(index: number): Decimal {
      const close = this.getClosePrice(index);
      return close.isLessThan(new Decimal('10')) ? NaNValue : close;
    }
  }

  const makeSeries = (closes: number[]) =>
    new BarSeries(
      { name: 'TestSeries' },
      closes.map((close, index) =>
        createTestBar(new Date(2023, 0, index + 1), close, close, close, close, 1)
      )
    );
  const series = makeSeries([1, 1, 10, 10, 10]);
  const ema = new EMAIndicator(new ThresholdIndicator(series, 'Threshold'), 2);
  assert.strictEqual(ema.getValue(4).toString(), '10');

  const replacement = makeSeries([10, 10, 100, 10, 10]);
  series.setBars(replacement.getAllBars());
  const expected = new EMAIndicator(new ThresholdIndicator(series, 'Threshold'), 2).getValue(4);

  assert.strictEqual(ema.getValue(4).toString(), expected.toString());
});

test('EMAIndicator - isReady refreshes the seed after setBars before getValue', () => {
  class ThresholdIndicator extends AbstractIndicator<Decimal> {
    protected calculate(index: number): Decimal {
      const close = this.getClosePrice(index);
      return close.isLessThan(new Decimal('10')) ? NaNValue : close;
    }
  }

  const makeBars = (closes: number[]) =>
    closes.map((close, index) =>
      createTestBar(new Date(2023, 0, index + 1), close, close, close, close, 1)
    );
  const series = new BarSeries({ name: 'TestSeries' }, makeBars([1, 1, 10, 10]));
  const ema = new EMAIndicator(new ThresholdIndicator(series, 'Threshold'), 2);
  assert.strictEqual(ema.isReady(3), true);

  series.setBars(makeBars([10, 10, 10, 10]));

  assert.strictEqual(ema.isReady(1), true);
});

test('EMAIndicator - compare with manual calculation', () => {
  // Test with simple values to verify EMA calculation
  const bars = [
    createTestBar(new Date('2023-01-01'), 10, 10, 10, 10, 0), // Close: 10
    createTestBar(new Date('2023-01-02'), 20, 20, 20, 20, 0), // Close: 20
    createTestBar(new Date('2023-01-03'), 30, 30, 30, 30, 0), // Close: 30
    createTestBar(new Date('2023-01-04'), 40, 40, 40, 40, 0), // Close: 40
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const ema2 = new EMAIndicator(series, 2); // Multiplier = 2 / (2 + 1) = 0.666...

  // First EMA value (index 1) = SMA of first 2 values = (10 + 20) / 2 = 15
  assert.strictEqual(ema2.getValue(1).toString(), '15');

  // EMA(2) = (30 - 15) * 0.666... + 15 = 10 + 15 = 25
  const ema2Value = ema2.getValue(2);
  assert.ok(ema2Value.isGreaterThanOrEqual(new Decimal('24.99')));
  assert.ok(ema2Value.isLessThanOrEqual(new Decimal('25.01')));

  // EMA(3) = (40 - 25) * 0.666... + 25 = 10 + 25 = 35
  const ema3Value = ema2.getValue(3);
  assert.ok(ema3Value.isGreaterThanOrEqual(new Decimal('34.99')));
  assert.ok(ema3Value.isLessThanOrEqual(new Decimal('35.01')));
});

test('EMAIndicator - caching works correctly', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const ema = new EMAIndicator(series, 3);

  // Cache should be empty initially
  assert.strictEqual(ema.getCacheSize(), 0);

  // Get value - should populate cache
  const value1 = ema.getValue(2);
  assert.strictEqual(ema.getCacheSize(), 1); // Only index 2 has been accessed

  // Get value again - should return cached value
  const value2 = ema.getValue(2);
  assert.strictEqual(value1.toString(), value2.toString());
  assert.strictEqual(ema.getCacheSize(), 1); // Still only 1 item in cache
});

test('Indicators - isReady method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const sma3 = new SMAIndicator(series, 3);
  const ema3 = new EMAIndicator(series, 3);

  // isReady отражает реальную «прогретость» окна: для периода 3 индикатор
  // готов только начиная с индекса 2 (beginIndex + barCount - 1).
  assert.strictEqual(sma3.isReady(0), false);
  assert.strictEqual(sma3.isReady(1), false);
  assert.strictEqual(sma3.isReady(2), true);

  assert.strictEqual(ema3.isReady(0), false);
  assert.strictEqual(ema3.isReady(1), false);
  assert.strictEqual(ema3.isReady(2), true);
});

test('Indicators - clearCache method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 100, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 105, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 110, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const sma = new SMAIndicator(series, 3);

  // Calculate some values to populate cache
  sma.getValue(0);
  sma.getValue(1);
  sma.getValue(2);

  assert.strictEqual(sma.getCacheSize(), 3);

  // Clear cache
  sma.clearCache();

  assert.strictEqual(sma.getCacheSize(), 0);
});
