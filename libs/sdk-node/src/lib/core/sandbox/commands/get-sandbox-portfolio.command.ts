import { PortfolioRequest, PortfolioResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetSandboxPortfolioInput extends PortfolioRequest {}

export interface GetSandboxPortfolioOutput extends PortfolioResponse {}

/**
 * Портфель sandbox-аккаунта: позиции + общая стоимость + P&L.
 */
export class GetSandboxPortfolioCommand extends BaseCommand<
  GetSandboxPortfolioInput,
  Promise<GetSandboxPortfolioOutput>
> {
  public override call(client: APIService): Promise<GetSandboxPortfolioOutput> {
    return client.sandbox.getSandboxPortfolio(this.options);
  }
}
