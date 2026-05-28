import { OpenSandboxAccountRequest, OpenSandboxAccountResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface OpenSandboxAccountInput extends OpenSandboxAccountRequest {}

export interface OpenSandboxAccountOutput extends OpenSandboxAccountResponse {}

/**
 * Открывает sandbox-аккаунт.
 *
 * @example
 * ```typescript
 * const res = await sdk.send(new OpenSandboxAccountCommand({ name: 'my-bot' }));
 * console.log(res.accountId);
 * ```
 */
export class OpenSandboxAccountCommand extends BaseCommand<
  OpenSandboxAccountInput,
  Promise<OpenSandboxAccountOutput>
> {
  public override call(client: APIService): Promise<OpenSandboxAccountOutput> {
    return client.sandbox.openSandboxAccount(this.options);
  }
}
