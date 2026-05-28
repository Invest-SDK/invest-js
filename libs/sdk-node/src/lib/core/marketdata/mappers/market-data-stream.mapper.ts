import { Candle, MarketDataResponse, OrderBook } from '@ttech-pub/grpc-node-client';
import { Decimal } from '@ttech-pub/invest-core';
import { MarketdataCandle, MarketdataOrderBookStream, MarketdataStreamItem } from '../types';
import { OrdersMapper } from './order.mapper';
import { CandlesMapper } from './candles-prices.mapper';
import { LastPricesMapper } from './last-price.mapper';
import { TradesMapper } from './trades.mapper';

export class MarketDataStreamMapper {
  public static map(value: MarketDataResponse): MarketdataStreamItem {
    const { candle, lastPrice, orderbook, trade, ...otherMarketdataStreamItem } = value;

    // ВНИМАНИЕ: метод используется как `pipe(map(MarketDataStreamMapper.map))`
    // в `get-marketdata-stream.command.ts` — rxjs `map(fn)` вызывает `fn(value)`
    // без bind, поэтому `this` внутри будет undefined. Обращаемся к статикам
    // через имя класса, чтобы не зависеть от `this`.
    return {
      ...otherMarketdataStreamItem,
      lastPrice: lastPrice ? LastPricesMapper.map(lastPrice) : undefined,
      orderbook: orderbook ? MarketDataStreamMapper.mapOrderBookStream(orderbook) : undefined,
      trade: trade ? TradesMapper.map(trade) : undefined,
      candle: candle ? MarketDataStreamMapper.mapCandle(candle) : undefined,
    };
  }

  private static mapCandle(value: Candle): MarketdataCandle {
    const { high, low, open, close, ...otherCandleInfo } = value;

    return {
      ...otherCandleInfo,
      ...CandlesMapper.map({ high, low, close, open }),
    };
  }

  private static mapOrderBookStream(value: OrderBook): MarketdataOrderBookStream {
    const { asks, bids, limitDown, limitUp, ...otherOrderBookInfo } = value;

    return {
      ...otherOrderBookInfo,
      asks: asks.map(OrdersMapper.map),
      bids: bids.map(OrdersMapper.map),
      limitUp: limitUp ? new Decimal(limitUp) : undefined,
      limitDown: limitDown ? new Decimal(limitDown) : undefined,
    };
  }
}
