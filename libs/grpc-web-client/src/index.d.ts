import { InstrumentsServiceClient } from '../compiled/instruments';
import { OrdersStreamServiceClient, OrdersServiceClient } from '../compiled/orders';
import { OperationsServiceClient, OperationsStreamServiceClient } from '../compiled/operations';
import { MarketDataServiceClient, MarketDataStreamServiceClient } from '../compiled/marketdata';
import { StopOrdersServiceClient } from '../compiled/stoporders';
import { SandboxServiceClient } from '../compiled/sandbox';
import { UsersServiceClient } from '../compiled/users';
export interface TTechAPIClientOptions {
  token: string;
  url?: string;
  metadata?: Record<string, string>;
  cache?: {
    instruments?: boolean;
  };
  /** Stream diagnostics are enabled by default. */
  telemetry?: 'enabled' | 'disabled';
}
export declare class WebApiClient {
  instruments: InstrumentsServiceClient;
  ordersStream: OrdersStreamServiceClient;
  orders: OrdersServiceClient;
  operations: OperationsServiceClient;
  operationsStream: OperationsStreamServiceClient;
  marketdata: MarketDataServiceClient;
  marketdataStream: MarketDataStreamServiceClient;
  stopOrders: StopOrdersServiceClient;
  users: UsersServiceClient;
  sandbox: SandboxServiceClient;
  constructor(config: TTechAPIClientOptions);
}
export { MoneyValue, Quotation, ErrorDetail, Ping } from '../compiled/common';
export {
  SecurityTradingStatus,
  PriceType,
  ResultSubscriptionStatus,
  InstrumentType,
  InstrumentStatus,
} from '../compiled/common';
export type { GetAccountsRequest, GetAccountsResponse } from '../compiled/users';
export type {
  OrderState,
  GetOrdersRequest,
  GetOrdersResponse,
  PostOrderRequest,
  PostOrderResponse,
  PostOrderAsyncRequest,
  PostOrderAsyncResponse,
  OrderStateStreamRequest,
  OrderStateStreamResponse,
  TradesStreamRequest,
  TradesStreamResponse,
  SubscriptionResponse,
  OrderStateStreamResponse_OrderState,
} from '../compiled/orders';
export {
  OrderDirection,
  OrderType,
  TimeInForceType,
  OrderExecutionReportStatus,
  OrderStateStreamResponse_StatusCauseInfo,
  OrderStateStreamResponse_MarkerType,
  OrderTrade,
} from '../compiled/orders';
export type {
  PositionsRequest,
  PositionsResponse,
  OperationsRequest,
  OperationsResponse,
} from '../compiled/operations';
export type {
  InstrumentsRequest,
  SharesResponse,
  BondResponse,
  EtfsResponse,
  BondsResponse,
  FutureResponse,
  FuturesResponse,
  OptionsResponse,
  AssetsResponse,
  CurrenciesResponse,
  TradingSchedulesRequest,
  TradingSchedulesResponse,
  GetAssetFundamentalsRequest,
  GetAssetFundamentalsResponse,
  GetConsensusForecastsRequest,
  GetConsensusForecastsResponse,
  GetBondCouponsRequest,
  GetBondCouponsResponse,
  GetDividendsRequest,
  GetDividendsResponse,
  IndicativesRequest,
  IndicativesResponse,
  RiskRatesRequest,
  RiskRatesResponse,
  Bond,
  Future,
  Option,
  Share,
  Etf,
} from '../compiled/instruments';
export { OperationState } from '../compiled/operations';
export {
  LastPriceType,
  CandleInterval,
  GetTechAnalysisRequest_TypeOfPrice,
  GetTechAnalysisRequest_IndicatorType,
  GetTechAnalysisRequest_IndicatorInterval,
  GetTechAnalysisRequest_Smoothing,
  TradeDirection,
  CandleSource,
  CandleSubscription,
  OrderBookType,
  OrderBookSubscription,
  TradeSourceType,
  SubscriptionStatus,
  SubscriptionAction,
} from '../compiled/marketdata';
export type {
  MarketDataServerSideStreamRequest,
  MarketDataResponse,
  GetCandlesRequest,
  GetCandlesResponse,
  HistoricCandle,
  GetOrderBookRequest,
  GetOrderBookResponse,
  Order,
  OrderBook,
  GetLastTradesRequest,
  GetLastTradesResponse,
  Trade,
  GetTechAnalysisRequest,
  GetTechAnalysisResponse,
  GetTechAnalysisRequest_Deviation,
  GetTradingStatusesRequest,
  GetTradingStatusesResponse,
  GetLastPricesRequest,
  GetLastPricesResponse,
  GetClosePricesRequest,
  GetClosePricesResponse,
  LastPrice,
  InstrumentClosePriceResponse,
  Candle,
} from '../compiled/marketdata';
