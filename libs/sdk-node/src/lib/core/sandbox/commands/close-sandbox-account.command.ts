import {
  CloseSandboxAccountRequest,
  CloseSandboxAccountResponse,
} from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface CloseSandboxAccountInput extends CloseSandboxAccountRequest {}

export interface CloseSandboxAccountOutput extends CloseSandboxAccountResponse {}

/**
 * Закрывает sandbox-аккаунт. Симметричен `OpenSandboxAccountCommand`.
 */
export class CloseSandboxAccountCommand extends BaseCommand<
  CloseSandboxAccountInput,
  Promise<CloseSandboxAccountOutput>
> {
  public override call(client: APIService): Promise<CloseSandboxAccountOutput> {
    return client.sandbox.closeSandboxAccount(this.options);
  }
}
