import { Candle } from '@ttech-pub/grpc-node-client';
import { Decimal } from '@ttech-pub/invest-core';
import { MarketdataCandlePrices, MarketdataCandlePricesNames } from '../types';

export class CandlesMapper {
  public static map(value: Pick<Candle, MarketdataCandlePricesNames>): MarketdataCandlePrices {
    const { open, close, high, low } = value;

    return {
      high: high ? new Decimal(high) : undefined,
      low: low ? new Decimal(low) : undefined,
      open: open ? new Decimal(open) : undefined,
      close: close ? new Decimal(close) : undefined,
    };
  }
}
