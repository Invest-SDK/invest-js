import { NodeApiClient, TTechAPIClientOptions } from '@ttech-pub/grpc-node-client';
import { BaseCommand } from './shared';
import { EmptyTokenError } from './instance.errors';

export interface InvestNodeSDKOptions extends TTechAPIClientOptions {}

function validateToken(options: InvestNodeSDKOptions): void {
  if (options.token === null || options.token === undefined || options.token === '') {
    throw new EmptyTokenError('Token is empty');
  }
}

export class InvestNodeSDK {
  #client: NodeApiClient;

  static async create(options: InvestNodeSDKOptions): Promise<InvestNodeSDK> {
    validateToken(options);
    const client = await NodeApiClient.create(options);
    return new InvestNodeSDK(options, client);
  }

  constructor(options: InvestNodeSDKOptions, client?: NodeApiClient) {
    validateToken(options);
    this.#client = client ?? new NodeApiClient(options);
  }

  send<T, S>(command: BaseCommand<T, S>): S {
    return command.call(this.#client);
  }
}
