import { EmptyURLError } from './errors';
import * as generatedApiClient from './generated-api/generated-api';

type GeneratedApiClient = Omit<
  typeof generatedApiClient,
  'setBaseUrl' | 'setDefaultHeaders' | 'setDefaultFetchParams' | 'default'
>;

export interface InvestAPIClientOptions {
  url: string;
  /** Сахар для заголовка `Authorization: Bearer <token>`. */
  token?: string;
  headers?: Record<string, string>;
}

export class InvestAPIClient {
  #client: GeneratedApiClient;
  constructor(options: InvestAPIClientOptions) {
    if (!options.url) {
      throw new EmptyURLError('Empty URL');
    }
    const headers = {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    };
    this.#client = generatedApiClient.default(options.url, { headers });
  }
  public get restClient(): GeneratedApiClient {
    return this.#client;
  }
}
