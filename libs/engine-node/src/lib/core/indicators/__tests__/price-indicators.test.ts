import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import {
  ClosePriceIndicator,
  OpenPriceIndicator,
  HighPriceIndicator,
  LowPriceIndicator,
  TypicalPriceIndicator,
  MedianPriceIndicator,
  VolumeIndicator,
  PriceIndicator,
} from '../price-indicators';

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

test('ClosePriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  assert.strictEqual(closeIndicator.getName(), 'ClosePrice');
  assert.strictEqual(closeIndicator.getSeries(), series);
});

test('ClosePriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  assert.strictEqual(closeIndicator.getValue(0).toString(), '105');
  assert.strictEqual(closeIndicator.getValue(1).toString(), '110');
});

test('OpenPriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const openIndicator = new OpenPriceIndicator(series);

  assert.strictEqual(openIndicator.getName(), 'OpenPrice');
  assert.strictEqual(openIndicator.getSeries(), series);
});

test('OpenPriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const openIndicator = new OpenPriceIndicator(series);

  assert.strictEqual(openIndicator.getValue(0).toString(), '100');
  assert.strictEqual(openIndicator.getValue(1).toString(), '105');
});

test('HighPriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const highIndicator = new HighPriceIndicator(series);

  assert.strictEqual(highIndicator.getName(), 'HighPrice');
  assert.strictEqual(highIndicator.getSeries(), series);
});

test('HighPriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const highIndicator = new HighPriceIndicator(series);

  assert.strictEqual(highIndicator.getValue(0).toString(), '110');
  assert.strictEqual(highIndicator.getValue(1).toString(), '115');
});

test('LowPriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const lowIndicator = new LowPriceIndicator(series);

  assert.strictEqual(lowIndicator.getName(), 'LowPrice');
  assert.strictEqual(lowIndicator.getSeries(), series);
});

test('LowPriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const lowIndicator = new LowPriceIndicator(series);

  assert.strictEqual(lowIndicator.getValue(0).toString(), '90');
  assert.strictEqual(lowIndicator.getValue(1).toString(), '95');
});

test('TypicalPriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const typicalIndicator = new TypicalPriceIndicator(series);

  assert.strictEqual(typicalIndicator.getName(), 'TypicalPrice');
  assert.strictEqual(typicalIndicator.getSeries(), series);
});

test('TypicalPriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const typicalIndicator = new TypicalPriceIndicator(series);

  // Typical price = (High + Low + Close) / 3
  // Bar 0: (110 + 90 + 105) / 3 = 305 / 3 = 101.666...
  const typical0 = typicalIndicator.getValue(0);
  assert.ok(typical0.isGreaterThanOrEqual(new Decimal('101.66')));
  assert.ok(typical0.isLessThanOrEqual(new Decimal('101.67')));

  // Bar 1: (115 + 95 + 110) / 3 = 320 / 3 = 106.666...
  const typical1 = typicalIndicator.getValue(1);
  assert.ok(typical1.isGreaterThanOrEqual(new Decimal('106.66')));
  assert.ok(typical1.isLessThanOrEqual(new Decimal('106.67')));
});

test('MedianPriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const medianIndicator = new MedianPriceIndicator(series);

  assert.strictEqual(medianIndicator.getName(), 'MedianPrice');
  assert.strictEqual(medianIndicator.getSeries(), series);
});

test('MedianPriceIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const medianIndicator = new MedianPriceIndicator(series);

  // Median price = (High + Low) / 2
  // Bar 0: (110 + 90) / 2 = 200 / 2 = 100
  assert.strictEqual(medianIndicator.getValue(0).toString(), '100');

  // Bar 1: (115 + 95) / 2 = 210 / 2 = 105
  assert.strictEqual(medianIndicator.getValue(1).toString(), '105');
});

test('VolumeIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const volumeIndicator = new VolumeIndicator(series);

  assert.strictEqual(volumeIndicator.getName(), 'Volume');
  assert.strictEqual(volumeIndicator.getSeries(), series);
});

test('VolumeIndicator - calculate values', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const volumeIndicator = new VolumeIndicator(series);

  assert.strictEqual(volumeIndicator.getValue(0).toString(), '1000');
  assert.strictEqual(volumeIndicator.getValue(1).toString(), '1200');
});

test('PriceIndicator - constructor and basic functionality', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Test with default close price type
  const priceIndicatorDefault = new PriceIndicator(series);
  assert.strictEqual(priceIndicatorDefault.getName(), 'PriceIndicator(close)');
  assert.strictEqual(priceIndicatorDefault.getPriceType(), 'close');

  // Test with explicit close price type
  const priceIndicatorClose = new PriceIndicator(series, 'close');
  assert.strictEqual(priceIndicatorClose.getName(), 'PriceIndicator(close)');
  assert.strictEqual(priceIndicatorClose.getPriceType(), 'close');

  // Test with open price type
  const priceIndicatorOpen = new PriceIndicator(series, 'open');
  assert.strictEqual(priceIndicatorOpen.getName(), 'PriceIndicator(open)');
  assert.strictEqual(priceIndicatorOpen.getPriceType(), 'open');

  // Test with high price type
  const priceIndicatorHigh = new PriceIndicator(series, 'high');
  assert.strictEqual(priceIndicatorHigh.getName(), 'PriceIndicator(high)');
  assert.strictEqual(priceIndicatorHigh.getPriceType(), 'high');

  // Test with low price type
  const priceIndicatorLow = new PriceIndicator(series, 'low');
  assert.strictEqual(priceIndicatorLow.getName(), 'PriceIndicator(low)');
  assert.strictEqual(priceIndicatorLow.getPriceType(), 'low');

  // Test with typical price type
  const priceIndicatorTypical = new PriceIndicator(series, 'typical');
  assert.strictEqual(priceIndicatorTypical.getName(), 'PriceIndicator(typical)');
  assert.strictEqual(priceIndicatorTypical.getPriceType(), 'typical');

  // Test with median price type
  const priceIndicatorMedian = new PriceIndicator(series, 'median');
  assert.strictEqual(priceIndicatorMedian.getName(), 'PriceIndicator(median)');
  assert.strictEqual(priceIndicatorMedian.getPriceType(), 'median');
});

test('PriceIndicator - calculate values for different price types', () => {
  const bars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Test close price
  const closeIndicator = new PriceIndicator(series, 'close');
  assert.strictEqual(closeIndicator.getValue(0).toString(), '105');

  // Test open price
  const openIndicator = new PriceIndicator(series, 'open');
  assert.strictEqual(openIndicator.getValue(0).toString(), '100');

  // Test high price
  const highIndicator = new PriceIndicator(series, 'high');
  assert.strictEqual(highIndicator.getValue(0).toString(), '110');

  // Test low price
  const lowIndicator = new PriceIndicator(series, 'low');
  assert.strictEqual(lowIndicator.getValue(0).toString(), '90');

  // Test typical price
  const typicalIndicator = new PriceIndicator(series, 'typical');
  const typicalValue = typicalIndicator.getValue(0);
  assert.ok(typicalValue.isGreaterThanOrEqual(new Decimal('101.66')));
  assert.ok(typicalValue.isLessThanOrEqual(new Decimal('101.67')));

  // Test median price
  const medianIndicator = new PriceIndicator(series, 'median');
  assert.strictEqual(medianIndicator.getValue(0).toString(), '100');
});

test('Indicators - caching works correctly', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  // Cache should be empty initially
  assert.strictEqual(closeIndicator.getCacheSize(), 0);

  // Get value - should populate cache
  const value1 = closeIndicator.getValue(0);
  assert.strictEqual(closeIndicator.getCacheSize(), 1); // Only index 0 has been accessed

  // Get value again - should return cached value
  const value2 = closeIndicator.getValue(0);
  assert.strictEqual(value1.toString(), value2.toString());
  assert.strictEqual(closeIndicator.getCacheSize(), 1); // Still only 1 item in cache
});

test('Indicators - clearCache method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const closeIndicator = new ClosePriceIndicator(series);

  // Calculate some values to populate cache
  closeIndicator.getValue(0);
  closeIndicator.getValue(1);

  assert.strictEqual(closeIndicator.getCacheSize(), 2);

  // Clear cache
  closeIndicator.clearCache();

  assert.strictEqual(closeIndicator.getCacheSize(), 0);
});
