import { NodeApiClient } from '@ttech-pub/grpc-node-client';

export type APIService = Pick<
  NodeApiClient,
  | 'instruments'
  | 'marketdata'
  | 'marketdataStream'
  | 'operations'
  | 'operationsStream'
  | 'orders'
  | 'ordersStream'
  | 'stopOrders'
  | 'users'
  | 'sandbox'
>;

export abstract class BaseCommand<T, S> {
  #options: T;

  constructor(options: T) {
    this.#options = options;
  }

  public get options() {
    return this.#options;
  }

  public abstract call(client: APIService): S;
}
