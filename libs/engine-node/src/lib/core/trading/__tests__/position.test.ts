import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Trade, TradeType } from '../trade';
import { Position } from '../position';

test('Position class - constructor with entry trade only (open position)', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getEntry(), entryTrade);
  assert.strictEqual(position.getExitTrade(), null);
  assert.strictEqual(position.isOpened(), true);
  assert.strictEqual(position.isClosed(), false);
});

test('Position class - constructor with entry and exit trades (closed position)', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  assert.strictEqual(position.getEntry(), entryTrade);
  assert.strictEqual(position.getExitTrade(), exitTrade);
  assert.strictEqual(position.isOpened(), false);
  assert.strictEqual(position.isClosed(), true);
});

test('Position class - getType method for LONG position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getType(), 'LONG');
});

test('Position class - getType method for SHORT position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getType(), 'SHORT');
});

test('Position class - getEntryPrice method', () => {
  const entryPrice = new Decimal('100.50');
  const entryTrade = new Trade(1, entryPrice, new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getEntryPrice().toString(), '100.5');
});

test('Position class - getExitPrice method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getExitPrice(), null);
});

test('Position class - getExitPrice method for closed position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitPrice = new Decimal('110.25');
  const exitTrade = new Trade(2, exitPrice, new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  assert.strictEqual(position.getExitPrice()?.toString(), '110.25');
});

test('Position class - getAmount method', () => {
  const amount = new Decimal('10.5');
  const entryTrade = new Trade(1, new Decimal('100'), amount, TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getAmount().toString(), '10.5');
});

test('Position class - getEntryIndex method', () => {
  const entryIndex = 5;
  const entryTrade = new Trade(entryIndex, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getEntryIndex(), entryIndex);
});

test('Position class - getExitIndex method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getExitIndex(), null);
});

test('Position class - getExitIndex method for closed position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitIndex = 3;
  const exitTrade = new Trade(exitIndex, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  assert.strictEqual(position.getExitIndex(), exitIndex);
});

test('Position class - getEntryTime method', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY, entryTime);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getEntryTime().toISOString(), entryTime.toISOString());
});

test('Position class - getExitTime method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getExitTime(), null);
});

test('Position class - getExitTime method for closed position', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const exitTime = new Date('2023-01-01T11:00:00Z');
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY, entryTime);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL, exitTime);
  const position = new Position(entryTrade, exitTrade);

  assert.strictEqual(position.getExitTime()?.toISOString(), exitTime.toISOString());
});

test('Position class - isLong method', () => {
  const buyTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const sellTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const longTrade = new Position(buyTrade);
  const shortTrade = new Position(sellTrade);

  assert.strictEqual(longTrade.isLong(), true);
  assert.strictEqual(shortTrade.isLong(), false);
});

test('Position class - isShort method', () => {
  const buyTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const sellTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const longTrade = new Position(buyTrade);
  const shortTrade = new Position(sellTrade);

  assert.strictEqual(shortTrade.isShort(), true);
  assert.strictEqual(longTrade.isShort(), false);
});

test('Position class - getProfit method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getProfit().toString(), '0');
});

test('Position class - getProfit method for closed LONG position (profitable)', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Profit = (110 - 100) * 10 = 100
  assert.strictEqual(position.getProfit().toString(), '100');
});

test('Position class - getProfit method for closed LONG position (loss)', () => {
  const entryTrade = new Trade(1, new Decimal('110'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Profit = (100 - 110) * 10 = -100
  assert.strictEqual(position.getProfit().toString(), '-100');
});

test('Position class - getProfit method for closed SHORT position (profitable)', () => {
  const entryTrade = new Trade(1, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const exitTrade = new Trade(2, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade, exitTrade);

  // Profit = (110 - 100) * 10 = 100
  assert.strictEqual(position.getProfit().toString(), '100');
});

test('Position class - getProfit method for closed SHORT position (loss)', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade, exitTrade);

  // Profit = (100 - 110) * 10 = -100
  assert.strictEqual(position.getProfit().toString(), '-100');
});

test('Position class - getProfit method with commissions', () => {
  // Create mock trades with commissions
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);

  // Mock getCommission method to return a specific value
  const entryTradeWithCommission = Object.create(entryTrade);
  entryTradeWithCommission.getCommission = () => new Decimal('0.5');

  const exitTradeWithCommission = Object.create(exitTrade);
  exitTradeWithCommission.getCommission = () => new Decimal('0.5');

  const position = new Position(entryTradeWithCommission, exitTradeWithCommission);

  // Profit = (110 - 100) * 10 - 0.5 - 0.5 = 100 - 1 = 99
  assert.strictEqual(position.getProfit().toString(), '99');
});

test('Position class - getProfitPercent method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getProfitPercent().toString(), '0');
});

test('Position class - getProfitPercent method for closed position (profitable)', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Profit percent = (100 / (100 * 10)) * 100 = (100 / 1000) * 100 = 10%
  assert.strictEqual(position.getProfitPercent().toString(), '10');
});

test('Position class - getProfitPercent method for closed position (loss)', () => {
  const entryTrade = new Trade(1, new Decimal('110'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('100'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Profit percent = (-100 / (110 * 10)) * 100 = (-100 / 1100) * 100 = -9.0909...%
  assert.strictEqual(position.getProfitPercent().toString(), '-9.090909090909090909');
});

test('Position class - getProfitPercent method with zero entry value', () => {
  // Create trades with valid prices and amounts
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('100'), new Decimal('10'), TradeType.SELL);

  // Mock getProfit method to return zero profit
  const mockedEntryTrade = Object.create(entryTrade);
  mockedEntryTrade.getPrice = () => new Decimal('0'); // This will make entryValue = 0 * 10 = 0

  const position = new Position(mockedEntryTrade, exitTrade);

  // Should return 0 when entry value is zero
  assert.strictEqual(position.getProfitPercent().toString(), '0');
});

test('Position class - getPoints method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getPoints().toString(), '0');
});

test('Position class - getPoints method for closed LONG position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Points = 110 - 100 = 10
  assert.strictEqual(position.getPoints().toString(), '10');
});

test('Position class - getPoints method for closed SHORT position', () => {
  const entryTrade = new Trade(1, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const exitTrade = new Trade(2, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade, exitTrade);

  // Points = 110 - 100 = 10
  assert.strictEqual(position.getPoints().toString(), '10');
});

test('Position class - getTotalValue method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  // Total value = 100 * 10 = 1000
  assert.strictEqual(position.getTotalValue().toString(), '1000');
});

test('Position class - getTotalValue method for closed position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Total value = (100 * 10) + (110 * 10) = 1000 + 1100 = 2100
  assert.strictEqual(position.getTotalValue().toString(), '2100');
});

test('Position class - getBarCount method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getBarCount(), 0);
});

test('Position class - getBarCount method for closed position', () => {
  const entryIndex = 3;
  const exitIndex = 7;
  const entryTrade = new Trade(entryIndex, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(exitIndex, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  // Bar count = 7 - 3 = 4
  assert.strictEqual(position.getBarCount(), 4);
});

test('Position class - getDuration method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  assert.strictEqual(position.getDuration(), null);
});

test('Position class - getDuration method for closed position', () => {
  const entryTime = new Date('2023-01-01T10:00:00Z');
  const exitTime = new Date('2023-01-01T11:30:00Z');
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY, entryTime);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL, exitTime);
  const position = new Position(entryTrade, exitTrade);

  // Duration = 1.5 hours = 5400000 milliseconds
  assert.strictEqual(position.getDuration(), 5400000);
});

test('Position class - toString method for open position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const position = new Position(entryTrade);

  const result = position.toString();
  assert.ok(result.includes('LONG'));
  assert.ok(result.includes('position OPEN'));
});

test('Position class - toString method for closed profitable position', () => {
  const entryTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const exitTrade = new Trade(2, new Decimal('110'), new Decimal('10'), TradeType.SELL);
  const position = new Position(entryTrade, exitTrade);

  const result = position.toString();
  assert.ok(result.includes('LONG'));
  assert.ok(result.includes('P&L: 100'));
  assert.ok(result.includes('(10%)'));
});
