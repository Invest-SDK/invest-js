import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { Trade, TradeType, TradeStatus } from '../trade';

test('Trade class - constructor with all required fields', () => {
  const index = 1;
  const price = new Decimal('100.50');
  const amount = new Decimal('10');
  const type = TradeType.BUY;
  const time = new Date();
  const status = TradeStatus.FILLED;

  const trade = new Trade(index, price, amount, type, time, status);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100.5');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), type);
  assert.strictEqual(trade.getTime(), time);
  assert.strictEqual(trade.getStatus(), status);
});

test('Trade class - constructor with default values', () => {
  const index = 1;
  const price = new Decimal('100.50');
  const amount = new Decimal('10');
  const type = TradeType.BUY;

  const trade = new Trade(index, price, amount, type);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100.5');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), type);
  assert.ok(trade.getTime() instanceof Date);
  assert.strictEqual(trade.getStatus(), TradeStatus.FILLED);
});

test('Trade class - constructor with string inputs for price and amount', () => {
  const index = 1;
  const price = '100.50';
  const amount = '10';
  const type = TradeType.BUY;

  // @ts-expect-error Testing string inputs
  const trade = new Trade(index, price, amount, type);

  assert.strictEqual(trade.getPrice().toString(), '100.5');
  assert.strictEqual(trade.getAmount().toString(), '10');
});

test('Trade class - isBuy method', () => {
  const buyTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const sellTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);

  assert.strictEqual(buyTrade.isBuy(), true);
  assert.strictEqual(sellTrade.isBuy(), false);
});

test('Trade class - isSell method', () => {
  const buyTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const sellTrade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.SELL);

  assert.strictEqual(sellTrade.isSell(), true);
  assert.strictEqual(buyTrade.isSell(), false);
});

test('Trade class - isFilled method', () => {
  const filledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.FILLED
  );
  const pendingTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.PENDING
  );
  const cancelledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.CANCELLED
  );

  assert.strictEqual(filledTrade.isFilled(), true);
  assert.strictEqual(pendingTrade.isFilled(), false);
  assert.strictEqual(cancelledTrade.isFilled(), false);
});

test('Trade class - isCancelled method', () => {
  const filledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.FILLED
  );
  const pendingTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.PENDING
  );
  const cancelledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.CANCELLED
  );

  assert.strictEqual(cancelledTrade.isCancelled(), true);
  assert.strictEqual(filledTrade.isCancelled(), false);
  assert.strictEqual(pendingTrade.isCancelled(), false);
});

test('Trade class - isPending method', () => {
  const filledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.FILLED
  );
  const pendingTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.PENDING
  );
  const cancelledTrade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    TradeStatus.CANCELLED
  );

  assert.strictEqual(pendingTrade.isPending(), true);
  assert.strictEqual(filledTrade.isPending(), false);
  assert.strictEqual(cancelledTrade.isPending(), false);
});

test('Trade class - getValue method', () => {
  const trade = new Trade(1, new Decimal('100.50'), new Decimal('10'), TradeType.BUY);
  const value = trade.getValue();

  // 100.50 * 10 = 1005
  assert.strictEqual(value.toString(), '1005');
});

test('Trade class - getCommission method', () => {
  const trade = new Trade(1, new Decimal('100'), new Decimal('10'), TradeType.BUY);
  const commission = trade.getCommission();

  // Default implementation returns 0
  assert.strictEqual(commission.toString(), '0');
});

test('Trade class - copy method', () => {
  const time = new Date();
  const trade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const copy = trade.copy();

  assert.strictEqual(copy.getIndex(), trade.getIndex());
  assert.strictEqual(copy.getPrice().toString(), trade.getPrice().toString());
  assert.strictEqual(copy.getAmount().toString(), trade.getAmount().toString());
  assert.strictEqual(copy.getType(), trade.getType());
  assert.notStrictEqual(copy.getTime(), trade.getTime()); // Different Date objects
  assert.strictEqual(copy.getTime().getTime(), trade.getTime().getTime()); // Same time value
  assert.strictEqual(copy.getStatus(), trade.getStatus());
  assert.notStrictEqual(copy, trade); // Different instances
});

test('Trade class - equals method with equal trades', () => {
  const time = new Date();
  const trade1 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const trade2 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );

  assert.strictEqual(trade1.equals(trade2), true);
});

test('Trade class - equals method with different indices', () => {
  const time = new Date();
  const trade1 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const trade2 = new Trade(
    2,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );

  assert.strictEqual(trade1.equals(trade2), false);
});

test('Trade class - equals method with different prices', () => {
  const time = new Date();
  const trade1 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const trade2 = new Trade(
    1,
    new Decimal('101'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );

  assert.strictEqual(trade1.equals(trade2), false);
});

test('Trade class - equals method with different amounts', () => {
  const time = new Date();
  const trade1 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const trade2 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('11'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );

  assert.strictEqual(trade1.equals(trade2), false);
});

test('Trade class - equals method with different types', () => {
  const time = new Date();
  const trade1 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED
  );
  const trade2 = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.SELL,
    time,
    TradeStatus.FILLED
  );

  assert.strictEqual(trade1.equals(trade2), false);
});

test('Trade class - static buy factory method', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();

  const trade = Trade.buy(index, price, amount, time);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), TradeType.BUY);
  assert.strictEqual(trade.getTime(), time);
});

test('Trade class - static sell factory method', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();

  const trade = Trade.sell(index, price, amount, time);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), TradeType.SELL);
  assert.strictEqual(trade.getTime(), time);
});

test('Trade class - static constants', () => {
  assert.strictEqual(Trade.TRADE_TYPE_BUY, TradeType.BUY);
  assert.strictEqual(Trade.TRADE_TYPE_SELL, TradeType.SELL);
});

test('Trade class - constructor with zero price throws error', () => {
  assert.throws(() => {
    new Trade(1, new Decimal('0'), new Decimal('10'), TradeType.BUY);
  }, /Price must be a positive number/);
});

test('Trade class - constructor with negative price throws error', () => {
  assert.throws(() => {
    new Trade(1, new Decimal('-100'), new Decimal('10'), TradeType.BUY);
  }, /Price must be a positive number/);
});

test('Trade class - constructor with zero amount throws error', () => {
  assert.throws(() => {
    new Trade(1, new Decimal('100'), new Decimal('0'), TradeType.BUY);
  }, /Amount must be a positive number/);
});

test('Trade class - constructor with negative amount throws error', () => {
  assert.throws(() => {
    new Trade(1, new Decimal('100'), new Decimal('-10'), TradeType.BUY);
  }, /Amount must be a positive number/);
});

test('Trade class - constructor with negative commission throws error', () => {
  assert.throws(() => {
    new Trade(
      1,
      new Decimal('100'),
      new Decimal('10'),
      TradeType.BUY,
      undefined,
      undefined,
      new Decimal('-1')
    );
  }, /Commission cannot be negative/);
});

test('Trade class - constructor with valid commission', () => {
  const trade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    undefined,
    new Decimal('0.5')
  );

  assert.strictEqual(trade.getPrice().toString(), '100');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getCommission().toString(), '0.5');
});

test('Trade class - getCommission method returns correct value', () => {
  const commission = new Decimal('1.25');
  const trade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    undefined,
    undefined,
    commission
  );

  assert.strictEqual(trade.getCommission().toString(), '1.25');
});

test('Trade class - copy method preserves commission', () => {
  const time = new Date();
  const trade = new Trade(
    1,
    new Decimal('100'),
    new Decimal('10'),
    TradeType.BUY,
    time,
    TradeStatus.FILLED,
    new Decimal('0.75')
  );
  const copy = trade.copy();

  assert.strictEqual(copy.getIndex(), trade.getIndex());
  assert.strictEqual(copy.getPrice().toString(), trade.getPrice().toString());
  assert.strictEqual(copy.getAmount().toString(), trade.getAmount().toString());
  assert.strictEqual(copy.getType(), trade.getType());
  assert.notStrictEqual(copy.getTime(), trade.getTime()); // Different Date objects
  assert.strictEqual(copy.getTime().getTime(), trade.getTime().getTime()); // Same time value
  assert.strictEqual(copy.getStatus(), trade.getStatus());
  assert.strictEqual(copy.getCommission().toString(), trade.getCommission().toString()); // Commission preserved
  assert.notStrictEqual(copy, trade); // Different instances
});

test('Trade class - static buy factory method with commission', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();
  const commission = new Decimal('0.5');

  const trade = Trade.buy(index, price, amount, time, commission);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), TradeType.BUY);
  assert.strictEqual(trade.getTime(), time);
  assert.strictEqual(trade.getCommission().toString(), '0.5');
});

test('Trade class - static sell factory method with commission', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();
  const commission = new Decimal('0.5');

  const trade = Trade.sell(index, price, amount, time, commission);

  assert.strictEqual(trade.getIndex(), index);
  assert.strictEqual(trade.getPrice().toString(), '100');
  assert.strictEqual(trade.getAmount().toString(), '10');
  assert.strictEqual(trade.getType(), TradeType.SELL);
  assert.strictEqual(trade.getTime(), time);
  assert.strictEqual(trade.getCommission().toString(), '0.5');
});
