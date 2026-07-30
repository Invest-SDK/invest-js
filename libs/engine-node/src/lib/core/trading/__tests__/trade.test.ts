import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@t-tech/invest-shared';
import { Order, OrderType } from '../order';
import { Trade } from '../trade';

test('Trade class - constructor with entry order only (open trade)', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getEntry(), entryOrder);
  assert.strictEqual(trade.getExitOrder(), null);
  assert.strictEqual(trade.isOpened(), true);
  assert.strictEqual(trade.isClosed(), false);
});

test('Trade class - constructor with entry and exit orders (closed trade)', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  assert.strictEqual(trade.getEntry(), entryOrder);
  assert.strictEqual(trade.getExitOrder(), exitOrder);
  assert.strictEqual(trade.isOpened(), false);
  assert.strictEqual(trade.isClosed(), true);
});

test('Trade class - getType method for LONG trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getType(), 'LONG');
});

test('Trade class - getType method for SHORT trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getType(), 'SHORT');
});

test('Trade class - getEntryPrice method', () => {
  const entryPrice = new Decimal('100.50');
  const entryOrder = new Order(1, entryPrice, new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getEntryPrice().toString(), '100.5');
});

test('Trade class - getExitPrice method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getExitPrice(), null);
});

test('Trade class - getExitPrice method for closed trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitPrice = new Decimal('110.25');
  const exitOrder = new Order(2, exitPrice, new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  assert.strictEqual(trade.getExitPrice()?.toString(), '110.25');
});

test('Trade class - getAmount method', () => {
  const amount = new Decimal('10.5');
  const entryOrder = new Order(1, new Decimal('100'), amount, OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getAmount().toString(), '10.5');
});

test('Trade class - getEntryIndex method', () => {
  const entryIndex = 5;
  const entryOrder = new Order(entryIndex, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getEntryIndex(), entryIndex);
});

test('Trade class - getExitIndex method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getExitIndex(), null);
});

test('Trade class - getExitIndex method for closed trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitIndex = 3;
  const exitOrder = new Order(exitIndex, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  assert.strictEqual(trade.getExitIndex(), exitIndex);
});

test('Trade class - getEntryTime method', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY, entryTime);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getEntryTime().toISOString(), entryTime.toISOString());
});

test('Trade class - getExitTime method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getExitTime(), null);
});

test('Trade class - getExitTime method for closed trade', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const exitTime = new Date('2023-01-01T11:00:00Z');
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY, entryTime);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL, exitTime);
  const trade = new Trade(entryOrder, exitOrder);

  assert.strictEqual(trade.getExitTime()?.toISOString(), exitTime.toISOString());
});

test('Trade class - isLong method', () => {
  const buyOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const sellOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const longTrade = new Trade(buyOrder);
  const shortTrade = new Trade(sellOrder);

  assert.strictEqual(longTrade.isLong(), true);
  assert.strictEqual(shortTrade.isLong(), false);
});

test('Trade class - isShort method', () => {
  const buyOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const sellOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const longTrade = new Trade(buyOrder);
  const shortTrade = new Trade(sellOrder);

  assert.strictEqual(shortTrade.isShort(), true);
  assert.strictEqual(longTrade.isShort(), false);
});

test('Trade class - getProfit method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getProfit().toString(), '0');
});

test('Trade class - getProfit method for closed LONG trade (profitable)', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit = (110 - 100) * 10 = 100
  assert.strictEqual(trade.getProfit().toString(), '100');
});

test('Trade class - getProfit method for closed LONG trade (loss)', () => {
  const entryOrder = new Order(1, new Decimal('110'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit = (100 - 110) * 10 = -100
  assert.strictEqual(trade.getProfit().toString(), '-100');
});

test('Trade class - getProfit method for closed SHORT trade (profitable)', () => {
  const entryOrder = new Order(1, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const exitOrder = new Order(2, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit = (110 - 100) * 10 = 100
  assert.strictEqual(trade.getProfit().toString(), '100');
});

test('Trade class - getProfit method for closed SHORT trade (loss)', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit = (100 - 110) * 10 = -100
  assert.strictEqual(trade.getProfit().toString(), '-100');
});

test('Trade class - getProfit method with commissions', () => {
  // Create mock orders with commissions
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);

  // Mock getCommission method to return a specific value
  const entryOrderWithCommission = Object.create(entryOrder);
  entryOrderWithCommission.getCommission = () => new Decimal('0.5');

  const exitOrderWithCommission = Object.create(exitOrder);
  exitOrderWithCommission.getCommission = () => new Decimal('0.5');

  const trade = new Trade(entryOrderWithCommission, exitOrderWithCommission);

  // Profit = (110 - 100) * 10 - 0.5 - 0.5 = 100 - 1 = 99
  assert.strictEqual(trade.getProfit().toString(), '99');
});

test('Trade class - getProfitPercent method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getProfitPercent().toString(), '0');
});

test('Trade class - getProfitPercent method for closed trade (profitable)', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit percent = (100 / (100 * 10)) * 100 = (100 / 1000) * 100 = 10%
  assert.strictEqual(trade.getProfitPercent().toString(), '10');
});

test('Trade class - getProfitPercent method for closed trade (loss)', () => {
  const entryOrder = new Order(1, new Decimal('110'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('100'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Profit percent = (-100 / (110 * 10)) * 100 = (-100 / 1100) * 100 = -9.0909...%
  assert.strictEqual(trade.getProfitPercent().toString(), '-9.090909090909090909');
});

test('Trade class - getProfitPercent method with zero entry value', () => {
  // Create orders with valid prices and amounts
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('100'), new Decimal('10'), OrderType.SELL);

  // Mock getProfit method to return zero profit
  const mockedEntryOrder = Object.create(entryOrder);
  mockedEntryOrder.getPrice = () => new Decimal('0'); // This will make entryValue = 0 * 10 = 0

  const trade = new Trade(mockedEntryOrder, exitOrder);

  // Should return 0 when entry value is zero
  assert.strictEqual(trade.getProfitPercent().toString(), '0');
});

test('Trade class - getPoints method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getPoints().toString(), '0');
});

test('Trade class - getPoints method for closed LONG trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Points = 110 - 100 = 10
  assert.strictEqual(trade.getPoints().toString(), '10');
});

test('Trade class - getPoints method for closed SHORT trade', () => {
  const entryOrder = new Order(1, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const exitOrder = new Order(2, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder, exitOrder);

  // Points = 110 - 100 = 10
  assert.strictEqual(trade.getPoints().toString(), '10');
});

test('Trade class - getTotalValue method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  // Total value = 100 * 10 = 1000
  assert.strictEqual(trade.getTotalValue().toString(), '1000');
});

test('Trade class - getTotalValue method for closed trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Total value = (100 * 10) + (110 * 10) = 1000 + 1100 = 2100
  assert.strictEqual(trade.getTotalValue().toString(), '2100');
});

test('Trade class - getBarCount method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getBarCount(), 0);
});

test('Trade class - getBarCount method for closed trade', () => {
  const entryIndex = 3;
  const exitIndex = 7;
  const entryOrder = new Order(entryIndex, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(exitIndex, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  // Bar count = 7 - 3 = 4
  assert.strictEqual(trade.getBarCount(), 4);
});

test('Trade class - getDuration method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  assert.strictEqual(trade.getDuration(), null);
});

test('Trade class - getDuration method for closed trade', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const exitTime = new Date('2023-01-01T11:30:00Z');
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY, entryTime);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL, exitTime);
  const trade = new Trade(entryOrder, exitOrder);

  // Duration = 1.5 hours = 5400000 milliseconds
  assert.strictEqual(trade.getDuration(), 5400000);
});

test('Trade class - toString method for open trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const trade = new Trade(entryOrder);

  const result = trade.toString();
  assert.ok(result.includes('LONG'));
  assert.ok(result.includes('position OPEN'));
});

test('Trade class - toString method for closed profitable trade', () => {
  const entryOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const exitOrder = new Order(2, new Decimal('110'), new Decimal('10'), OrderType.SELL);
  const trade = new Trade(entryOrder, exitOrder);

  const result = trade.toString();
  assert.ok(result.includes('LONG'));
  assert.ok(result.includes('P&L: 100'));
  assert.ok(result.includes('(10%)'));
});
