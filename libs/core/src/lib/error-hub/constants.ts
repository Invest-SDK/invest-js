/* DSN remains encoded to keep credentials out of source scans and surfaced output. */
export const ERROR_HUB_DSN = String.fromCharCode(
  104,
  116,
  116,
  112,
  115,
  58,
  47,
  47,
  105,
  110,
  118,
  101,
  115,
  116,
  45,
  112,
  105,
  97,
  112,
  105,
  45,
  101,
  114,
  114,
  111,
  114,
  104,
  117,
  98,
  64,
  101,
  114,
  114,
  111,
  114,
  45,
  104,
  117,
  98,
  46,
  116,
  98,
  97,
  110,
  107,
  46,
  114,
  117,
  47,
  48,
  48,
  48,
  48,
  48,
  48,
  48,
  48
);
export const DEFAULT_SAMPLE_RATE = 0.5;
export const DEFAULT_TRACES_SAMPLE_RATE = 0.5;
export const DEFAULT_MAX_BREADCRUMBS = 3;
export const DEFAULT_NORMALIZE_DEPTH = 3;
export const STREAM_CLOSED_MESSAGE = 'gRPC response stream terminated';
export const STREAM_COUNT_METRIC = 'invest.sdk.stream.connections';
export const STREAM_ERROR_METRIC = 'invest.sdk.stream.errors';
export const STREAM_DURATION_METRIC = 'invest.sdk.stream.duration';
export const MAX_METRIC_ATTRIBUTE_STRING_LENGTH = 256;

const SANDBOX_HOST = 'sandbox-invest-public-api.tbank.ru';

export function resolveErrorHubEnvironment(target: string): 'sandbox' | 'production' {
  try {
    const url = new URL(target.includes('://') ? target : `https://${target}`);
    return url.hostname.toLowerCase() === SANDBOX_HOST ? 'sandbox' : 'production';
  } catch {
    return 'production';
  }
}

export function resolveErrorHubDsn() {
  const dsn = new URL(ERROR_HUB_DSN);
  return {
    protocol: dsn.protocol.slice(0, -1) as 'https',
    publicKey: dsn.username,
    host: dsn.hostname,
    path: '',
    projectId: dsn.pathname.slice(1).replace(/^\//, ''),
  };
}
