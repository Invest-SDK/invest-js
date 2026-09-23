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
import { createResponseCacheMiddleware } from './instruments-cache';
import { createConfiguredErrorHubMiddleware } from './error-hub';

export interface TTechAPIClientOptions {
  token: string;
  url?: string;
  metadata?: Record<string, string>;
  cache?: {
    instruments?: boolean;
  };
  useMincifryCertificate?: boolean;
  /** Stream diagnostics are enabled by default. */
  telemetry?: 'enabled' | 'disabled';
}

const DEFAULT_URL = 'https://invest-public-api.tbank.ru';

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
    if (
      config.telemetry !== undefined &&
      config.telemetry !== 'enabled' &&
      config.telemetry !== 'disabled'
    ) {
      throw new TypeError('telemetry must be "enabled" or "disabled"');
    }

    const token = config.token;
    const url = config.url || DEFAULT_URL;

    let clientFactory = createClientFactory().use((call, options) =>
      call.next(call.request, {
        ...options,
        metadata: createMetadata(config.metadata, options.metadata, token),
      })
    );
    if (config.cache?.instruments !== false) {
      clientFactory = clientFactory.use(createResponseCacheMiddleware());
    }

    const errorHubMiddleware = createConfiguredErrorHubMiddleware(config.telemetry, url);
    if (errorHubMiddleware) {
      // Attach last: nice-grpc invokes newest middleware first. This keeps auth
      // metadata in the inner middleware, outside ErrorHub's boundary.
      clientFactory = clientFactory.use(errorHubMiddleware);
    }

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
  Rating,
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
