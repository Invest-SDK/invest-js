import { PositionsRequest, PositionsResponse } from '@ttech-pub/grpc-web-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetPositionsInput extends PositionsRequest {}

export interface GetPositionsOutput extends PositionsResponse {}

export class GetPositionsCommand extends BaseCommand<
  GetPositionsInput,
  Promise<GetPositionsOutput>
> {
  public override call(client: APIService): Promise<GetPositionsOutput> {
    return client.operations.getPositions(this.options);
  }
}
