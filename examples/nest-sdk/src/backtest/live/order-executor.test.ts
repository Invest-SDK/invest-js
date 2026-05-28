import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { OrderExecutionReportStatus, OrderDirection } from '@ttech-pub/grpc-node-client';
import type { PostOrderResponse } from '@ttech-pub/grpc-node-client';
import { PostSandboxOrderCommand } from '@ttech-pub/invest-sdk-node';
import { of } from 'rxjs';
import { calculateSpreadCommission, TwoLegOrderExecutor } from './order-executor';

const intent = {
  side: 'buy' as const,
  quantity: new Decimal('3'),
  referencePrice: new Decimal('100'),
  type: 'market' as const,
  index: 1,
  time: new Date('2026-07-31T00:00:00.000Z'),
};

function filled(orderId: string): PostOrderResponse {
  return {
    orderId,
    executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_FILL,
    lotsRequested: 3,
    lotsExecuted: 3,
    initialOrderPrice: undefined,
    executedOrderPrice: { currency: 'rub', units: 100, nano: 0 },
    totalOrderAmount: undefined,
    initialCommission: undefined,
    executedCommission: { currency: 'rub', units: 1, nano: 0 },
    aciValue: undefined,
    figi: 'figi',
    direction: 0,
    initialSecurityPrice: undefined,
    orderType: 0,
    message: '',
    initialOrderPricePt: undefined,
    instrumentUid: 'uid',
    ticker: 'TICKER',
    classCode: 'TQBR',
    orderRequestId: orderId,
    responseMetadata: undefined,
  };
}

function executor(send: (command: unknown) => Promise<unknown>): TwoLegOrderExecutor {
  return new TwoLegOrderExecutor({ send } as never, {
    accountId: 'account',
    legA: { ticker: 'A', figi: 'figi-a', lot: 10 },
    legB: { ticker: 'B', figi: 'figi-b', lot: 10 },
    dryRun: false,
    subscribeOrderState: false,
  });
}

function streamExecutor(send: (command: unknown) => unknown): TwoLegOrderExecutor {
  return new TwoLegOrderExecutor({ send } as never, {
    accountId: 'account',
    legA: { ticker: 'A', figi: 'figi-a', lot: 10 },
    legB: { ticker: 'B', figi: 'figi-b', lot: 10 },
    dryRun: false,
    subscribeOrderState: true,
  });
}

describe('TwoLegOrderExecutor', () => {
  test('использует sandbox-ордера, количество из intent и подтверждение маржинальной торговли', async () => {
    const commands: unknown[] = [];
    const result = await executor(async (command) => {
      commands.push(command);
      return filled(`order-${commands.length}`);
    }).execute(intent);

    assert.strictEqual(commands.length, 2);
    assert.ok(commands.every((command) => command instanceof PostSandboxOrderCommand));
    assert.deepStrictEqual(
      commands.map((command) => (command as PostSandboxOrderCommand).options.quantity),
      [3, 3]
    );
    assert.ok(
      commands.every((command) => (command as PostSandboxOrderCommand).options.confirmMarginTrade)
    );
    if ('dryRun' in result.legA || 'dryRun' in result.legB) throw new Error('unexpected dry run');
    assert.strictEqual(result.legA.lotsExecuted, 3);
    assert.strictEqual(result.legB.lotsExecuted, 3);
  });

  test('компенсирует исполненную ногу при ошибке второй', async () => {
    const commands: unknown[] = [];
    await assert.rejects(
      executor(async (command) => {
        commands.push(command);
        if (commands.length === 2) throw new Error('second leg failed');
        return filled('filled-leg');
      }).execute(intent),
      /second leg failed/
    );

    assert.strictEqual(commands.length, 3);
    assert.ok(commands[2] instanceof PostSandboxOrderCommand);
    assert.strictEqual((commands[2] as PostSandboxOrderCommand).options.quantity, 3);
  });

  test('нормализует комиссии ног в единицы доходности спреда', async () => {
    const fills = await executor(async (command) =>
      filled((command as PostSandboxOrderCommand).options.orderId)
    ).execute(intent);
    if ('dryRun' in fills.legA || 'dryRun' in fills.legB) throw new Error('unexpected dry run');

    const commission = calculateSpreadCommission(fills.legA, fills.legB);

    assert.strictEqual(commission.toString(), '0.00066666666666666666');
  });

  test('не принимает частичное исполнение за завершённый спред', async () => {
    const commands: unknown[] = [];
    await assert.rejects(
      executor(async (command) => {
        commands.push(command);
        if (commands.length === 1) {
          return {
            ...filled('partial'),
            executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_PARTIALLYFILL,
            lotsExecuted: 1,
          };
        }
        return filled('full');
      }).execute(intent),
      /two-leg order failed/
    );

    assert.strictEqual(commands.length, 4);
  });

  test('сохраняет события состояния ордеров для сверки', () => {
    const executor = streamExecutor(() =>
      of(
        of({
          orderState: {
            orderId: 'stream-order',
            ticker: 'A',
            direction: OrderDirection.ORDER_DIRECTION_BUY,
            executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_FILL,
            executedOrderPrice: { currency: 'rub', units: 101, nano: 0 },
            lotsRequested: 1,
            lotsExecuted: 1,
            lotSize: 10,
          },
        })
      )
    );

    executor.startOrderStateStream();

    const event = executor.getStreamEvent('stream-order');
    assert.ok(event);
    assert.strictEqual(event.executedPrice?.toString(), '101');
    assert.strictEqual(event.lotsExecuted, 1);
  });
});
