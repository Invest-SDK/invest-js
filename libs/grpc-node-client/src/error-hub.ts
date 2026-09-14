import type { ClientMiddleware } from 'nice-grpc';
import { createErrorHubClient, resolveErrorHubOptions } from './error-hub-client';
import type { ErrorHubOptions } from './error-hub-client';
import { createErrorHubMiddleware } from './error-hub-stream';

export {
  createErrorHubClient,
  createErrorHubScope,
  resolveErrorHubOptions,
  resolveErrorHubRelease,
  validateErrorHubOptions,
} from './error-hub-client';
export type { ErrorHubOptions, ErrorHubTransportFactory } from './error-hub-client';
export { isErrorHubErrorReportable, scrubErrorHubValue } from '@ttech-pub/invest-core';
export { createErrorHubMiddleware } from './error-hub-stream';

export function createConfiguredErrorHubMiddleware(
  telemetry: 'enabled' | 'disabled' | undefined,
  target: string,
  createClient: (
    options: ErrorHubOptions
  ) => ReturnType<typeof createErrorHubClient> = createErrorHubClient
): ClientMiddleware | undefined {
  if (telemetry !== undefined && telemetry !== 'enabled' && telemetry !== 'disabled') {
    throw new TypeError('telemetry must be "enabled" or "disabled"');
  }
  if (telemetry === 'disabled') {
    return undefined;
  }

  try {
    return createErrorHubMiddleware(createClient(resolveErrorHubOptions(target, true)));
  } catch {
    return undefined;
  }
}
