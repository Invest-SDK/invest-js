import { SandboxPayInRequest, SandboxPayInResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface SandboxPayInInput extends SandboxPayInRequest {}

export interface SandboxPayInOutput extends SandboxPayInResponse {}

/**
 * Пополняет sandbox-аккаунт.
 *
 * @example
 * ```typescript
 * await sdk.send(new SandboxPayInCommand({
 *   accountId,
 *   amount: { currency: 'rub', units: 100000, nano: 0 },
 * }));
 * ```
 */
export class SandboxPayInCommand extends BaseCommand<
  SandboxPayInInput,
  Promise<SandboxPayInOutput>
> {
  public override call(client: APIService): Promise<SandboxPayInOutput> {
    return client.sandbox.sandboxPayIn(this.options);
  }
}
