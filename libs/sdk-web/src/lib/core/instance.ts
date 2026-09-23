import { WebApiClient, TTechAPIClientOptions } from '@ttech-pub/grpc-web-client';
import { BaseCommand } from './shared';
import { EmptyTokenError } from './instance.errors';

export interface InvestWebSDKOptions extends TTechAPIClientOptions {}

export class InvestWebSDK {
  #client: WebApiClient;

  constructor(options: InvestWebSDKOptions) {
    if (options.token === null || options.token === undefined || options.token === '') {
      throw new EmptyTokenError('Token is empty');
    }
    this.#client = new WebApiClient(options);
  }

  send<T, S>(command: BaseCommand<T, S>): S {
    return command.call(this.#client);
  }
}
