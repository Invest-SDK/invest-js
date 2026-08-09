/**
 * Synthetic fixture bars — prices are intentionally crafted so that a
 * close-vs-SMA(3) crossover happens at known indices.
 *
 * Prices: 10,11,12,13,14,15,14,13,12,11,10,11,12,13,14,15,14,13,12,11
 *         ↑ rising leg crosses SMA up    ↑ falling leg crosses SMA down
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { ClosePriceIndicator } from '../../indicators/price-indicators';
import { SMAIndicator } from '../../indicators/moving-average-indicators';
import { CrossedUpIndicatorRule, CrossedDownIndicatorRule } from '../../rules/comparison-rules';
import { FixedRule } from '../../rules/boolean-rules';
import { StopLossRule, TrailingStopRule } from '../../rules/trading-rules';
import { FixedBpsSlippageModel } from '../../slippage/slippage-model';
import { FixedTransactionCostModel } from '../../cost/cost-model';
import { BaseStrategy } from '../strategy';
import { BarSeriesManager } from '../bar-series-manager';
import { PositionType } from '../../trading/trading-record';

/** Build a Bar with optional range; defaults to close = open = high = low. */
function makeBar(close: number, t: number, low = close, high = close): Bar {
  const p = new Decimal(close.toString());
  return new Bar({
    time: new Date(t * 1000),
    open: p,
    high: new Decimal(high.toString()),
    low: new Decimal(low.toString()),
    close: p,
    volume: new Decimal('100'),
  });
}

function buildSeries(): BarSeries {
  const closes = [10, 11, 12, 13, 14, 15, 14, 13, 12, 11, 10, 11, 12, 13, 14, 15, 14, 13, 12, 11];
  const bars = closes.map((c, i) => makeBar(c, i + 1));
  return new BarSeries({ name: 'fixture' }, bars);
}

test('BarSeriesManager - run returns a TradingRecord', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy);
  assert.ok(record, 'record must be returned');
});

test('BarSeriesManager - at least one completed position produced', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy);
  assert.ok(record.positionCount >= 1, `expected >= 1 position, got ${record.positionCount}`);
});

test('BarSeriesManager - all positions except possibly last are closed', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy);
  const positions = record.positions;

  // All positions stored in the record are already closed (entry+exit pairs).
  // An unclosed position means the record is still "opened" (currentTrade != null).
  for (const pos of positions) {
    assert.ok(pos.isClosed(), 'stored position must be closed');
  }
});

test('BarSeriesManager - netProfit is a Decimal', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy);
  const netProfit = record.getNetProfit();
  assert.ok(netProfit instanceof Decimal, 'netProfit should be a Decimal');
  // Not asserting sign — just that it computed without error
});

test('BarSeriesManager - respects startIndex / endIndex options', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 0);

  // Run only on the first 5 bars — too few bars for SMA(3) to fire a cross
  const record = new BarSeriesManager(series).run(strategy, {
    startIndex: 0,
    endIndex: 2,
  });
  // With only 3 bars and index 0 SMA(3) needs index>=2 to be ready, crossup at 0 impossible
  assert.strictEqual(record.positionCount, 0, 'no positions in tiny window');
});

test('BarSeriesManager - respects PositionType SHORT', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  // For short: entry on cross-down, exit on cross-up
  const entry = new CrossedDownIndicatorRule(close, sma);
  const exit = new CrossedUpIndicatorRule(close, sma);
  const strategy = new BaseStrategy('short-cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy, {
    positionType: PositionType.SHORT,
  });
  assert.strictEqual(record.positionType, PositionType.SHORT);
});

test('BarSeriesManager - commission is applied to trades', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const commission = new Decimal('1');
  const record = new BarSeriesManager(series).run(strategy, {
    transactionCostPerTrade: commission,
  });

  // Each filled trade should carry the commission
  for (const trade of record.trades) {
    assert.ok(trade.getCommission().isEqualTo(commission), 'trade commission should be set');
  }
});

test('BarSeriesManager - records the bar time on trades', () => {
  const series = buildSeries();
  const close = new ClosePriceIndicator(series);
  const sma = new SMAIndicator(close, 3);
  const entry = new CrossedUpIndicatorRule(close, sma);
  const exit = new CrossedDownIndicatorRule(close, sma);
  const strategy = new BaseStrategy('cross', entry, exit, 3);

  const record = new BarSeriesManager(series).run(strategy);

  assert.ok(record.trades.length > 0, 'expected at least one trade');
  for (const trade of record.trades) {
    assert.strictEqual(trade.getTime().getTime(), series.getBar(trade.getIndex())?.time.getTime());
  }
});

test('BarSeriesManager - getSeries returns the original series', () => {
  const series = buildSeries();
  const mgr = new BarSeriesManager(series);
  assert.strictEqual(mgr.getSeries(), series);
});

test('BarSeriesManager - intrabar stop breach cannot close at a profitable close', () => {
  const series = new BarSeries({ name: 'stop-recovery' }, [
    makeBar(100, 1),
    makeBar(105, 2, 90, 110),
  ]);
  const strategy = new BaseStrategy(
    'stop-recovery',
    new FixedRule(0),
    new StopLossRule(series, new Decimal('5'))
  );

  const record = new BarSeriesManager(series).run(strategy);

  assert.strictEqual(
    record.getNetProfit().toString(),
    '0',
    `intrabar breach must not close at +5; got ${record.getNetProfit().toString()}`
  );
  assert.strictEqual(record.isOpened(), true);
  assert.strictEqual(record.positionCount, 0);
});

test('BarSeriesManager - stop exit keeps close slippage and commission models', () => {
  const series = new BarSeries({ name: 'stop-execution' }, [makeBar(100, 1), makeBar(95, 2)]);
  const strategy = new BaseStrategy(
    'stop-execution',
    new FixedRule(0),
    new StopLossRule(series, new Decimal('5'))
  );

  const record = new BarSeriesManager(series).run(strategy, {
    slippageModel: new FixedBpsSlippageModel(new Decimal('100')),
    transactionCostModel: new FixedTransactionCostModel(new Decimal('1')),
  });
  const position = record.positions[0];

  assert.ok(position);
  assert.strictEqual(position.getEntryPrice().toString(), '101');
  assert.strictEqual(position.getExitPrice()?.toString(), '94.05');
  assert.strictEqual(position.getEntry().getCommission().toString(), '1');
  assert.strictEqual(position.getExitTrade()?.getCommission().toString(), '1');
  assert.strictEqual(position.getProfit().toString(), '-8.95');
});

test('BarSeriesManager - trailing stop preserves the entry-bar high watermark', () => {
  const series = new BarSeries({ name: 'trailing-entry-high' }, [
    makeBar(100, 1, 100, 200),
    makeBar(185, 2),
    makeBar(180, 3),
  ]);
  const strategy = new BaseStrategy(
    'trailing-entry-high',
    new FixedRule(0),
    new TrailingStopRule(series, new Decimal('10'))
  );

  const record = new BarSeriesManager(series).run(strategy);

  assert.strictEqual(record.positionCount, 1);
  assert.strictEqual(record.positions[0]?.getExitIndex(), 2);
});

test('BarSeriesManager - startIndex reuses available warm-up history', () => {
  const series = buildSeries();
  const strategy = new BaseStrategy('range', new FixedRule(10), new FixedRule(), 5);

  const record = new BarSeriesManager(series).run(strategy, { startIndex: 10, endIndex: 10 });

  assert.strictEqual(record.currentTrade?.getIndex(), 10);
});

test('BarSeriesManager - evicted history still delays signals from beginIndex', () => {
  const series = new BarSeries({ name: 'evicted', maxCapacity: 6 }, []);
  for (let index = 0; index <= 15; index++) {
    series.addBar(makeBar(100 + index, index + 1));
  }
  assert.strictEqual(series.beginIndex, 10);
  const strategy = new BaseStrategy('range', new FixedRule(10, 15), new FixedRule(), 5);

  const record = new BarSeriesManager(series).run(strategy);

  assert.strictEqual(record.currentTrade?.getIndex(), 15);
});
