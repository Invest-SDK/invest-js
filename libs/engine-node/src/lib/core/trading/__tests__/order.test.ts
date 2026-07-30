import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@t-tech/invest-shared';
import { Order, OrderType, OrderStatus } from '../order';

test('Order class - constructor with all required fields', () => {
  const index = 1;
  const price = new Decimal('100.50');
  const amount = new Decimal('10');
  const type = OrderType.BUY;
  const time = new Date();
  const status = OrderStatus.FILLED;

  const order = new Order(index, price, amount, type, time, status);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100.5');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), type);
  assert.strictEqual(order.getTime(), time);
  assert.strictEqual(order.getStatus(), status);
});

test('Order class - constructor with default values', () => {
  const index = 1;
  const price = new Decimal('100.50');
  const amount = new Decimal('10');
  const type = OrderType.BUY;

  const order = new Order(index, price, amount, type);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100.5');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), type);
  assert.ok(order.getTime() instanceof Date);
  assert.strictEqual(order.getStatus(), OrderStatus.FILLED);
});

test('Order class - constructor with string inputs for price and amount', () => {
  const index = 1;
  const price = '100.50';
  const amount = '10';
  const type = OrderType.BUY;

  // @ts-expect-error Testing string inputs
  const order = new Order(index, price, amount, type);

  assert.strictEqual(order.getPrice().toString(), '100.5');
  assert.strictEqual(order.getAmount().toString(), '10');
});

test('Order class - isBuy method', () => {
  const buyOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const sellOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);

  assert.strictEqual(buyOrder.isBuy(), true);
  assert.strictEqual(sellOrder.isBuy(), false);
});

test('Order class - isSell method', () => {
  const buyOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const sellOrder = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.SELL);

  assert.strictEqual(sellOrder.isSell(), true);
  assert.strictEqual(buyOrder.isSell(), false);
});

test('Order class - isFilled method', () => {
  const filledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.FILLED
  );
  const pendingOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.PENDING
  );
  const cancelledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.CANCELLED
  );

  assert.strictEqual(filledOrder.isFilled(), true);
  assert.strictEqual(pendingOrder.isFilled(), false);
  assert.strictEqual(cancelledOrder.isFilled(), false);
});

test('Order class - isCancelled method', () => {
  const filledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.FILLED
  );
  const pendingOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.PENDING
  );
  const cancelledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.CANCELLED
  );

  assert.strictEqual(cancelledOrder.isCancelled(), true);
  assert.strictEqual(filledOrder.isCancelled(), false);
  assert.strictEqual(pendingOrder.isCancelled(), false);
});

test('Order class - isPending method', () => {
  const filledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.FILLED
  );
  const pendingOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.PENDING
  );
  const cancelledOrder = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    OrderStatus.CANCELLED
  );

  assert.strictEqual(pendingOrder.isPending(), true);
  assert.strictEqual(filledOrder.isPending(), false);
  assert.strictEqual(cancelledOrder.isPending(), false);
});

test('Order class - getValue method', () => {
  const order = new Order(1, new Decimal('100.50'), new Decimal('10'), OrderType.BUY);
  const value = order.getValue();

  // 100.50 * 10 = 1005
  assert.strictEqual(value.toString(), '1005');
});

test('Order class - getCommission method', () => {
  const order = new Order(1, new Decimal('100'), new Decimal('10'), OrderType.BUY);
  const commission = order.getCommission();

  // Default implementation returns 0
  assert.strictEqual(commission.toString(), '0');
});

test('Order class - copy method', () => {
  const time = new Date();
  const order = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const copy = order.copy();

  assert.strictEqual(copy.getIndex(), order.getIndex());
  assert.strictEqual(copy.getPrice().toString(), order.getPrice().toString());
  assert.strictEqual(copy.getAmount().toString(), order.getAmount().toString());
  assert.strictEqual(copy.getType(), order.getType());
  assert.notStrictEqual(copy.getTime(), order.getTime()); // Different Date objects
  assert.strictEqual(copy.getTime().getTime(), order.getTime().getTime()); // Same time value
  assert.strictEqual(copy.getStatus(), order.getStatus());
  assert.notStrictEqual(copy, order); // Different instances
});

test('Order class - equals method with equal orders', () => {
  const time = new Date();
  const order1 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const order2 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );

  assert.strictEqual(order1.equals(order2), true);
});

test('Order class - equals method with different indices', () => {
  const time = new Date();
  const order1 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const order2 = new Order(
    2,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );

  assert.strictEqual(order1.equals(order2), false);
});

test('Order class - equals method with different prices', () => {
  const time = new Date();
  const order1 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const order2 = new Order(
    1,
    new Decimal('101'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );

  assert.strictEqual(order1.equals(order2), false);
});

test('Order class - equals method with different amounts', () => {
  const time = new Date();
  const order1 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const order2 = new Order(
    1,
    new Decimal('100'),
    new Decimal('11'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );

  assert.strictEqual(order1.equals(order2), false);
});

test('Order class - equals method with different types', () => {
  const time = new Date();
  const order1 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED
  );
  const order2 = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.SELL,
    time,
    OrderStatus.FILLED
  );

  assert.strictEqual(order1.equals(order2), false);
});

test('Order class - static buy factory method', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();

  const order = Order.buy(index, price, amount, time);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), OrderType.BUY);
  assert.strictEqual(order.getTime(), time);
});

test('Order class - static sell factory method', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();

  const order = Order.sell(index, price, amount, time);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), OrderType.SELL);
  assert.strictEqual(order.getTime(), time);
});

test('Order class - static constants', () => {
  assert.strictEqual(Order.ORDER_TYPE_BUY, OrderType.BUY);
  assert.strictEqual(Order.ORDER_TYPE_SELL, OrderType.SELL);
});

test('Order class - constructor with zero price throws error', () => {
  assert.throws(() => {
    new Order(1, new Decimal('0'), new Decimal('10'), OrderType.BUY);
  }, /Price must be a positive number/);
});

test('Order class - constructor with negative price throws error', () => {
  assert.throws(() => {
    new Order(1, new Decimal('-100'), new Decimal('10'), OrderType.BUY);
  }, /Price must be a positive number/);
});

test('Order class - constructor with zero amount throws error', () => {
  assert.throws(() => {
    new Order(1, new Decimal('100'), new Decimal('0'), OrderType.BUY);
  }, /Amount must be a positive number/);
});

test('Order class - constructor with negative amount throws error', () => {
  assert.throws(() => {
    new Order(1, new Decimal('100'), new Decimal('-10'), OrderType.BUY);
  }, /Amount must be a positive number/);
});

test('Order class - constructor with negative commission throws error', () => {
  assert.throws(() => {
    new Order(
      1,
      new Decimal('100'),
      new Decimal('10'),
      OrderType.BUY,
      undefined,
      undefined,
      new Decimal('-1')
    );
  }, /Commission cannot be negative/);
});

test('Order class - constructor with valid commission', () => {
  const order = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    undefined,
    new Decimal('0.5')
  );

  assert.strictEqual(order.getPrice().toString(), '100');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getCommission().toString(), '0.5');
});

test('Order class - getCommission method returns correct value', () => {
  const commission = new Decimal('1.25');
  const order = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    undefined,
    undefined,
    commission
  );

  assert.strictEqual(order.getCommission().toString(), '1.25');
});

test('Order class - copy method preserves commission', () => {
  const time = new Date();
  const order = new Order(
    1,
    new Decimal('100'),
    new Decimal('10'),
    OrderType.BUY,
    time,
    OrderStatus.FILLED,
    new Decimal('0.75')
  );
  const copy = order.copy();

  assert.strictEqual(copy.getIndex(), order.getIndex());
  assert.strictEqual(copy.getPrice().toString(), order.getPrice().toString());
  assert.strictEqual(copy.getAmount().toString(), order.getAmount().toString());
  assert.strictEqual(copy.getType(), order.getType());
  assert.notStrictEqual(copy.getTime(), order.getTime()); // Different Date objects
  assert.strictEqual(copy.getTime().getTime(), order.getTime().getTime()); // Same time value
  assert.strictEqual(copy.getStatus(), order.getStatus());
  assert.strictEqual(copy.getCommission().toString(), order.getCommission().toString()); // Commission preserved
  assert.notStrictEqual(copy, order); // Different instances
});

test('Order class - static buy factory method with commission', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();
  const commission = new Decimal('0.5');

  const order = Order.buy(index, price, amount, time, commission);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), OrderType.BUY);
  assert.strictEqual(order.getTime(), time);
  assert.strictEqual(order.getCommission().toString(), '0.5');
});

test('Order class - static sell factory method with commission', () => {
  const index = 1;
  const price = new Decimal('100');
  const amount = new Decimal('10');
  const time = new Date();
  const commission = new Decimal('0.5');

  const order = Order.sell(index, price, amount, time, commission);

  assert.strictEqual(order.getIndex(), index);
  assert.strictEqual(order.getPrice().toString(), '100');
  assert.strictEqual(order.getAmount().toString(), '10');
  assert.strictEqual(order.getType(), OrderType.SELL);
  assert.strictEqual(order.getTime(), time);
  assert.strictEqual(order.getCommission().toString(), '0.5');
});
