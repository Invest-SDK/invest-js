import { Order } from '@ttech-pub/grpc-node-client';
import { Decimal } from '@ttech-pub/invest-core';
import { MarketdataOrder } from '../types';

export class OrdersMapper {
  public static map(value: Order): MarketdataOrder {
    const { price, ...otherOrderInfo } = value;

    return {
      ...otherOrderInfo,
      price: price ? new Decimal(price) : undefined,
    };
  }
}
