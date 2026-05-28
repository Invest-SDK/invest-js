import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar';

test('Bar class - constructor with all required fields', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });

  assert.deepStrictEqual(bar.time, time);
  assert.strictEqual(bar.open.toString(), '100');
  assert.strictEqual(bar.high.toString(), '110');
  assert.strictEqual(bar.low.toString(), '90');
  assert.strictEqual(bar.close.toString(), '105');
  assert.strictEqual(bar.volume.toString(), '1000');
  assert.strictEqual(bar.amount.toString(), '0');
});

test('Bar class - constructor with optional amount field', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');
  const amount = new Decimal('50000');

  const bar = new Bar({ time, open, high, low, close, volume, amount });

  assert.strictEqual(bar.amount.toString(), '50000');
});

test('Bar class - constructor with string date', () => {
  const timeString = '2023-01-01T10:00:00Z';
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time: new Date(timeString), open, high, low, close, volume });

  assert.strictEqual(bar.time.toISOString(), new Date(timeString).toISOString());
});

test('Bar class - typicalPrice calculation', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const typicalPrice = bar.typicalPrice;

  // (110 + 90 + 105) / 3 = 305 / 3 = 101.666...
  assert.strictEqual(typicalPrice.toString(), '101.66666666666666666667');
});

test('Bar class - medianPrice calculation', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const medianPrice = bar.medianPrice;

  // (110 + 90) / 2 = 200 / 2 = 100
  assert.strictEqual(medianPrice.toString(), '100');
});

test('Bar class - priceRange calculation', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const priceRange = bar.priceRange;

  // 110 - 90 = 20
  assert.strictEqual(priceRange.toString(), '20');
});

test('Bar class - priceChange calculation', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const priceChange = bar.priceChange;

  // 105 - 100 = 5
  assert.strictEqual(priceChange.toString(), '5');
});

test('Bar class - priceChangePercent calculation', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const priceChangePercent = bar.priceChangePercent;

  // (105 - 100) / 100 * 100 = 5%
  assert.strictEqual(priceChangePercent.toString(), '5');
});

test('Bar class - priceChangePercent with zero open price', () => {
  const time = new Date();
  const open = new Decimal('0');
  const high = new Decimal('10');
  const low = new Decimal('0');
  const close = new Decimal('5');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  const priceChangePercent = bar.priceChangePercent;

  // Should return 0 when open price is zero
  assert.strictEqual(priceChangePercent.toString(), '0');
});

test('Bar class - isBullish returns true for bullish bar', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105'); // Close > Open
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isBullish(), true);
});

test('Bar class - isBullish returns false for bearish bar', () => {
  const time = new Date();
  const open = new Decimal('105'); // Open > Close
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('100');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isBullish(), false);
});

test('Bar class - isBearish returns true for bearish bar', () => {
  const time = new Date();
  const open = new Decimal('105'); // Open > Close
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('100');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isBearish(), true);
});

test('Bar class - isBearish returns false for bullish bar', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105'); // Close > Open
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isBearish(), false);
});

test('Bar class - isDoji returns true for doji bar', () => {
  // Create a doji: open and close are almost equal, much smaller than range
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('100.01'); // Very small body compared to range
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isDoji(), true);
});

test('Bar class - isDoji returns false for non-doji bar', () => {
  // Create a bar with significant body compared to range
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105'); // Significant body compared to range
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isDoji(), false);
});

test('Bar class - isHammer returns true for hammer pattern', () => {
  // Create a hammer: small body, long lower wick, small upper wick, bullish
  const time = new Date();
  const open = new Decimal('99');
  const high = new Decimal('99.3'); // Very small upper wick: 0.3
  const low = new Decimal('95'); // Long lower wick: 4
  const close = new Decimal('99.2'); // Close > Open (bullish), small body: 0.2
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isHammer(), true);
});

test('Bar class - isHammer returns false for non-hammer bar', () => {
  // Create a bar that doesn't match hammer pattern
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110'); // Large upper wick
  const low = new Decimal('90');
  const close = new Decimal('95'); // Larger body
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isHammer(), false);
});

test('Bar class - toJSON method', () => {
  const time = new Date('2023-01-01T10:00:00Z');
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');
  const amount = new Decimal('50000');

  const bar = new Bar({ time, open, high, low, close, volume, amount });
  const json = bar.toJSON();

  assert.deepStrictEqual(json, {
    time: '2023-01-01T10:00:00.000Z',
    open: '100',
    high: '110',
    low: '90',
    close: '105',
    volume: '1000',
    amount: '50000',
  });
});

test('Bar class - fromJSON method', () => {
  const jsonData = {
    time: '2023-01-01T10:00:00.000Z',
    open: '100',
    high: '110',
    low: '90',
    close: '105',
    volume: '1000',
    amount: '50000',
  };

  const bar = Bar.fromJSON(jsonData);

  assert.strictEqual(bar.time.toISOString(), '2023-01-01T10:00:00.000Z');
  assert.strictEqual(bar.open.toString(), '100');
  assert.strictEqual(bar.high.toString(), '110');
  assert.strictEqual(bar.low.toString(), '90');
  assert.strictEqual(bar.close.toString(), '105');
  assert.strictEqual(bar.volume.toString(), '1000');
  assert.strictEqual(bar.amount.toString(), '50000');
});

test('Bar class - isFilled returns true for bar with data', () => {
  const time = new Date();
  const open = new Decimal('100');
  const high = new Decimal('110');
  const low = new Decimal('90');
  const close = new Decimal('105');
  const volume = new Decimal('1000');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isFilled(), true);
});

test('Bar class - isFilled returns false for empty bar', () => {
  const time = new Date();
  const open = new Decimal('0');
  const high = new Decimal('0');
  const low = new Decimal('0');
  const close = new Decimal('0');
  const volume = new Decimal('0');

  const bar = new Bar({ time, open, high, low, close, volume });
  assert.strictEqual(bar.isFilled(), false);
});

test('Bar class - constructor with high less than low throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('90'), // High < Low
      low: new Decimal('110'),
      close: new Decimal('105'),
      volume: new Decimal('1000'),
    });
  }, /High price must be greater than or equal to low price/);
});

test('Bar class - constructor with high less than open throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('90'), // High < Open
      low: new Decimal('80'),
      close: new Decimal('95'),
      volume: new Decimal('1000'),
    });
  }, /High price must be greater than or equal to open and close prices/);
});

test('Bar class - constructor with low greater than close throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('90'),
      high: new Decimal('110'),
      low: new Decimal('100'), // Low > Close
      close: new Decimal('95'),
      volume: new Decimal('1000'),
    });
  }, /Low price must be less than or equal to open and close prices/);
});

test('Bar class - constructor with negative open throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('-100'), // Negative open
      high: new Decimal('110'),
      low: new Decimal('90'),
      close: new Decimal('105'),
      volume: new Decimal('1000'),
    });
  }, /Open price cannot be negative/);
});

test('Bar class - constructor with negative high throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('-110'), // Negative high
      low: new Decimal('90'),
      close: new Decimal('105'),
      volume: new Decimal('1000'),
    });
  }, /High price cannot be negative/);
});

test('Bar class - constructor with negative low throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('110'),
      low: new Decimal('-90'), // Negative low
      close: new Decimal('105'),
      volume: new Decimal('1000'),
    });
  }, /Low price cannot be negative/);
});

test('Bar class - constructor with negative close throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('110'),
      low: new Decimal('90'),
      close: new Decimal('-105'), // Negative close
      volume: new Decimal('1000'),
    });
  }, /Close price cannot be negative/);
});

test('Bar class - constructor with negative volume throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('110'),
      low: new Decimal('90'),
      close: new Decimal('105'),
      volume: new Decimal('-1000'), // Negative volume
    });
  }, /Volume cannot be negative/);
});

test('Bar class - constructor with negative amount throws error', () => {
  assert.throws(() => {
    new Bar({
      time: new Date(),
      open: new Decimal('100'),
      high: new Decimal('110'),
      low: new Decimal('90'),
      close: new Decimal('105'),
      volume: new Decimal('1000'),
      amount: new Decimal('-5000'), // Negative amount
    });
  }, /Amount cannot be negative/);
});

test('Bar class - constructor with valid data', () => {
  const bar = new Bar({
    time: new Date(),
    open: new Decimal('100'),
    high: new Decimal('110'),
    low: new Decimal('90'),
    close: new Decimal('105'),
    volume: new Decimal('1000'),
    amount: new Decimal('50000'),
  });

  assert.strictEqual(bar.open.toString(), '100');
  assert.strictEqual(bar.high.toString(), '110');
  assert.strictEqual(bar.low.toString(), '90');
  assert.strictEqual(bar.close.toString(), '105');
  assert.strictEqual(bar.volume.toString(), '1000');
  assert.strictEqual(bar.amount.toString(), '50000');
});
