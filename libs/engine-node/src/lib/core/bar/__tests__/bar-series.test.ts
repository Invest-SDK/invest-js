import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar';
import { BarSeries } from '../bar-series';

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

test('BarSeries - constructor with empty bars', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);

  assert.strictEqual(series.name, 'TestSeries');
  assert.strictEqual(series.barCount, 0);
  assert.strictEqual(series.isEmpty(), true);
  assert.strictEqual(series.isNotEmpty(), false);
  assert.strictEqual(series.endIndex, -1);
  assert.strictEqual(series.beginIndex, 0);
});

test('BarSeries - constructor with bars', () => {
  const time1 = new Date('2023-01-01');
  const time2 = new Date('2023-01-02');
  const bars = [
    createTestBar(time1, 100, 110, 90, 105, 1000),
    createTestBar(time2, 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  assert.strictEqual(series.name, 'TestSeries');
  assert.strictEqual(series.barCount, 2);
  assert.strictEqual(series.isEmpty(), false);
  assert.strictEqual(series.isNotEmpty(), true);
  assert.strictEqual(series.endIndex, 1);
  assert.strictEqual(series.beginIndex, 0);
});

test('BarSeries - addBar method', () => {
  const time = new Date('2023-01-01');
  const series = new BarSeries({ name: 'TestSeries' }, []);
  const bar = createTestBar(time, 100, 110, 90, 105, 1000);

  series.addBar(bar);

  assert.strictEqual(series.barCount, 1);
  assert.strictEqual(series.isEmpty(), false);
  assert.strictEqual(series.endIndex, 0);

  const retrievedBar = series.getBar(0);
  // Compare time values instead of references
  assert.strictEqual(retrievedBar?.time.getTime(), time.getTime());
  assert.strictEqual(retrievedBar?.close.toString(), '105');
});

test('BarSeries - addBars method', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  series.addBars(bars);

  assert.strictEqual(series.barCount, 2);
  assert.strictEqual(series.endIndex, 1);

  const firstBar = series.getBar(0);
  const secondBar = series.getBar(1);

  assert.strictEqual(firstBar?.close.toString(), '105');
  assert.strictEqual(secondBar?.close.toString(), '110');
});

test('BarSeries - addBarData method', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);

  series.addBarData({
    time: new Date('2023-01-01'),
    open: new Decimal('100'),
    high: new Decimal('110'),
    low: new Decimal('90'),
    close: new Decimal('105'),
    volume: new Decimal('1000'),
  });

  assert.strictEqual(series.barCount, 1);
  assert.strictEqual(series.getBar(0)?.close.toString(), '105');
});

test('BarSeries - getBar method', () => {
  const time1 = new Date('2023-01-01');
  const time2 = new Date('2023-01-02');
  const bars = [
    createTestBar(time1, 100, 110, 90, 105, 1000),
    createTestBar(time2, 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const firstBar = series.getBar(0);
  const secondBar = series.getBar(1);
  const invalidBar = series.getBar(2);

  assert.strictEqual(firstBar?.close.toString(), '105');
  assert.strictEqual(secondBar?.close.toString(), '110');
  assert.strictEqual(invalidBar, null);
});

test('BarSeries - getLastBar method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const lastBar = series.getLastBar();
  assert.strictEqual(lastBar?.close.toString(), '110');

  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyLastBar = emptySeries.getLastBar();
  assert.strictEqual(emptyLastBar, null);
});

test('BarSeries - getPenultimateBar method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const penultimateBar = series.getPenultimateBar();
  assert.strictEqual(penultimateBar?.close.toString(), '105');

  // Test with only one bar
  const singleBarSeries = new BarSeries({ name: 'SingleBarSeries' }, [bars[0]]);
  const singlePenultimateBar = singleBarSeries.getPenultimateBar();
  assert.strictEqual(singlePenultimateBar, null);

  // Test with empty series
  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyPenultimateBar = emptySeries.getPenultimateBar();
  assert.strictEqual(emptyPenultimateBar, null);
});

test('BarSeries - getBarAtEnd method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const lastBar = series.getBarAtEnd(0);
  const secondToLastBar = series.getBarAtEnd(1);
  const thirdToLastBar = series.getBarAtEnd(2);
  const invalidBar = series.getBarAtEnd(3);

  assert.strictEqual(lastBar?.close.toString(), '115');
  assert.strictEqual(secondToLastBar?.close.toString(), '110');
  assert.strictEqual(thirdToLastBar?.close.toString(), '105');
  assert.strictEqual(invalidBar, null);
});

test('BarSeries - getBars method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const subset = series.getBars(0, 1);
  assert.strictEqual(subset.length, 2);
  assert.strictEqual(subset[0].close.toString(), '105');
  assert.strictEqual(subset[1].close.toString(), '110');

  // Test invalid range
  const invalidSubset = series.getBars(1, 0);
  assert.strictEqual(invalidSubset.length, 0);

  // Test out of bounds
  const outOfBoundsSubset = series.getBars(2, 5);
  assert.strictEqual(outOfBoundsSubset.length, 0);
});

test('BarSeries - getAllBars method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const allBars = series.getAllBars();
  assert.strictEqual(allBars.length, 2);
  assert.strictEqual(allBars[0].close.toString(), '105');
  assert.strictEqual(allBars[1].close.toString(), '110');

  // Verify it returns a copy
  allBars.pop();
  assert.strictEqual(series.barCount, 2); // Original should be unchanged
});

test('BarSeries - removeBar method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const removedBar = series.removeBar(0);
  assert.strictEqual(removedBar?.close.toString(), '105');
  assert.strictEqual(series.barCount, 1);
  // После удаления головы абсолютные индексы оставшихся баров стабильны:
  // beginIndex продвигается, endIndex не уменьшается.
  assert.strictEqual(series.beginIndex, 1);
  assert.strictEqual(series.endIndex, 1);

  // Try to remove invalid index
  const invalidRemove = series.removeBar(5);
  assert.strictEqual(invalidRemove, null);
  assert.strictEqual(series.barCount, 1);
});

test('BarSeries - removeBar head preserves absolute indices of survivors', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];
  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const barAtOne = series.getBar(1);
  assert.ok(barAtOne !== null);

  series.removeBar(0);
  assert.strictEqual(series.beginIndex, 1);
  assert.strictEqual(series.endIndex, 2);
  assert.strictEqual(series.getBar(1), barAtOne);

  // Mid-series и tail удаление запрещены.
  assert.throws(() => series.removeBar(2));
});

test('BarSeries - clear method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  series.clear();

  assert.strictEqual(series.barCount, 0);
  assert.strictEqual(series.isEmpty(), true);
  assert.strictEqual(series.endIndex, -1);
  assert.strictEqual(series.beginIndex, 0);
});

test('BarSeries - setBars method', () => {
  const initialBars = [createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000)];

  const newBars = [
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, initialBars);
  series.setBars(newBars);

  assert.strictEqual(series.barCount, 2);
  assert.strictEqual(series.getBar(0)?.close.toString(), '110');
  assert.strictEqual(series.getBar(1)?.close.toString(), '115');
});

test('BarSeries - getLastClose method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const lastClose = series.getLastClose();
  assert.strictEqual(lastClose?.toString(), '110');

  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyLastClose = emptySeries.getLastClose();
  assert.strictEqual(emptyLastClose, null);
});

test('BarSeries - getPrice arrays methods', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const closePrices = series.getClosePrices();
  assert.strictEqual(closePrices.length, 2);
  assert.strictEqual(closePrices[0].toString(), '105');
  assert.strictEqual(closePrices[1].toString(), '110');

  const openPrices = series.getOpenPrices();
  assert.strictEqual(openPrices.length, 2);
  assert.strictEqual(openPrices[0].toString(), '100');
  assert.strictEqual(openPrices[1].toString(), '105');

  const highPrices = series.getHighPrices();
  assert.strictEqual(highPrices.length, 2);
  assert.strictEqual(highPrices[0].toString(), '110');
  assert.strictEqual(highPrices[1].toString(), '115');

  const lowPrices = series.getLowPrices();
  assert.strictEqual(lowPrices.length, 2);
  assert.strictEqual(lowPrices[0].toString(), '90');
  assert.strictEqual(lowPrices[1].toString(), '95');

  const volumes = series.getVolumes();
  assert.strictEqual(volumes.length, 2);
  assert.strictEqual(volumes[0].toString(), '1000');
  assert.strictEqual(volumes[1].toString(), '1200');

  const times = series.getTimes();
  assert.strictEqual(times.length, 2);
  assert.strictEqual(times[0].toISOString(), new Date('2023-01-01').toISOString());
  assert.strictEqual(times[1].toISOString(), new Date('2023-01-02').toISOString());
});

test('BarSeries - findBarByTime method', () => {
  const time1 = new Date('2023-01-01T10:00:00Z');
  const time2 = new Date('2023-01-01T11:00:00Z');
  const time3 = new Date('2023-01-01T12:00:00Z');

  const bars = [
    createTestBar(time1, 100, 110, 90, 105, 1000),
    createTestBar(time2, 105, 115, 95, 110, 1200),
    createTestBar(time3, 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  // Exact match
  const exactIndex = series.findBarByTime(time2, true);
  assert.strictEqual(exactIndex, 1);

  // Non-exact match (find closest before or equal)
  const nonExactIndex = series.findBarByTime(new Date('2023-01-01T10:30:00Z'), false);
  assert.strictEqual(nonExactIndex, 0);

  // Empty series
  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyResult = emptySeries.findBarByTime(time1);
  assert.strictEqual(emptyResult, null);
});

test('BarSeries - findFirstBarAfter method', () => {
  const time1 = new Date('2023-01-01T10:00:00Z');
  const time2 = new Date('2023-01-01T11:00:00Z');
  const time3 = new Date('2023-01-01T12:00:00Z');

  const bars = [
    createTestBar(time1, 100, 110, 90, 105, 1000),
    createTestBar(time2, 105, 115, 95, 110, 1200),
    createTestBar(time3, 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const index = series.findFirstBarAfter(new Date('2023-01-01T10:30:00Z'));
  assert.strictEqual(index, 1);

  // No bar after the specified time
  const noResult = series.findFirstBarAfter(new Date('2023-01-01T13:00:00Z'));
  assert.strictEqual(noResult, null);

  // Empty series
  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyResult = emptySeries.findFirstBarAfter(time1);
  assert.strictEqual(emptyResult, null);
});

test('BarSeries - findLastBarBefore method', () => {
  const time1 = new Date('2023-01-01T10:00:00Z');
  const time2 = new Date('2023-01-01T11:00:00Z');
  const time3 = new Date('2023-01-01T12:00:00Z');

  const bars = [
    createTestBar(time1, 100, 110, 90, 105, 1000),
    createTestBar(time2, 105, 115, 95, 110, 1200),
    createTestBar(time3, 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const index = series.findLastBarBefore(new Date('2023-01-01T11:30:00Z'));
  assert.strictEqual(index, 1);

  // No bar before the specified time
  const noResult = series.findLastBarBefore(new Date('2023-01-01T09:00:00Z'));
  assert.strictEqual(noResult, null);

  // Empty series
  const emptySeries = new BarSeries({ name: 'EmptySeries' }, []);
  const emptyResult = emptySeries.findLastBarBefore(time1);
  assert.strictEqual(emptyResult, null);
});

test('BarSeries - isValidIndex method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  assert.strictEqual(series.isValidIndex(0), true);
  assert.strictEqual(series.isValidIndex(1), true);
  assert.strictEqual(series.isValidIndex(-1), false);
  assert.strictEqual(series.isValidIndex(2), false);
});

test('BarSeries - getSubSeries method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const subSeries = series.getSubSeries(0, 1);
  assert.strictEqual(subSeries.barCount, 2);
  assert.strictEqual(subSeries.getBar(0)?.close.toString(), '105');
  assert.strictEqual(subSeries.getBar(1)?.close.toString(), '110');

  // Invalid range should return empty series
  const invalidSubSeries = series.getSubSeries(1, 0);
  assert.strictEqual(invalidSubSeries.barCount, 0);

  // Out of bounds should return empty series
  const outOfBoundsSubSeries = series.getSubSeries(2, 5);
  assert.strictEqual(outOfBoundsSubSeries.barCount, 0);
});

test('BarSeries - getRecentBars method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
    createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const recentBars = series.getRecentBars(2);
  assert.strictEqual(recentBars.length, 2);
  assert.strictEqual(recentBars[0].close.toString(), '110');
  assert.strictEqual(recentBars[1].close.toString(), '115');

  // Request more bars than available
  const allBars = series.getRecentBars(5);
  assert.strictEqual(allBars.length, 3);
});

test('BarSeries - forEach method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const collectedBars: Bar[] = [];
  const collectedIndices: number[] = [];

  series.forEach((bar, index) => {
    collectedBars.push(bar);
    collectedIndices.push(index);
  });

  assert.strictEqual(collectedBars.length, 2);
  assert.strictEqual(collectedBars[0].close.toString(), '105');
  assert.strictEqual(collectedBars[1].close.toString(), '110');
  assert.deepStrictEqual(collectedIndices, [0, 1]);
});

test('BarSeries - map method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const closeValues = series.map((bar) => bar.close.toString());
  assert.deepStrictEqual(closeValues, ['105', '110']);
});

test('BarSeries - forEachReverse method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const collectedBars: Bar[] = [];
  const collectedIndices: number[] = [];

  series.forEachReverse((bar, index) => {
    collectedBars.push(bar);
    collectedIndices.push(index);
  });

  assert.strictEqual(collectedBars.length, 2);
  assert.strictEqual(collectedBars[0].close.toString(), '110');
  assert.strictEqual(collectedBars[1].close.toString(), '105');
  assert.deepStrictEqual(collectedIndices, [1, 0]);
});

test('BarSeries - filter method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const filteredBars = series.filter((bar) => bar.close.isGreaterThan(new Decimal('107')));
  assert.strictEqual(filteredBars.length, 1);
  assert.strictEqual(filteredBars[0].close.toString(), '110');
});

test('BarSeries - find method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const foundBar = series.find((bar) => bar.close.isEqualTo(new Decimal('110')));
  assert.strictEqual(foundBar?.close.toString(), '110');

  const notFoundBar = series.find((bar) => bar.close.isEqualTo(new Decimal('200')));
  assert.strictEqual(notFoundBar, null);
});

test('BarSeries - some method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const hasHighClose = series.some((bar) => bar.close.isGreaterThan(new Decimal('107')));
  assert.strictEqual(hasHighClose, true);

  const hasVeryHighClose = series.some((bar) => bar.close.isGreaterThan(new Decimal('200')));
  assert.strictEqual(hasVeryHighClose, false);
});

test('BarSeries - every method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);

  const allPositive = series.every((bar) => bar.close.isPositive());
  assert.strictEqual(allPositive, true);

  const allHigh = series.every((bar) => bar.close.isGreaterThan(new Decimal('107')));
  assert.strictEqual(allHigh, false);
});

test('BarSeries - events (on/off)', () => {
  const series = new BarSeries({ name: 'TestSeries' }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let barAddedEvent: any = null;

  const unsubscribe = series.on('barAdded', (event) => {
    barAddedEvent = event;
  });

  const bar = createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000);
  series.addBar(bar);

  assert.notStrictEqual(barAddedEvent, null);
  assert.strictEqual(barAddedEvent?.bar.close.toString(), '105');
  assert.strictEqual(barAddedEvent?.index, 0);

  // Test unsubscribe
  unsubscribe();
  barAddedEvent = null;

  const bar2 = createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200);
  series.addBar(bar2);

  assert.strictEqual(barAddedEvent, null);
});

test('BarSeries - setMaxCapacity method', () => {
  const series = new BarSeries({ name: 'TestSeries', maxCapacity: 2 }, []);

  const bar1 = createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000);
  const bar2 = createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200);
  const bar3 = createTestBar(new Date('2023-01-03'), 110, 120, 100, 115, 1300);

  series.addBar(bar1);
  series.addBar(bar2);
  series.addBar(bar3); // This should remove the first bar due to capacity limit

  assert.strictEqual(series.barCount, 2);
  // After removing the first bar due to capacity limit, we should have bar2 and bar3
  // With the current implementation, the beginIndex shifts when bars are removed
  assert.strictEqual(series.getBar(1)?.close.toString(), '110'); // bar2
  assert.strictEqual(series.getBar(2)?.close.toString(), '115'); // bar3
});

test('BarSeries - equals method', () => {
  const bars1 = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const bars2 = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const bars3 = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 110, 120, 100, 115, 1300), // Different close price
  ];

  const series1 = new BarSeries({ name: 'TestSeries1' }, bars1);
  const series2 = new BarSeries({ name: 'TestSeries2' }, bars2);
  const series3 = new BarSeries({ name: 'TestSeries3' }, bars3);

  assert.strictEqual(series1.equals(series2), true);
  assert.strictEqual(series1.equals(series3), false);
});

test('BarSeries - clone method', () => {
  const bars = [
    createTestBar(new Date('2023-01-01'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const cloned = series.clone();

  assert.strictEqual(cloned.name, 'TestSeries');
  assert.strictEqual(cloned.barCount, 2);
  assert.strictEqual(cloned.getBar(0)?.close.toString(), '105');
  assert.strictEqual(cloned.getBar(1)?.close.toString(), '110');
});

test('BarSeries - toJSON and fromJSON methods', () => {
  const bars = [
    createTestBar(new Date('2023-01-01T00:00:00.000Z'), 100, 110, 90, 105, 1000),
    createTestBar(new Date('2023-01-02T00:00:00.000Z'), 105, 115, 95, 110, 1200),
  ];

  const series = new BarSeries({ name: 'TestSeries' }, bars);
  const json = series.toJSON();

  assert.strictEqual(json.name, 'TestSeries');
  assert.ok(Array.isArray(json.bars));
  assert.strictEqual((json.bars as Array<unknown>).length, 2);

  const restored = BarSeries.fromJSON(json);
  assert.strictEqual(restored.name, 'TestSeries');
  assert.strictEqual(restored.barCount, 2);
  assert.strictEqual(restored.getBar(0)?.close.toString(), '105');
  assert.strictEqual(restored.getBar(1)?.close.toString(), '110');
});
