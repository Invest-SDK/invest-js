import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@t-tech/invest-shared';
import { Order, OrderType } from '../order';
import { TradingRecord, PositionType } from '../trading-record';

test('TradingRecord class - constructor with default values', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.positionType, PositionType.LONG);
  assert.strictEqual(record.orderCount, 0);
  assert.strictEqual(record.tradeCount, 0);
  assert.strictEqual(record.positionCount, 0);
  assert.strictEqual(record.openPositionCount, 0);
  assert.strictEqual(record.currentOrder, null);
  assert.strictEqual(record.currentTrade, null);
  assert.deepStrictEqual(record.orders, []);
  assert.deepStrictEqual(record.trades, []);
});

test('TradingRecord class - constructor with custom values', () => {
  const record = new TradingRecord(PositionType.SHORT, 500);

  assert.strictEqual(record.positionType, PositionType.SHORT);
});

test('TradingRecord class - isOpened and isClosed methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.isOpened(), false);
  assert.strictEqual(record.isClosed(), false);

  // Add an order to make it opened
  const order = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  record.addOrder(order);

  assert.strictEqual(record.isOpened(), true);
  assert.strictEqual(record.isClosed(), false);
});

test('TradingRecord class - addOrder method for entry order', () => {
  const record = new TradingRecord();
  const order = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);

  record.addOrder(order);

  assert.strictEqual(record.orderCount, 1);
  assert.strictEqual(record.currentOrder, order);
  assert.strictEqual(record.orders.length, 1);
  assert.strictEqual(record.orders[0], order);
});

test('TradingRecord class - addOrder method for exit order (creating trade)', () => {
  const record = new TradingRecord();
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);

  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentOrder, null);
  assert.notStrictEqual(record.currentTrade, null);
  assert.strictEqual(record.trades.length, 1);

  const trade = record.trades[0];
  assert.strictEqual(trade.getEntry(), entryOrder);
  assert.strictEqual(trade.getExitOrder(), exitOrder);

  // After marking trade as closed, currentTrade should be null
  record.markTradeClosed();
  assert.strictEqual(record.currentTrade, null);
});

test('TradingRecord class - entry and exit methods', () => {
  const record = new TradingRecord();
  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('110');
  const amount = new Decimal('10');

  record.entry(1, entryPrice, amount);
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentOrder, null);
  assert.notStrictEqual(record.currentTrade, null);

  const lastOrder = record.getLastOrder();
  assert.ok(lastOrder);
  assert.strictEqual(lastOrder?.getType(), OrderType.SELL);
  assert.strictEqual(lastOrder?.getPrice().toString(), '110');
});

test('TradingRecord class - getLastTrade method', () => {
  const record = new TradingRecord();
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);

  assert.strictEqual(record.getLastTrade(), null);

  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  const lastTrade = record.getLastTrade();
  assert.ok(lastTrade);
  assert.strictEqual(lastTrade?.getEntry(), entryOrder);
  assert.strictEqual(lastTrade?.getExitOrder(), exitOrder);
});

test('TradingRecord class - getPenultimateTrade method', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getPenultimateTrade(), null);

  // Add first trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  assert.strictEqual(record.getPenultimateTrade(), null);

  // Add second trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('130'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  const penultimateTrade = record.getPenultimateTrade();
  assert.ok(penultimateTrade);
  assert.strictEqual(penultimateTrade?.getEntry(), entryOrder1);
  assert.strictEqual(penultimateTrade?.getExitOrder(), exitOrder1);
});

test('TradingRecord class - getLastOrder method', () => {
  const record = new TradingRecord();
  const order = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);

  assert.strictEqual(record.getLastOrder(), null);

  record.addOrder(order);
  assert.strictEqual(record.getLastOrder(), order);
});

test('TradingRecord class - getLastTradeProfit method', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getLastTradeProfit(), null);

  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  const profit = record.getLastTradeProfit();
  assert.ok(profit);
  assert.strictEqual(profit?.toString(), '100');
});

test('TradingRecord class - getEntry and getExit methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getEntry(), null);
  assert.strictEqual(record.getExit(), null);

  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  record.addOrder(entryOrder);

  assert.strictEqual(record.getEntry()?.toString(), '100');
  assert.strictEqual(record.getExit(), null);

  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(exitOrder);

  assert.strictEqual(record.getEntry(), null);
  assert.strictEqual(record.getExit(), null); // Exit is only available through trades
});

test('TradingRecord class - getGrossProfit method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getGrossProfit().toString(), '0');

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Gross profit should be 100 (only the profitable trade)
  assert.strictEqual(record.getGrossProfit().toString(), '100');
});

test('TradingRecord class - getGrossLoss method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getGrossLoss().toString(), '0');

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Gross loss should be 100 (absolute value of the loss)
  assert.strictEqual(record.getGrossLoss().toString(), '100');
});

test('TradingRecord class - getNetProfit method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getNetProfit().toString(), '0');

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Net profit should be 100 - 100 = 0
  assert.strictEqual(record.getNetProfit().toString(), '0');
});

test('TradingRecord class - getProfitFactor method', () => {
  const record = new TradingRecord();

  // Initially null (no losses)
  assert.strictEqual(record.getProfitFactor(), null);

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Still null because no losses
  assert.strictEqual(record.getProfitFactor(), null);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Profit factor should be 100 / 100 = 1
  assert.strictEqual(record.getProfitFactor()?.toString(), '1');
});

test('TradingRecord class - getWinningTradeCount and getLosingTradeCount methods', () => {
  const record = new TradingRecord();

  assert.strictEqual(record.getWinningTradeCount(), 0);
  assert.strictEqual(record.getLosingTradeCount(), 0);

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  assert.strictEqual(record.getWinningTradeCount(), 1);
  assert.strictEqual(record.getLosingTradeCount(), 1);
});

test('TradingRecord class - getWinRate method', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getWinRate().toString(), '0');

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Win rate should be 100% (1/1)
  assert.strictEqual(record.getWinRate().toString(), '1');

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Win rate should be 50% (1/2)
  assert.strictEqual(record.getWinRate().toString(), '0.5');
});

test('TradingRecord class - calculateProfitLoss method', () => {
  const record = new TradingRecord();

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  const pl = record.calculateProfitLoss();

  assert.strictEqual(pl.grossProfit.toString(), '100');
  assert.strictEqual(pl.grossLoss.toString(), '100');
  assert.strictEqual(pl.netProfit.toString(), '0');
  assert.strictEqual(pl.profitFactor?.toString(), '1');
  assert.strictEqual(pl.winningTrades, 1);
  assert.strictEqual(pl.losingTrades, 1);
  assert.strictEqual(pl.winRate.toString(), '0.5');
});

test('TradingRecord class - getAverageWinningTrade and getAverageLosingTrade methods', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getAverageWinningTrade().toString(), '0');
  assert.strictEqual(record.getAverageLosingTrade().toString(), '0');

  // Add a profitable trade (profit: 100)
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Average winning should be 100
  assert.strictEqual(record.getAverageWinningTrade().toString(), '100');

  // Add another profitable trade (profit: 200)
  const entryOrder2 = new Order(3, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('120'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Average winning should be (100 + 200) / 2 = 150
  assert.strictEqual(record.getAverageWinningTrade().toString(), '150');

  // Add a loss trade (loss: 100)
  const entryOrder3 = new Order(5, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder3 = new Order(6, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder3);
  record.addOrder(exitOrder3);

  // Average losing should be 100
  assert.strictEqual(record.getAverageLosingTrade().toString(), '100');
});

test('TradingRecord class - getAverageWinLossRatio method', () => {
  const record = new TradingRecord();

  // Initially null (no trades)
  assert.strictEqual(record.getAverageWinLossRatio(), null);

  // Add a profitable trade (profit: 100)
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Still null (no losing trades)
  assert.strictEqual(record.getAverageWinLossRatio(), null);

  // Add a loss trade (loss: 50)
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('115'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Ratio should be 100 / 50 = 2
  assert.strictEqual(record.getAverageWinLossRatio()?.toString(), '2');
});

test('TradingRecord class - getMaxProfit and getMaxLoss methods', () => {
  const record = new TradingRecord();

  // Initially zero
  assert.strictEqual(record.getMaxProfit().toString(), '0');
  assert.strictEqual(record.getMaxLoss().toString(), '0');

  // Add a small profit trade (profit: 50)
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('105'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a large profit trade (profit: 200)
  const entryOrder2 = new Order(3, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('120'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  // Add a loss trade (loss: 100)
  const entryOrder3 = new Order(5, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder3 = new Order(6, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder3);
  record.addOrder(exitOrder3);

  // Max profit should be 200, max loss should be 100
  assert.strictEqual(record.getMaxProfit().toString(), '200');
  assert.strictEqual(record.getMaxLoss().toString(), '100');
});

test('TradingRecord class - getClosedTrades method', () => {
  const record = new TradingRecord();

  // Initially empty
  assert.deepStrictEqual(record.getClosedTrades(), []);

  // Add a closed trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add an open trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  record.addOrder(entryOrder2);

  const closedTrades = record.getClosedTrades();
  assert.strictEqual(closedTrades.length, 1);
  assert.strictEqual(closedTrades[0].getEntry(), entryOrder1);
});

test('TradingRecord class - getTradeProfits method', () => {
  const record = new TradingRecord();

  // Initially empty
  assert.deepStrictEqual(record.getTradeProfits(), []);

  // Add a profitable trade (profit: 100)
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade (loss: 50)
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('115'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  const profits = record.getTradeProfits();
  assert.strictEqual(profits.length, 2);
  assert.strictEqual(profits[0].toString(), '100');
  assert.strictEqual(profits[1].toString(), '-50');
});

test('TradingRecord class - getSummary method', () => {
  const record = new TradingRecord();

  // Add a profitable trade
  const entryOrder1 = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder1 = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder1);
  record.addOrder(exitOrder1);

  // Add a loss trade
  const entryOrder2 = new Order(3, new Decimal('120'), new Decimal('10'), OrderType.BUY);
  const exitOrder2 = new Order(4, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder2);
  record.addOrder(exitOrder2);

  const summary = record.getSummary();

  assert.strictEqual(summary.tradeCount, 2);
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
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);

  record.clear();

  assert.strictEqual(record.orderCount, 0);
  assert.strictEqual(record.tradeCount, 0);
  assert.strictEqual(record.currentOrder, null);
  assert.strictEqual(record.currentTrade, null);
  assert.deepStrictEqual(record.orders, []);
  assert.deepStrictEqual(record.trades, []);
});

test('TradingRecord class - clone method', () => {
  const record = new TradingRecord(PositionType.SHORT, 500);

  // Add some data - for SHORT position: SELL = entry, BUY = exit
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const exitOrder = new Order(2, new Decimal('90'), new Decimal('10'), OrderType.BUY);
  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  const cloned = record.clone();

  assert.strictEqual(cloned.positionType, PositionType.SHORT);
  assert.strictEqual(cloned.orderCount, 2);
  assert.strictEqual(cloned.tradeCount, 1);
  assert.notStrictEqual(cloned, record); // Different instances
  assert.notStrictEqual(cloned.orders, record.orders); // Different arrays
  assert.notStrictEqual(cloned.trades, record.trades); // Different arrays
});

test('TradingRecord class - SHORT position handling', () => {
  const record = new TradingRecord(PositionType.SHORT);

  // For SHORT positions: SELL = entry, BUY = exit
  const entryPrice = new Decimal('100');
  const exitPrice = new Decimal('90');
  const amount = new Decimal('10');

  // Add entry order (SELL for SHORT position)
  record.entry(1, entryPrice, amount);

  // Add exit order (BUY for SHORT position)
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentOrder, null);

  const lastTrade = record.getLastTrade();
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

  // Add entry order (SELL for SHORT position)
  record.entry(1, entryPrice, amount);

  // Add exit order (BUY for SHORT position)
  record.exit(2, exitPrice, amount);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);

  const lastTrade = record.getLastTrade();
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

  // Add entry order with commission
  record.entry(1, entryPrice, amount, entryCommission);

  // Add exit order with commission
  record.exit(2, exitPrice, amount, exitCommission);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);

  const lastTrade = record.getLastTrade();
  assert.ok(lastTrade);

  // For SHORT position: profit = (entry_price - exit_price) * amount - commissions
  // profit = (100 - 90) * 10 - 0.5 - 0.5 = 100 - 1 = 99
  assert.strictEqual(lastTrade?.getProfit().toString(), '99');
});

test('TradingRecord class - addOrder method for SHORT position entry', () => {
  const record = new TradingRecord(PositionType.SHORT);
  const order = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);

  record.addOrder(order);

  assert.strictEqual(record.orderCount, 1);
  assert.strictEqual(record.currentOrder, order);
});

test('TradingRecord class - addOrder method for SHORT position exit (creating trade)', () => {
  const record = new TradingRecord(PositionType.SHORT);
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const exitOrder = new Order(2, new Decimal('90'), new Decimal('10'), OrderType.BUY);

  record.addOrder(entryOrder);
  record.addOrder(exitOrder);

  assert.strictEqual(record.orderCount, 2);
  assert.strictEqual(record.tradeCount, 1);
  assert.strictEqual(record.currentOrder, null);
  assert.notStrictEqual(record.currentTrade, null);
  assert.strictEqual(record.trades.length, 1);

  const trade = record.trades[0];
  assert.strictEqual(trade.getEntry(), entryOrder);
  assert.strictEqual(trade.getExitOrder(), exitOrder);
  assert.strictEqual(trade.isShort(), true);

  // Profit for SHORT: (100 - 90) * 10 = 100
  assert.strictEqual(trade.getProfit().toString(), '100');
});
