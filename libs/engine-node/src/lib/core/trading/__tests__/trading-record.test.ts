import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Trade, TradeType } from '../trade';
import { TradingRecord, PositionType } from '../trading-record';

test('TradingRecord class - constructor with default values', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.positionType, PositionType.LONG);
  assert.strictEqual(record.tradeCount, 0);
  assert.strictEqual(record.positionCount, 0);
  assert.strictEqual(record.positionCount, 0);
  assert.strictEqual(record.openPositionCount, 0);
  assert.strictEqual(record.currentTrade, null);
  assert.strictEqual(record.currentPosition, null);
  assert.deepStrictEqual(record.trades, []);
  assert.deepStrictEqual(record.positions, []);
});

test('TradingRecord class - constructor with custom values', () => {
  const record = new TradingRecord(PositionType.SHORT, 500);

  assert.strictEqual(record.positionType, PositionType.SHORT);
});

test('TradingRecord class - isOpened and isClosed methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.isOpened(), false);
  assert.strictEqual(record.isClosed(), false);

  // Add an trade to make it opened
  const trade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  record.addTrade(trade);

  assert.strictEqual(record.isOpened(), true);
  assert.strictEqual(record.isClosed(), false);
});

test('TradingRecord class - addTrade method for entry trade', () => {
  const record = new TradingRecord();
  const trade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);

  record.addTrade(trade);

  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentTrade, trade);
  assert.strictEqual(record.trades.length, 1);
  assert.strictEqual(record.trades[0], trade);
});

test('TradingRecord class - addTrade method for exit trade (creating position)', () => {
  const record = new TradingRecord();
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);

  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);
  assert.strictEqual(record.currentTrade, null);
  // После закрытия пары currentPosition сбрасывается автоматически —
  // вызов markPositionClosed больше не требуется.
  assert.strictEqual(record.currentPosition, null);
  assert.strictEqual(record.isOpened(), false);
  assert.strictEqual(record.positions.length, 1);

  const position = record.positions[0];
  assert.strictEqual(position.getEntry(), entryTrade);
  assert.strictEqual(position.getExitTrade(), exitTrade);

  // markPositionClosed остаётся как no-op для обратной совместимости.
  record.markPositionClosed();
  assert.strictEqual(record.currentPosition, null);
});

test('TradingRecord class - entry and exit methods', () => {
  const record = new TradingRecord();
  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('110');
  const amount = new Decimal('10');

  record.entry(1, entryPrice, amount);
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);
  assert.strictEqual(record.currentTrade, null);
  // currentPosition автоматически сбрасывается после закрытия сделки.
  assert.strictEqual(record.currentPosition, null);

  const lastTrade = record.getLastTrade();
  assert.ok(lastTrade);
  assert.strictEqual(lastTrade?.getType(), TradeType.SELL);
  assert.strictEqual(lastTrade?.getPrice().toString(), '110');
});

test('TradingRecord class - getLastPosition method', () => {
  const record = new TradingRecord();
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);

  assert.strictEqual(record.getLastPosition(), null);

  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  const lastTrade = record.getLastPosition();
  assert.ok(lastTrade);
  assert.strictEqual(lastTrade?.getEntry(), entryTrade);
  assert.strictEqual(lastTrade?.getExitTrade(), exitTrade);
});

test('TradingRecord class - getPenultimatePosition method', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getPenultimatePosition(), null);

  // Add first position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  assert.strictEqual(record.getPenultimatePosition(), null);

  // Add second position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('130'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  const penultimateTrade = record.getPenultimatePosition();
  assert.ok(penultimateTrade);
  assert.strictEqual(penultimateTrade?.getEntry(), entryTrade1);
  assert.strictEqual(penultimateTrade?.getExitTrade(), exitTrade1);
});

test('TradingRecord class - getLastTrade method', () => {
  const record = new TradingRecord();
  const trade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);

  assert.strictEqual(record.getLastTrade(), null);

  record.addTrade(trade);
  assert.strictEqual(record.getLastTrade(), trade);
});

test('TradingRecord class - getLastPositionProfit method', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getLastPositionProfit(), null);

  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  const profit = record.getLastPositionProfit();
  assert.ok(profit);
  assert.strictEqual(profit?.toString(), '100');
});

test('TradingRecord class - getEntry and getExit methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getEntry(), null);
  assert.strictEqual(record.getExit(), null);

  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  record.addTrade(entryTrade);

  assert.strictEqual(record.getEntry()?.toString(), '100');
  assert.strictEqual(record.getExit(), null);

  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(exitTrade);

  assert.strictEqual(record.getEntry(), null);
  assert.strictEqual(record.getExit(), null); // Exit is only available through positions
});

test('TradingRecord class - getGrossProfit method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getGrossProfit().toString(), '0');

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Gross profit should be 100 (only the profitable position)
  assert.strictEqual(record.getGrossProfit().toString(), '100');
});

test('TradingRecord class - getGrossLoss method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getGrossLoss().toString(), '0');

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Gross loss should be 100 (absolute value of the loss)
  assert.strictEqual(record.getGrossLoss().toString(), '100');
});

test('TradingRecord class - getNetProfit method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getNetProfit().toString(), '0');

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Net profit should be 100 - 100 = 0
  assert.strictEqual(record.getNetProfit().toString(), '0');
});

test('TradingRecord class - getProfitFactor method', () => {
  const record = new TradingRecord();

  // Initially null (no losses)
  assert.strictEqual(record.getProfitFactor(), null);

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Still null because no losses
  assert.strictEqual(record.getProfitFactor(), null);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Profit factor should be 100 / 100 = 1
  assert.strictEqual(record.getProfitFactor()?.toString(), '1');
});

test('TradingRecord class - getWinningPositionCount and getLosingPositionCount methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getWinningPositionCount(), 0);
  assert.strictEqual(record.getLosingPositionCount(), 0);

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  assert.strictEqual(record.getWinningPositionCount(), 1);
  assert.strictEqual(record.getLosingPositionCount(), 1);
});

test('TradingRecord class - getWinRate method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getWinRate().toString(), '0');

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Win rate should be 100% (1/1)
  assert.strictEqual(record.getWinRate().toString(), '1');

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Win rate should be 50% (1/2)
  assert.strictEqual(record.getWinRate().toString(), '0.5');
});

test('TradingRecord class - calculateProfitLoss method', () => {
  const record = new TradingRecord();

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  const pl = record.calculateProfitLoss();

  assert.strictEqual(pl.grossProfit.toString(), '100');
  assert.strictEqual(pl.grossLoss.toString(), '100');
  assert.strictEqual(pl.netProfit.toString(), '0');
  assert.strictEqual(pl.profitFactor?.toString(), '1');
  assert.strictEqual(pl.winningTrades, 1);
  assert.strictEqual(pl.losingTrades, 1);
  assert.strictEqual(pl.winRate.toString(), '0.5');
});

test('TradingRecord class - getAverageWinningPosition and getAverageLosingPosition methods', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getAverageWinningPosition().toString(), '0');
  assert.strictEqual(record.getAverageLosingPosition().toString(), '0');

  // Add a profitable position (profit: 100)
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Average winning should be 100
  assert.strictEqual(record.getAverageWinningPosition().toString(), '100');

  // Add another profitable position (profit: 200)
  const entryTrade2 = new Trade(3, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('120'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Average winning should be (100 + 200) / 2 = 150
  assert.strictEqual(record.getAverageWinningPosition().toString(), '150');

  // Add a loss position (loss: 100)
  const entryTrade3 = new Trade(5, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade3 = new Trade(6, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade3);
  record.addTrade(exitTrade3);

  // Average losing should be 100
  assert.strictEqual(record.getAverageLosingPosition().toString(), '100');
});

test('TradingRecord class - getAverageWinLossRatio method', () => {
  const record = new TradingRecord();

  // Initially null (no positions)
  assert.strictEqual(record.getAverageWinLossRatio(), null);

  // Add a profitable position (profit: 100)
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Still null (no losing positions)
  assert.strictEqual(record.getAverageWinLossRatio(), null);

  // Add a loss position (loss: 50)
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('115'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Ratio should be 100 / 50 = 2
  assert.strictEqual(record.getAverageWinLossRatio()?.toString(), '2');
});

test('TradingRecord class - getMaxProfit and getMaxLoss methods', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getMaxProfit().toString(), '0');
  assert.strictEqual(record.getMaxLoss().toString(), '0');

  // Add a small profit position (profit: 50)
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('105'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a large profit position (profit: 200)
  const entryTrade2 = new Trade(3, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('120'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  // Add a loss position (loss: 100)
  const entryTrade3 = new Trade(5, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade3 = new Trade(6, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade3);
  record.addTrade(exitTrade3);

  // Max profit should be 200, max loss should be 100
  assert.strictEqual(record.getMaxProfit().toString(), '200');
  assert.strictEqual(record.getMaxLoss().toString(), '100');
});

test('TradingRecord class - getClosedPositions method', () => {
  const record = new TradingRecord();

  // Initially empty
  assert.deepStrictEqual(record.getClosedPositions(), []);

  // Add a closed position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add an open position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  record.addTrade(entryTrade2);

  const closedTrades = record.getClosedPositions();
  assert.strictEqual(closedTrades.length, 1);
  assert.strictEqual(closedTrades[0].getEntry(), entryTrade1);
});

test('TradingRecord class - getPositionProfits method', () => {
  const record = new TradingRecord();

  // Initially empty
  assert.deepStrictEqual(record.getPositionProfits(), []);

  // Add a profitable position (profit: 100)
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position (loss: 50)
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('115'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  const profits = record.getPositionProfits();
  assert.strictEqual(profits.length, 2);
  assert.strictEqual(profits[0].toString(), '100');
  assert.strictEqual(profits[1].toString(), '-50');
});

test('TradingRecord class - getSummary method', () => {
  const record = new TradingRecord();

  // Add a profitable position
  const entryTrade1 = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade1 = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade1);
  record.addTrade(exitTrade1);

  // Add a loss position
  const entryTrade2 = new Trade(3, new Decimal('120'), new Decimal('10'), TradeType.BUY);
  const exitTrade2 = new Trade(4, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade2);
  record.addTrade(exitTrade2);

  const summary = record.getSummary();

  assert.strictEqual(summary.positionCount, 2);
  assert.strictEqual(summary.positionCount, 2);
  assert.strictEqual(summary.winningTrades, 1);
  assert.strictEqual(summary.losingTrades, 1);
  assert.strictEqual(summary.grossProfit, '100');
  assert.strictEqual(summary.grossLoss, '100');
  assert.strictEqual(summary.netProfit, '0');
  assert.strictEqual(summary.averageWin, '100');
  assert.strictEqual(summary.averageLoss, '100');
  assert.strictEqual(summary.maxProfit, '100');
  assert.strictEqual(summary.maxLoss, '100');
});

test('TradingRecord class - clear method', () => {
  const record = new TradingRecord();

  // Add some data
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);

  record.clear();

  assert.strictEqual(record.tradeCount, 0);
  assert.strictEqual(record.positionCount, 0);
  assert.strictEqual(record.currentTrade, null);
  assert.strictEqual(record.currentPosition, null);
  assert.deepStrictEqual(record.trades, []);
  assert.deepStrictEqual(record.positions, []);
});

test('TradingRecord class - clone method', () => {
  const record = new TradingRecord(PositionType.SHORT, 500);

  // Add some data - for SHORT position: SELL = entry, BUY = exit
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const exitTrade = new Trade(2, new Decimal('90'), new Decimal('10'), TradeType.BUY);
  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  const cloned = record.clone();

  assert.strictEqual(cloned.positionType, PositionType.SHORT);
  assert.strictEqual(cloned.tradeCount, 2);
  assert.strictEqual(cloned.positionCount, 1);
  assert.notStrictEqual(cloned, record); // Different instances
  assert.notStrictEqual(cloned.trades, record.trades); // Different arrays
  assert.notStrictEqual(cloned.positions, record.positions); // Different arrays
});

test('TradingRecord class - SHORT position handling', () => {
  const record = new TradingRecord(PositionType.SHORT);

  // For SHORT positions: SELL = entry, BUY = exit
  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('90');
  const amount = new Decimal('10');

  // Add entry trade (SELL for SHORT position)
  record.entry(1, entryPrice, amount);

  // Add exit trade (BUY for SHORT position)
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);
  assert.strictEqual(record.currentTrade, null);

  const lastTrade = record.getLastPosition();
  assert.ok(lastTrade);
  assert.strictEqual(lastTrade?.isShort(), true);
  assert.strictEqual(lastTrade?.getEntryPrice().toString(), '100');
  assert.strictEqual(lastTrade?.getExitPrice()?.toString(), '90');

  // For SHORT position: profit = (entry_price - exit_price) * amount
  // profit = (100 - 90) * 10 = 100
  assert.strictEqual(lastTrade?.getProfit().toString(), '100');
});

test('TradingRecord class - SHORT position with loss', () => {
  const record = new TradingRecord(PositionType.SHORT);

  // For SHORT positions: SELL = entry, BUY = exit
  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('110');
  const amount = new Decimal('10');

  // Add entry trade (SELL for SHORT position)
  record.entry(1, entryPrice, amount);

  // Add exit trade (BUY for SHORT position)
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);

  const lastTrade = record.getLastPosition();
  assert.ok(lastTrade);
  assert.strictEqual(lastTrade?.isShort(), true);

  // For SHORT position: profit = (entry_price - exit_price) * amount
  // profit = (100 - 110) * 10 = -100 (loss)
  assert.strictEqual(lastTrade?.getProfit().toString(), '-100');
});

test('TradingRecord class - SHORT position with commissions', () => {
  const record = new TradingRecord(PositionType.SHORT);

  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('90');
  const amount = new Decimal('10');
  const entryCommission = new Decimal('0.5');
  const exitCommission = new Decimal('0.5');

  // Add entry trade with commission
  record.entry(1, entryPrice, amount, entryCommission);

  // Add exit trade with commission
  record.exit(2, exitPrice, amount, exitCommission);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);

  const lastTrade = record.getLastPosition();
  assert.ok(lastTrade);

  // For SHORT position: profit = (entry_price - exit_price) * amount - commissions
  // profit = (100 - 90) * 10 - 0.5 - 0.5 = 100 - 1 = 99
  assert.strictEqual(lastTrade?.getProfit().toString(), '99');
});

test('TradingRecord class - addTrade method for SHORT position entry', () => {
  const record = new TradingRecord(PositionType.SHORT);
  const trade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);

  record.addTrade(trade);

  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentTrade, trade);
});

test('TradingRecord class - addTrade method for SHORT position exit (creating position)', () => {
  const record = new TradingRecord(PositionType.SHORT);
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const exitTrade = new Trade(2, new Decimal('90'), new Decimal('10'), TradeType.BUY);

  record.addTrade(entryTrade);
  record.addTrade(exitTrade);

  assert.strictEqual(record.tradeCount, 2);
  assert.strictEqual(record.positionCount, 1);
  assert.strictEqual(record.currentTrade, null);
  assert.strictEqual(record.currentPosition, null);
  assert.strictEqual(record.positions.length, 1);

  const position = record.positions[0];
  assert.strictEqual(position.getEntry(), entryTrade);
  assert.strictEqual(position.getExitTrade(), exitTrade);
  assert.strictEqual(position.isShort(), true);

  // Profit for SHORT: (100 - 90) * 10 = 100
  assert.strictEqual(position.getProfit().toString(), '100');
});
