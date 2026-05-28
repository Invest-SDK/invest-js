/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { APIService } from '../../shared';
import { OrderDirection, OrderType, PriceType, TimeInForceType } from '@ttech-pub/grpc-node-client';
import {
  PostSandboxOrderCommand,
  PostSandboxOrderInput,
} from '../commands/post-sandbox-order.command';

describe('PostSandboxOrderCommand', () => {
  test('вызывает sandbox.postSandboxOrder и передаёт запрос без изменений', async () => {
    const input: PostSandboxOrderInput = {
      figi: 'figi-123',
      instrumentId: 'uid-123',
      quantity: 2,
      direction: OrderDirection.ORDER_DIRECTION_BUY,
      accountId: 'account-123',
      orderType: OrderType.ORDER_TYPE_MARKET,
      orderId: 'order-123',
      timeInForce: TimeInForceType.TIME_IN_FORCE_DAY,
      priceType: PriceType.PRICE_TYPE_CURRENCY,
      confirmMarginTrade: true,
    };
    let received: any;

    const api = {
      sandbox: {
        postSandboxOrder: async (request: any) => {
          received = request;
          return { orderId: 'order-123' };
        },
      },
    } as unknown as APIService;

    const result = await new PostSandboxOrderCommand(input).call(api);

    assert.deepStrictEqual(received, input);
    assert.strictEqual(result.orderId, 'order-123');
  });
});
