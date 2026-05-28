import { PositionsRequest, PositionsResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetSandboxPositionsInput extends PositionsRequest {}

export interface GetSandboxPositionsOutput extends PositionsResponse {}

/**
 * Позиции sandbox-аккаунта: money + securities + blocked.
 */
export class GetSandboxPositionsCommand extends BaseCommand<
  GetSandboxPositionsInput,
  Promise<GetSandboxPositionsOutput>
> {
  public override call(client: APIService): Promise<GetSandboxPositionsOutput> {
    return client.sandbox.getSandboxPositions(this.options);
  }
}
