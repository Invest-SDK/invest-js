import { createChannel, createClientFactory, ChannelCredentials } from 'nice-grpc';
import { InstrumentsServiceClient, InstrumentsServiceDefinition } from '../compiled/instruments';
import {
  OrdersStreamServiceClient,
  OrdersStreamServiceDefinition,
  OrdersServiceClient,
  OrdersServiceDefinition,
} from '../compiled/orders';
import {
  OperationsServiceClient,
  OperationsServiceDefinition,
  OperationsStreamServiceClient,
  OperationsStreamServiceDefinition,
} from '../compiled/operations';
import {
  MarketDataServiceClient,
  MarketDataServiceDefinition,
  MarketDataStreamServiceClient,
  MarketDataStreamServiceDefinition,
} from '../compiled/marketdata';
import { StopOrdersServiceClient, StopOrdersServiceDefinition } from '../compiled/stoporders';
import { UsersServiceClient, UsersServiceDefinition } from '../compiled/users';
import { SandboxServiceClient, SandboxServiceDefinition } from '../compiled/sandbox';
import { downloadMincifryCertificate } from './mincifry-certificate';
import { createMetadata } from './metadata';

export interface TTechAPIClientOptions {
  token: string;
  url?: string;
  metadata?: Record<string, string>;
  useMincifryCertificate?: boolean;
}

export class NodeApiClient {
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

  static async create(config: TTechAPIClientOptions): Promise<NodeApiClient> {
    const rootCerts = config.useMincifryCertificate
      ? await downloadMincifryCertificate()
      : undefined;

    return new NodeApiClient(config, rootCerts);
  }

  constructor(config: TTechAPIClientOptions, rootCerts?: Buffer) {
    if (config.useMincifryCertificate && !rootCerts) {
      throw new Error('useMincifryCertificate requires await NodeApiClient.create(options)');
    }

    const token = config.token;
    const url = config.url || 'https://invest-public-api.tinkoff.ru';

    // const providedMetadata = config.metadata || {};

    const clientFactory = createClientFactory().use((call, options) =>
      call.next(call.request, {
        ...options,
        metadata: createMetadata(options.metadata, token),
      })
    );

    const channel = createChannel(url, ChannelCredentials.createSsl(rootCerts));

    this.instruments = clientFactory.create(InstrumentsServiceDefinition, channel);
    this.ordersStream = clientFactory.create(OrdersStreamServiceDefinition, channel);
    this.orders = clientFactory.create(OrdersServiceDefinition, channel);
    this.operations = clientFactory.create(OperationsServiceDefinition, channel);
    this.operationsStream = clientFactory.create(OperationsStreamServiceDefinition, channel);
    this.marketdata = clientFactory.create(MarketDataServiceDefinition, channel);
    this.marketdataStream = clientFactory.create(MarketDataStreamServiceDefinition, channel);
    this.stopOrders = clientFactory.create(StopOrdersServiceDefinition, channel);
    this.users = clientFactory.create(UsersServiceDefinition, channel);
    this.sandbox = clientFactory.create(SandboxServiceDefinition, channel);
  }
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
  PortfolioRequest,
  PortfolioResponse,
} from '../compiled/operations';

export type {
  OpenSandboxAccountRequest,
  OpenSandboxAccountResponse,
  CloseSandboxAccountRequest,
  CloseSandboxAccountResponse,
  SandboxPayInRequest,
  SandboxPayInResponse,
} from '../compiled/sandbox';

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
  SubscriptionInterval,
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
