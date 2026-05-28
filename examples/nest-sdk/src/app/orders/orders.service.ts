import { Inject } from '@nestjs/common';
import { INVEST_SDK_CLIENT } from '../invest-sdk';
import {
  CreateOrderCommand,
  GetActiveOrdersStreamCommand,
  GetSuccessOrdersStreamCommand,
} from '@ttech-pub/invest-sdk-node';
import type { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { OrderDirection, OrderType, PriceType, TimeInForceType } from '@ttech-pub/grpc-node-client';
import type { PostOrderResponse } from '@ttech-pub/grpc-node-client';
import { randomUUID } from 'node:crypto';
import { Decimal } from '@ttech-pub/invest-core';
import { map, mergeAll, Observable } from 'rxjs';

export class OrdersService {
  constructor(
    @Inject(INVEST_SDK_CLIENT)
    private readonly _investSdk: InvestNodeSDK
  ) {}

  buyInstrument(
    accountId: string,
    instrumentId: string,
    quantity: number
  ): Promise<PostOrderResponse> {
    const command = new CreateOrderCommand({
      accountId,
      priceType: PriceType.PRICE_TYPE_CURRENCY,
      orderId: randomUUID(),
      direction: OrderDirection.ORDER_DIRECTION_BUY,
      instrumentId,
      orderType: OrderType.ORDER_TYPE_LIMIT,
      quantity,
      price: new Decimal('1'),
      timeInForce: TimeInForceType.TIME_IN_FORCE_DAY,
      confirmMarginTrade: false,
    });
    return this._investSdk.send(command);
  }

  async getActiveOrdersStream(accountId: string): Promise<Observable<string>> {
    const command = new GetActiveOrdersStreamCommand({
      accounts: [accountId],
    });

    const iterableStream = this._investSdk.send(command);

    const combinedStream = iterableStream.pipe(
      mergeAll(),
      map((value) => {
        return value.orderState?.orderId || 'not found';
      })
    );

    return combinedStream;
  }

  async getSuccessOrdersStream(accountId: string): Promise<Observable<string>> {
    const command = new GetSuccessOrdersStreamCommand({
      accounts: [accountId],
    });

    return this._investSdk.send(command).pipe(
      map((value) => {
        return value.orderState?.orderId || 'not found';
      })
    );
  }
}
