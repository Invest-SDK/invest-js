import { GetAccountsRequest, GetAccountsResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetSandboxAccountsInput extends GetAccountsRequest {}

export interface GetSandboxAccountsOutput extends GetAccountsResponse {}

/**
 * Возвращает список sandbox-аккаунтов токена.
 *
 * @example
 * ```typescript
 * const res = await sdk.send(new GetSandboxAccountsCommand({}));
 * for (const a of res.accounts) console.log(a.id, a.name);
 * ```
 */
export class GetSandboxAccountsCommand extends BaseCommand<
  GetSandboxAccountsInput,
  Promise<GetSandboxAccountsOutput>
> {
  public override call(client: APIService): Promise<GetSandboxAccountsOutput> {
    return client.sandbox.getSandboxAccounts(this.options);
  }
}
