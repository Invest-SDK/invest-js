import { GetAccountsRequest, GetAccountsResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetAccountsInput extends GetAccountsRequest {}

export interface GetAccountsOutput extends GetAccountsResponse {}

export class GetAccountsCommand extends BaseCommand<GetAccountsInput, Promise<GetAccountsOutput>> {
  public override call(client: APIService): Promise<GetAccountsOutput> {
    return client.users.getAccounts(this.options);
  }
}
