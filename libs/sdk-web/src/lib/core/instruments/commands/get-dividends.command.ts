import { GetDividendsRequest, GetDividendsResponse } from '@ttech-pub/grpc-web-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetDividendsInput extends GetDividendsRequest {}

export interface GetDividendsOutput extends GetDividendsResponse {}

export class GetDividendsCommand extends BaseCommand<
  GetDividendsInput,
  Promise<GetDividendsOutput>
> {
  public override call(client: APIService): Promise<GetDividendsOutput> {
    return client.instruments.getDividends(this.options);
  }
}
