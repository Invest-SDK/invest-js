import { Trade } from '@ttech-pub/grpc-node-client';
import { Decimal } from '@ttech-pub/invest-core';
import { MarketdataTrade } from '../types';

export class TradesMapper {
  public static map(value: Trade): MarketdataTrade {
    const { price, ...otherTradeInfo } = value;

    return {
      ...otherTradeInfo,
      price: price ? new Decimal(price) : undefined,
    };
  }
}
