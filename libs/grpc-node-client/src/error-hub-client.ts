import { NodeClient, Scope, defaultStackParser } from '@sentry/node';
import type { ErrorEvent, Event, EventHint } from '@sentry/node';
import { Client, normalize } from '@sentry/core';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { makeErrorHubTransport } from './error-hub-transport';
import {
  DEFAULT_MAX_BREADCRUMBS,
  DEFAULT_NORMALIZE_DEPTH,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_TRACES_SAMPLE_RATE,
  ERROR_HUB_DSN,
  STREAM_CLOSED_MESSAGE,
  isErrorHubErrorReportable,
  resolveErrorHubDsn,
  resolveErrorHubEnvironment,
  scrubErrorHubValue,
} from '@ttech-pub/invest-core';

// Source tests use ESM; the published package uses CommonJS.
const moduleDirectory = typeof __dirname === 'string' ? __dirname : undefined;
const nodeRequire = moduleDirectory
  ? createRequire(join(moduleDirectory, 'error-hub-client.js'))
  : createRequire(join(process.cwd(), 'package.json'));

export interface ErrorHubOptions {
  environment?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  maxBreadcrumbs?: number;
  attachStacktrace?: boolean;
  normalizeDepth?: number;
}

const ERROR_HUB_OPTION_KEYS = new Set([
  'environment',
  'sampleRate',
  'tracesSampleRate',
  'maxBreadcrumbs',
  'attachStacktrace',
  'normalizeDepth',
]);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function validateErrorHubOptions(options: unknown = {}): asserts options is ErrorHubOptions {
  if (!isPlainObject(options)) {
    throw new TypeError('errorHub options must be a plain object');
  }
  const unsupportedKey = Reflect.ownKeys(options).find(
    (key) => typeof key !== 'string' || !ERROR_HUB_OPTION_KEYS.has(key)
  );
  if (unsupportedKey !== undefined) {
    const key = typeof unsupportedKey === 'string' ? unsupportedKey : unsupportedKey.toString();
    throw new TypeError(
      key === 'release' ? 'release cannot be overridden' : `unsupported ErrorHub option: ${key}`
    );
  }

  assertSampleRate('sampleRate', options.sampleRate);
  assertSampleRate('tracesSampleRate', options.tracesSampleRate);
  if (
    options.environment !== undefined &&
    (typeof options.environment !== 'string' ||
      options.environment.length === 0 ||
      options.environment.length > 64 ||
      options.environment === 'None' ||
      /[\s/\n\r]/.test(options.environment))
  ) {
    throw new RangeError('environment must be a valid Sentry environment name');
  }
  if (
    options.maxBreadcrumbs !== undefined &&
    (typeof options.maxBreadcrumbs !== 'number' ||
      !Number.isInteger(options.maxBreadcrumbs) ||
      options.maxBreadcrumbs < 0)
  ) {
    throw new RangeError('maxBreadcrumbs must be a non-negative integer');
  }
  if (
    options.normalizeDepth !== undefined &&
    (typeof options.normalizeDepth !== 'number' ||
      !Number.isInteger(options.normalizeDepth) ||
      options.normalizeDepth < 0)
  ) {
    throw new RangeError('normalizeDepth must be a non-negative integer');
  }
  if (options.attachStacktrace !== undefined && typeof options.attachStacktrace !== 'boolean') {
    throw new TypeError('attachStacktrace must be a boolean');
  }
}

type ErrorHubClientOptions = ConstructorParameters<typeof NodeClient>[0];
export type ErrorHubTransportFactory = ErrorHubClientOptions['transport'];

interface PackageMetadata {
  name: string;
  version: string;
}

export function resolveErrorHubRelease(
  requirePackage: NodeRequire = nodeRequire,
  candidates: readonly string[] = moduleDirectory
    ? ['../package.json', '../../package.json']
    : ['./libs/grpc-node-client/package.json', './package.json']
): string {
  for (const candidate of candidates) {
    try {
      const metadata = requirePackage(candidate) as PackageMetadata;
      return `${metadata.name}@${metadata.version}`;
    } catch {
      // Try next package location for source-tree and relocated builds.
    }
  }
  throw new Error('Unable to resolve grpc-node-client package metadata');
}

function assertSampleRate(name: string, value: unknown): asserts value is number | undefined {
  if (
    value !== undefined &&
    (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new RangeError(`${name} must be a finite number between 0 and 1`);
  }
}

function beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const original = hint.originalException;
  const extra = event.extra;
  const details =
    extra && typeof extra === 'object' ? (extra as Record<string, unknown>).details : undefined;
  const lastMessage =
    extra && typeof extra === 'object'
      ? (extra as Record<string, unknown>).last_message
      : undefined;
  const isLifecycleEvent = event.message === STREAM_CLOSED_MESSAGE && original === undefined;
  if (!isLifecycleEvent && !isErrorHubErrorReportable(original, details, lastMessage, event)) {
    return null;
  }
  return scrubErrorHubValue(event) as ErrorEvent;
}

class ErrorHubNodeClient extends NodeClient {
  // ServerRuntimeClient.captureException/captureEvent update the host request session.
  override captureException(error: unknown, hint?: EventHint, scope?: Scope): string {
    return Client.prototype.captureException.call(this, error, hint, scope);
  }

  override captureEvent(event: Event, hint?: EventHint, scope?: Scope): string {
    return Client.prototype.captureEvent.call(this, event, hint, scope);
  }

  protected override _captureEvent(event: Event, hint: EventHint = {}, scope = new Scope()) {
    return super._captureEvent(event, hint, scope, new Scope());
  }

  protected override _prepareEvent(
    event: Event,
    hint: EventHint,
    scope: Scope
  ): PromiseLike<Event> {
    // Sentry's default preparation always merges global scope, including attachments
    // and event processors. Build only from this client's event and private scope.
    const options = this.getOptions();
    const extra = { ...scope.getScopeData().extra, ...event.extra };
    hint.attachments = [];
    return Promise.resolve({
      ...event,
      event_id: event.event_id ?? hint.event_id,
      timestamp: event.timestamp ?? Date.now() / 1_000,
      release: options.release,
      environment: options.environment,
      platform: 'node',
      extra: options.normalizeDepth === 0 ? extra : normalize(extra, options.normalizeDepth),
    });
  }
}

export function createErrorHubClient(
  options: ErrorHubOptions = {},
  transport: ErrorHubTransportFactory = makeErrorHubTransport
): NodeClient {
  validateErrorHubOptions(options);

  const clientOptions = {
    // Sentry's string parser rejects the hyphenated public key used by the
    // existing endpoint. Components preserve the exact DSN while accepting it.
    dsn: resolveErrorHubDsn(),
    release: resolveErrorHubRelease(),
    environment: options.environment ?? 'production',
    sampleRate: options.sampleRate ?? DEFAULT_SAMPLE_RATE,
    tracesSampleRate: options.tracesSampleRate ?? DEFAULT_TRACES_SAMPLE_RATE,
    maxBreadcrumbs: options.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS,
    attachStacktrace: options.attachStacktrace ?? true,
    normalizeDepth: options.normalizeDepth ?? DEFAULT_NORMALIZE_DEPTH,
    sendDefaultPii: false,
    integrations: [],
    defaultIntegrations: false,
    skipOpenTelemetrySetup: true,
    transport,
    stackParser: defaultStackParser,
    beforeSend,
  } as unknown as ErrorHubClientOptions;
  const client = new ErrorHubNodeClient(clientOptions);
  // Keep configured options byte-for-byte comparable with the pinned value;
  // the client keeps parsed components internally for endpoint generation.
  clientOptions.dsn = ERROR_HUB_DSN;
  client.init();
  return client;
}

export function createErrorHubScope(client: NodeClient): Scope {
  const scope = new Scope();
  scope.setClient(client);
  return scope;
}

export function resolveErrorHubOptions(
  target: string,
  value: true | ErrorHubOptions
): ErrorHubOptions {
  if (value !== true) {
    validateErrorHubOptions(value);
  }
  const configured = value === true ? {} : value;
  const options = {
    ...configured,
    environment: configured.environment ?? resolveErrorHubEnvironment(target),
  };
  validateErrorHubOptions(options);
  return options;
}
