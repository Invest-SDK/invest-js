import { InstrumentsRequest, BondsResponse } from '@ttech-pub/grpc-web-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetBondsInput extends InstrumentsRequest {}

export interface GetBondsOutput extends BondsResponse {}

export class GetBondsCommand extends BaseCommand<GetBondsInput, Promise<GetBondsOutput>> {
  public override call(client: APIService): Promise<GetBondsOutput> {
    return client.instruments.bonds(this.options);
  }
}
