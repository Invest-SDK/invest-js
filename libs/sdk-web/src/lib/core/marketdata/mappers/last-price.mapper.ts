import { LastPrice } from '@ttech-pub/grpc-web-client';
import { Decimal } from '@ttech-pub/invest-core';
import { MarketdataLastPrice } from '../types';

export class LastPricesMapper {
  public static map(value: LastPrice): MarketdataLastPrice {
    const { price, ...otherLastPriceInfo } = value;

    return {
      ...otherLastPriceInfo,
      price: price ? new Decimal(price) : undefined,
    };
  }
}
