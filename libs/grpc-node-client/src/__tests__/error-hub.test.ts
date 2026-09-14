import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { Envelope, Metric, SerializedMetric, Transport } from '@sentry/core';
import { dsnToString } from '@sentry/core';
import { getClient, getCurrentScope, getGlobalScope, getIsolationScope } from '@sentry/node';
import {
  ClientError,
  Metadata,
  Status,
  type CallOptions,
  type ClientMiddlewareCall,
} from 'nice-grpc';
import {
  createErrorHubClient,
  createErrorHubScope,
  createErrorHubMiddleware,
  createConfiguredErrorHubMiddleware,
  isErrorHubErrorReportable,
  resolveErrorHubOptions,
  resolveErrorHubRelease,
  scrubErrorHubValue,
} from '../error-hub';

type CapturedEvent = Record<string, unknown>;

function memoryTransport(events: CapturedEvent[], metrics: SerializedMetric[] = []) {
  return () =>
    ({
      send: async (envelope: Envelope) => {
        for (const [headers, payload] of envelope[1]) {
          if (headers.type === 'event') {
            events.push(payload as CapturedEvent);
          } else if (headers.type === 'trace_metric') {
            const container = payload as { items?: SerializedMetric[] };
            metrics.push(...structuredClone(container.items ?? []));
          }
        }
        return {};
      },
      flush: async () => true,
    }) as Transport;
}

type TestCall = ClientMiddlewareCall<unknown, unknown>;

function streamCall(
  next: (request: unknown, options: CallOptions) => AsyncGenerator<unknown, unknown, undefined>,
  responseStream = true,
  path = '/test.Service/Stream'
): TestCall {
  return {
    method: { path, requestStream: false, responseStream, options: {} },
    request: { request: true },
    responseStream,
    next,
  } as TestCall;
}

async function consume(iterable: AsyncIterable<unknown>): Promise<unknown[]> {
  const values: unknown[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
}

async function flushClient(client: ReturnType<typeof createErrorHubClient>): Promise<void> {
  await client.flush();
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function eventExtra(event: CapturedEvent): Record<string, unknown> {
  return (event.extra ?? {}) as Record<string, unknown>;
}

function captureMetrics(client: ReturnType<typeof createErrorHubClient>): Metric[] {
  const captured: Metric[] = [];
  client.on('afterCaptureMetric', (metric) => captured.push(structuredClone(metric)));
  return captured;
}

function metricByName(metrics: Metric[], name: string): Metric | undefined {
  return metrics.find((metric) => metric.name === name);
}

function assertBoundedSnapshot(value: unknown): void {
  const seen = new WeakSet<object>();

  function visit(current: unknown, depth: number): void {
    if (typeof current === 'string') {
      assert.ok(current.length <= 2_048);
      return;
    }
    if (current === null || typeof current !== 'object') {
      return;
    }
    assert.ok(!seen.has(current), 'snapshot must not retain cycles');
    seen.add(current);
    if (Array.isArray(current)) {
      assert.ok(current.length <= 50);
      if (depth < 3) {
        current.forEach((item) => visit(item, depth + 1));
      }
    } else {
      const keys = Object.keys(current);
      assert.ok(keys.length <= 50);
      if (depth < 3) {
        keys.forEach((key) => visit((current as Record<string, unknown>)[key], depth + 1));
      }
    }
  }

  visit(value, 0);
}

function countSnapshotNodes(value: unknown, seen = new WeakSet<object>()): number {
  if (value === null || typeof value !== 'object') {
    return 1;
  }
  if (seen.has(value)) {
    return 0;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return 1 + value.reduce((count, item) => count + countSnapshotNodes(item, seen), 0);
  }
  return (
    1 + Object.values(value).reduce((count, item) => count + countSnapshotNodes(item, seen), 0)
  );
}

test('built-in DSN matches pinned Python reference without exposing its value', () => {
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport([]));
  const configuredDsn = client.getOptions().dsn;
  assert.ok(
    typeof configuredDsn === 'string' || configuredDsn,
    'configured ErrorHub DSN is missing'
  );
  const configuredValue =
    typeof configuredDsn === 'string' ? configuredDsn : dsnToString(configuredDsn);
  assert.equal(
    createHash('sha256').update(configuredValue).digest('hex'),
    'd7708a4e73c2d0266329de60fd1064a1effc408b5add2f141583821c0e4844bf',
    'configured ErrorHub DSN differs from pinned Python reference'
  );
});

test('private client resolves explicit redacted defaults', () => {
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport([]));
  const options = client.getOptions();
  assert.deepEqual(
    {
      dsn: options.dsn ? '[configured]' : undefined,
      environment: options.environment,
      sampleRate: options.sampleRate,
      tracesSampleRate: options.tracesSampleRate,
      maxBreadcrumbs: options.maxBreadcrumbs,
      attachStacktrace: options.attachStacktrace,
      normalizeDepth: options.normalizeDepth,
      sendDefaultPii: options.sendDefaultPii,
      integrations: client.getIntegrationNames(),
    },
    {
      dsn: '[configured]',
      environment: 'production',
      sampleRate: 1,
      tracesSampleRate: 0.5,
      maxBreadcrumbs: 3,
      attachStacktrace: true,
      normalizeDepth: 3,
      sendDefaultPii: false,
      integrations: [],
    }
  );
  assert.equal(createErrorHubClient({}, memoryTransport([])).getOptions().sampleRate, 0.5);
});

test('internal options resolve target environment and fixed client defaults', () => {
  const defaultOptions = resolveErrorHubOptions('sandbox-invest-public-api.tbank.ru', true);
  const defaultClient = createErrorHubClient(defaultOptions, memoryTransport([]));
  assert.equal(defaultClient.getOptions().environment, 'sandbox');
  assert.equal(
    resolveErrorHubOptions('https://invest-public-api.tbank.ru', true).environment,
    'production'
  );
});

test('telemetry is enabled by default and only disabled bypasses client creation', () => {
  let clientCreations = 0;
  let capturedOptions: Record<string, unknown> | undefined;
  const createClient = (options: Record<string, unknown>) => {
    clientCreations += 1;
    capturedOptions = options;
    return createErrorHubClient({ ...options, sampleRate: 1 }, memoryTransport([]));
  };

  assert.equal(
    createConfiguredErrorHubMiddleware('disabled', 'example.test', createClient),
    undefined
  );
  assert.equal(clientCreations, 0);
  assert.equal(
    typeof createConfiguredErrorHubMiddleware(undefined, 'example.test', createClient),
    'function'
  );
  assert.equal(clientCreations, 1);
  assert.deepEqual(capturedOptions, { environment: 'production' });
  assert.equal(
    typeof createConfiguredErrorHubMiddleware(
      'enabled',
      'sandbox-invest-public-api.tbank.ru',
      createClient
    ),
    'function'
  );
  assert.equal(clientCreations, 2);
  assert.deepEqual(capturedOptions, { environment: 'sandbox' });
});

test('release is read from a version-rewritten runtime package manifest', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'error-hub-release-'));
  try {
    const sourceDirectory = path.join(fixture, 'src');
    fs.mkdirSync(sourceDirectory);
    fs.writeFileSync(
      path.join(fixture, 'package.json'),
      JSON.stringify({ name: '@ttech-pub/grpc-node-client', version: '7.8.9' })
    );
    const fixtureRequire = createRequire(path.join(sourceDirectory, 'error-hub.js'));
    assert.equal(
      resolveErrorHubRelease(fixtureRequire, ['../package.json']),
      '@ttech-pub/grpc-node-client@7.8.9'
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('sample rates outside [0, 1] reject before transport/client setup', () => {
  let transportCalls = 0;
  const transport = () => {
    transportCalls += 1;
    return { send: async () => ({}), flush: async () => true };
  };
  for (const options of [
    { sampleRate: -0.01 },
    { sampleRate: 1.01 },
    { tracesSampleRate: Number.NaN },
  ]) {
    assert.throws(() => createErrorHubClient(options, transport), RangeError);
  }
  assert.equal(transportCalls, 0);
});

test('public telemetry option rejects values other than enabled, disabled, or undefined', () => {
  for (const telemetry of [true, false, null, 'yes', {}]) {
    assert.throws(() => createConfiguredErrorHubMiddleware(telemetry as never, 'example.test'), {
      name: 'TypeError',
      message: 'telemetry must be "enabled" or "disabled"',
    });
  }
});

test('internal setup failure is fail-open after public telemetry validation', () => {
  const setupError = new Error('setup unavailable');
  assert.equal(
    createConfiguredErrorHubMiddleware('enabled', 'example.test', () => {
      throw setupError;
    }),
    undefined
  );
});

test('private client does not replace global Sentry state after stream consumption', async () => {
  const globalClient = getClient();
  const currentScope = getCurrentScope();
  const globalScope = getGlobalScope();
  const globalIntegrations = globalClient?.getIntegrationNames();
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport([]));
  assert.notEqual(client, globalClient);
  await consume(
    createErrorHubMiddleware(client)(
      streamCall(async function* () {
        yield { traceId: 'isolated' };
      }),
      {}
    )
  );
  await flushClient(client);
  assert.strictEqual(getClient(), globalClient);
  assert.strictEqual(getCurrentScope(), currentScope);
  assert.strictEqual(getGlobalScope(), globalScope);
  assert.deepEqual(getClient()?.getIntegrationNames(), globalIntegrations);
  assert.deepEqual(client.getIntegrationNames(), []);
});

test('metric envelopes do not inherit host global or isolation scope data', async () => {
  const globalScope = getGlobalScope();
  const isolationScope = getIsolationScope();
  const previousGlobalUser = globalScope.getUser();
  const previousIsolationUser = isolationScope.getUser();
  const serializedMetrics: SerializedMetric[] = [];

  globalScope.setUser({ id: 'host-global-user-secret' });
  globalScope.setAttribute('host.global.secret', 'global-attribute-secret');
  isolationScope.setUser({ email: 'host-isolation-user-secret@example.test' });
  isolationScope.setAttribute('host.isolation.secret', 'isolation-attribute-secret');

  try {
    const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport([], serializedMetrics));
    await consume(
      createErrorHubMiddleware(client)(
        streamCall(async function* () {
          yield { traceId: 'private-metric' };
        }),
        {}
      )
    );
    await flushClient(client);

    assert.ok(serializedMetrics.length >= 2);
    for (const metric of serializedMetrics) {
      assert.equal(metric.trace_id, '');
      assert.deepEqual(
        Object.keys(metric.attributes ?? {}).sort(),
        ['rpc.method', 'sentry.environment', 'sentry.release', 'stream.disconnect_reason'].sort()
      );
    }
    const envelope = JSON.stringify(serializedMetrics);
    for (const secret of [
      'host-global-user-secret',
      'global-attribute-secret',
      'host-isolation-user-secret',
      'isolation-attribute-secret',
    ]) {
      assert.equal(envelope.includes(secret), false);
    }
  } finally {
    globalScope.setUser(previousGlobalUser ?? null);
    globalScope.removeAttribute('host.global.secret');
    isolationScope.setUser(previousIsolationUser ?? null);
    isolationScope.removeAttribute('host.isolation.secret');
  }
});

test('stream events exclude host scopes, attachments, processors, and sessions', async (t) => {
  const envelopes: Envelope[] = [];
  const requestSession = { status: 'ok' };
  const isolationScope = getIsolationScope();
  const lastEventId = isolationScope.lastEventId();
  let hostProcessorCalls = 0;
  for (const scope of [getGlobalScope(), isolationScope, getCurrentScope()]) {
    const data = scope.getScopeData();
    t.mock.method(scope, 'getScopeData', () => ({
      ...data,
      extra: { hostData: 'host-extra-secret' },
      tags: { tenant: 'host-tag-secret' },
      attachments: [{ filename: 'host.txt', data: 'host-attachment-secret' }],
      sdkProcessingMetadata: { ...data.sdkProcessingMetadata, requestSession },
      eventProcessors: [
        () => {
          hostProcessorCalls += 1;
          return null;
        },
      ],
    }));
  }
  const client = createErrorHubClient({ sampleRate: 1 }, () => ({
    send: async (envelope) => {
      envelopes.push(envelope);
      return {};
    },
    flush: async () => true,
  }));
  const middleware = createErrorHubMiddleware(client);
  try {
    await consume(
      middleware(
        streamCall(async function* () {
          yield { traceId: 'private-completion' };
        }),
        {}
      )
    );
    const error = new Error('private failure');
    await assert.rejects(
      consume(
        middleware(
          streamCall(async function* () {
            yield { traceId: 'private-error' };
            throw error;
          }),
          {}
        )
      ),
      (candidate) => candidate === error
    );
    await flushClient(client);

    const items = envelopes.flatMap<Envelope[1][number]>((envelope) => envelope[1]);
    const events = items.filter(([headers]) => headers.type === 'event');
    assert.equal(events.length, 2);
    assert.equal(
      items.some(([headers]) => headers.type === 'attachment'),
      false
    );
    assert.equal(JSON.stringify(envelopes).includes('host-'), false);
    assert.equal(hostProcessorCalls, 0);
    assert.equal(requestSession.status, 'ok');
    assert.equal(isolationScope.lastEventId(), lastEventId);
    assert.deepEqual(
      events.map(([, payload]) => eventExtra(payload as CapturedEvent).trace_ids),
      [['private-completion'], ['private-error']]
    );
  } finally {
    await client.close();
  }
});

test('scrubs nested mixed-case credentials, binary values, cycles, and preserves input', () => {
  const circular: Record<string, unknown> = {
    Authorization: 'Bearer top-secret',
    nested: { API_KEY: 'key' },
  };
  circular.self = circular;
  const input = {
    message: 'Bearer message-secret',
    circular,
    values: [
      {
        userID: 'user',
        account_ids: ['a'],
        password: 'password-secret',
        clientSecret: 'client-secret',
        cookie: 'session=secret',
        orderId: 'order-secret',
        amount: 100,
        traceId: 'trace-id',
        bytes: new Uint8Array([1, 2]),
      },
    ],
  };
  const copy = structuredClone(input);
  const result = scrubErrorHubValue(input) as {
    message: string;
    circular: { Authorization: string; nested: { API_KEY: string }; self: string };
    values: Array<{
      userID: string;
      account_ids: string;
      password: string;
      clientSecret: string;
      cookie: string;
      orderId: string;
      amount: string;
      traceId: string;
      bytes: string;
    }>;
  };
  assert.deepEqual(input, copy);
  assert.equal(result.message, '[***Filtered***]');
  assert.equal(result.circular.Authorization, '[***Filtered***]');
  assert.equal(result.circular.nested.API_KEY, '[***Filtered***]');
  assert.equal(result.circular.self, '[Circular]');
  assert.equal(result.values[0].userID, '[***Filtered***]');
  assert.equal(result.values[0].account_ids, '[***Filtered***]');
  assert.equal(result.values[0].password, '[***Filtered***]');
  assert.equal(result.values[0].clientSecret, '[***Filtered***]');
  assert.equal(result.values[0].cookie, '[***Filtered***]');
  assert.equal(result.values[0].orderId, '[***Filtered***]');
  assert.equal(result.values[0].amount, '[***Filtered***]');
  assert.equal(result.values[0].traceId, 'trace-id');
  assert.equal(result.values[0].bytes, '[***Filtered***]');
});

test('scrubs sensitive URL parameters while preserving non-sensitive query values', () => {
  for (const key of ['token', 'ToKeN', 'access_token', 'api-key', 'password', 'to%6ben']) {
    const input = `request https://example.test/?${key}=query-secret&trace_id=visible&${key}=other-secret#section`;
    const expected = `request https://example.test/?${key}=[***Filtered***]&trace_id=visible&${key}=[***Filtered***]#section`;
    assert.equal(scrubErrorHubValue(input), expected);
  }
  assert.equal(
    scrubErrorHubValue('https://example.test/#access_token=fragment-secret&traceId=visible'),
    'https://example.test/#access_token=[***Filtered***]&traceId=visible'
  );
  assert.equal(
    scrubErrorHubValue('https://example.test/?redirect=https://other.test/?token=nested-secret'),
    'https://example.test/?redirect=https://other.test/?token=[***Filtered***]'
  );
});

test('exact arithmetic and business errors are dropped while near misses remain reportable', () => {
  for (const name of ['ArithmeticError', 'ZeroDivisionError', 'OverflowError']) {
    assert.equal(isErrorHubErrorReportable(Object.assign(new Error('x'), { name })), false);
  }
  assert.equal(
    isErrorHubErrorReportable(Object.assign(new Error('division by zero'), { name: 'RangeError' })),
    false
  );
  assert.equal(
    isErrorHubErrorReportable(
      Object.assign(new Error('division by zero-ish'), { name: 'RangeError' })
    ),
    true
  );
  for (const code of [30000, 39999, 50000, 59999, 80000, 99999]) {
    assert.equal(isErrorHubErrorReportable(Object.assign(new Error('rpc'), { code })), false);
  }
  for (const code of [29999, 40000, 49999, 60000, 79999]) {
    assert.equal(isErrorHubErrorReportable(Object.assign(new Error('rpc'), { code })), true);
  }
  assert.equal(isErrorHubErrorReportable(new Error('rpc'), 'status 50001'), false);
  assert.equal(isErrorHubErrorReportable(new Error('rpc'), 'status 40000'), true);
  assert.equal(
    isErrorHubErrorReportable(new Error('rpc'), undefined, { error: { code: '80001' } }),
    false
  );
  assert.equal(
    isErrorHubErrorReportable(new Error('rpc'), undefined, { message: 'unrelated 50001' }),
    true
  );
  assert.equal(isErrorHubErrorReportable(new Error('failure 50001')), false);
  assert.equal(isErrorHubErrorReportable(new Error('failure 40000')), true);
  for (const details of [
    '50001',
    '50001: invalid request',
    'error_code=50001',
    'statusCode: 80001',
  ]) {
    assert.equal(isErrorHubErrorReportable(new Error('rpc'), details), false, details);
  }
  for (const message of [
    'connect ECONNREFUSED 127.0.0.1:54321',
    'connect ECONNREFUSED [::1]:54321',
    'connect ECONNREFUSED example.test:54321',
    'timeout after 50001 ms',
    'request id 80001 failed',
  ]) {
    const error = Object.assign(new Error(message), { port: 54321 });
    assert.equal(isErrorHubErrorReportable(error, message), true, message);
  }
  assert.equal(
    isErrorHubErrorReportable(new Error('rpc'), { port: 54321, requestId: '80001' }),
    true
  );
});

test('captured report retains stack, scrubs scope data, and uses memory transport only', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const scope = createErrorHubScope(client);
  scope.setExtra('credentials', { authorization: 'Bearer hidden', accountId: 'account' });
  const error = new Error('reportable failure');
  client.captureException(error, { originalException: error }, scope);
  await client.flush();
  assert.equal(events.length, 1);
  const event = events[0] ?? {};
  const exception = event.exception as {
    values: Array<{ type: string; stacktrace?: { frames?: unknown[] } }>;
  };
  const extra = event.extra as {
    credentials: string;
  };
  assert.equal(exception.values[0]?.type, 'Error');
  assert.ok(exception.values[0]?.stacktrace?.frames?.length);
  assert.equal(extra.credentials, '[***Filtered***]');
  assert.equal(client.getOptions().sendDefaultPii, false);
  assert.deepEqual(client.getIntegrationNames(), []);
});

test('filtered exceptions do not reach transport', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const error = Object.assign(new Error('ignored'), { name: 'ArithmeticError' });
  const scope = createErrorHubScope(client);
  client.captureException(error, { originalException: error }, scope);
  await client.flush();
  assert.equal(events.length, 0);
});

test('normalizeDepth zero preserves extra-based filtering and sanitization', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient(
    { sampleRate: 1, normalizeDepth: 0 },
    memoryTransport(events)
  );
  const scope = createErrorHubScope(client);
  scope.setExtras({
    details: 'status 50001',
    trace_ids: ['private-depth-zero'],
    credentials: { authorization: 'Bearer depth-zero-secret' },
  });

  try {
    client.captureException(new Error('rpc failure'), undefined, scope);
    await client.flush();
    assert.equal(events.length, 0);

    scope.setExtra('details', 'temporary outage');
    client.captureException(new Error('reportable failure'), undefined, scope);
    await client.flush();
    assert.equal(events.length, 1);
    const extra = eventExtra(events[0] ?? {});
    assert.equal(extra.details, 'temporary outage');
    assert.deepEqual(extra.trace_ids, ['private-depth-zero']);
    assert.equal(extra.credentials, '[***Filtered***]');
    assert.equal(JSON.stringify(events).includes('depth-zero-secret'), false);
  } finally {
    await client.close();
  }
});

test('response-stream middleware bypasses unary calls without creating lifecycle state', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const response = { value: 'unary' };
  let receivedOptions: CallOptions | undefined;
  const call = streamCall(
    async function* (_request, options) {
      receivedOptions = options;
      yield* [];
      return response;
    },
    false,
    '/test.Service/Unary'
  );

  const result = await (
    createErrorHubMiddleware(client)(call, {}) as AsyncGenerator<never, unknown>
  ).next();
  assert.strictEqual(result.value, response);
  assert.equal(result.done, true);
  assert.deepEqual(receivedOptions, {});
  await flushClient(client);
  assert.equal(events.length, 0);
});

test('response-stream middleware reports normal completion once and preserves identity/order', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const capturedMetrics = captureMetrics(client);
  const first = { trackingId: 'first', value: 1 };
  const second = { traceId: 'second', value: 2 };
  const originalHeader = new Metadata({
    'x-tracking-id': 'header-id',
    'x-ratelimit-limit': '300,MarketDataStream',
    'x-ratelimit-remaining': '17',
  });
  const originalTrailer = new Metadata({
    'x-tracking-id': 'trailer-id',
    'x-ratelimit-reset': '42',
  });
  const headers: Metadata[] = [];
  const trailers: Metadata[] = [];
  const call = streamCall(async function* (_request, options) {
    options.onHeader?.(originalHeader);
    yield first;
    yield second;
    options.onTrailer?.(originalTrailer);
  });

  const values = await consume(
    createErrorHubMiddleware(client)(call, {
      onHeader: (metadata) => headers.push(metadata),
      onTrailer: (metadata) => trailers.push(metadata),
    })
  );
  await flushClient(client);

  assert.deepEqual(values, [first, second]);
  assert.strictEqual(values[0], first);
  assert.strictEqual(values[1], second);
  assert.strictEqual(headers[0], originalHeader);
  assert.strictEqual(trailers[0], originalTrailer);
  assert.equal(headers.length, 1);
  assert.equal(trailers.length, 1);
  assert.equal(events.length, 1);
  const extra = eventExtra(events[0] ?? {});
  assert.equal((events[0] ?? {}).message, 'gRPC response stream terminated');
  assert.equal(extra.path, '/test.Service/Stream');
  assert.equal(extra.disconnect_reason, 'completed');
  assert.ok(typeof extra.started_at === 'string' && !Number.isNaN(Date.parse(extra.started_at)));
  assert.ok(typeof extra.ended_at === 'string' && !Number.isNaN(Date.parse(extra.ended_at)));
  assert.ok(typeof extra.duration_seconds === 'number' && Number.isFinite(extra.duration_seconds));
  assert.ok((extra.duration_seconds as number) >= 0);
  assert.deepEqual(extra.trace_ids, ['header-id', 'first', 'second', 'trailer-id']);
  assert.deepEqual(extra.last_message, { traceId: 'second', value: '[***Filtered***]' });
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.connections')?.value, 1);
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.ratelimit.limit')?.value, 300);
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.ratelimit.remaining')?.value, 17);
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.ratelimit.reset')?.value, 42);
  const duration = metricByName(capturedMetrics, 'invest.sdk.stream.duration');
  assert.equal(duration?.type, 'distribution');
  assert.equal(duration?.unit, 'second');
  assert.ok(typeof duration?.value === 'number' && duration.value >= 0);
  assert.equal(duration?.attributes?.['rpc.method'], '/test.Service/Stream');
  assert.equal(duration?.attributes?.['stream.disconnect_reason'], 'completed');
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.errors'), undefined);
});

test('response-stream middleware reports ECONNREFUSED with a five-digit port, code, stack, and original identity', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const capturedMetrics = captureMetrics(client);
  const details = 'connect ECONNREFUSED 127.0.0.1:54321';
  const error = new ClientError('/test.Service/Stream', Status.UNAVAILABLE, details);
  const call = streamCall(async function* () {
    yield { value: 'before-error', trace_id: 'error-trace' };
    throw error;
  });

  let thrown: unknown;
  try {
    await consume(createErrorHubMiddleware(client)(call, {}));
  } catch (candidate) {
    thrown = candidate;
  }
  await flushClient(client);

  assert.strictEqual(thrown, error);
  assert.equal(events.length, 1);
  const captured = events[0] ?? {};
  const extra = eventExtra(captured);
  assert.equal(extra.path, '/test.Service/Stream');
  assert.equal(extra.disconnect_reason, 'grpc_error');
  assert.equal(extra.grpc_code, Status.UNAVAILABLE);
  assert.equal(extra.details, details);
  const exception = captured.exception as {
    values?: Array<{ stacktrace?: { frames?: unknown[] } }>;
  };
  assert.ok(exception.values?.[0]?.stacktrace?.frames?.length);
  const errorMetric = metricByName(capturedMetrics, 'invest.sdk.stream.errors');
  assert.equal(errorMetric?.type, 'counter');
  assert.equal(errorMetric?.value, 1);
  assert.equal(errorMetric?.attributes?.['rpc.method'], '/test.Service/Stream');
  assert.equal(errorMetric?.attributes?.['stream.disconnect_reason'], 'grpc_error');
  assert.equal(errorMetric?.attributes?.['rpc.grpc.status_code'], Status.UNAVAILABLE);
});

test('stream capture scrubs Bearer and URL credentials without mutating the original error for host Sentry', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const details =
    'Bearer capture-secret request failed: https://example.test/?token=query-secret&traceId=visible';
  const error = new ClientError('/test.Service/Stream', Status.UNAVAILABLE, details);
  error.stack = `${error.name}: ${error.message}\n    at stream (https://example.test/app.js?api_key=stack-secret:1:1)`;
  const originalMessage = error.message;
  const originalStack = error.stack;
  const call = streamCall(async function* () {
    yield* [];
    throw error;
  });

  try {
    await assert.rejects(
      consume(createErrorHubMiddleware(client)(call, {})),
      (candidate) => candidate === error
    );
    await flushClient(client);
    assert.equal(events.length, 1);
    assert.equal(
      eventExtra(events[0]).details,
      '[***Filtered***] request failed: https://example.test/?token=[***Filtered***]&traceId=visible'
    );
    assert.equal(Object.prototype.hasOwnProperty.call(error, '__sentry_captured__'), false);
    const serialized = JSON.stringify(events[0]);
    assert.equal(serialized.includes('capture-secret'), false);
    assert.equal(serialized.includes('query-secret'), false);
    assert.equal(serialized.includes('stack-secret'), false);
    assert.equal(error.details, details);
    assert.equal(error.message, originalMessage);
    assert.equal(error.stack, originalStack);
  } finally {
    await client.close();
  }
});

test('response-stream middleware classifies abort and consumer close once', async () => {
  const abortEvents: CapturedEvent[] = [];
  const abortClient = createErrorHubClient({ sampleRate: 1 }, memoryTransport(abortEvents));
  const abortController = new AbortController();
  const abortCall = streamCall(async function* (_request, options) {
    yield { traceId: 'abort-trace' };
    options.onTrailer?.(new Metadata({ 'x-tracking-id': 'abort-trailer' }));
    await new Promise<void>((resolve) => {
      options.signal?.addEventListener('abort', () => resolve(), { once: true });
    });
  });
  const abortIterator = createErrorHubMiddleware(abortClient)(abortCall, {
    signal: abortController.signal,
  });
  assert.deepEqual(await abortIterator.next(), { value: { traceId: 'abort-trace' }, done: false });
  abortController.abort();
  await abortIterator.return?.(undefined);
  await flushClient(abortClient);
  assert.equal(abortEvents.length, 1);
  assert.equal(eventExtra(abortEvents[0] ?? {}).disconnect_reason, 'aborted');

  const closeEvents: CapturedEvent[] = [];
  const closeClient = createErrorHubClient({ sampleRate: 1 }, memoryTransport(closeEvents));
  let upstreamReturns = 0;
  const closeCall = streamCall(async function* () {
    try {
      yield { traceId: 'close-trace' };
      await new Promise<void>(() => undefined);
    } finally {
      upstreamReturns += 1;
    }
  });
  const closeIterator = createErrorHubMiddleware(closeClient)(closeCall, {});
  assert.deepEqual(await closeIterator.next(), { value: { traceId: 'close-trace' }, done: false });
  await closeIterator.return?.(undefined);
  await flushClient(closeClient);
  assert.equal(upstreamReturns, 1);
  assert.equal(closeEvents.length, 1);
  assert.equal(eventExtra(closeEvents[0] ?? {}).disconnect_reason, 'consumer_close');
});

test('filtered stream errors attempt no ErrorHub event while application error remains unchanged', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const capturedMetrics = captureMetrics(client);
  const error = Object.assign(new Error('ignored arithmetic'), { name: 'ArithmeticError' });
  const call = streamCall(async function* () {
    yield* [];
    throw error;
  });

  await assert.rejects(
    consume(createErrorHubMiddleware(client)(call, {})),
    (candidate) => candidate === error
  );
  await flushClient(client);
  assert.equal(events.length, 0);
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.connections')?.value, 1);
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.duration')?.type, 'distribution');
  assert.equal(metricByName(capturedMetrics, 'invest.sdk.stream.errors'), undefined);
});

test('response snapshot is sanitized, cycle-safe, and bounded at depth, entries, strings, nodes, and trace IDs', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  const hostile: Record<string, unknown> = {
    message: `Bearer message-secret ${'x'.repeat(3_000)}`,
    Authorization: 'Bearer secret',
    accountId: 'account-secret',
    nested: {
      UsEr_Id: 'user-secret',
      API_KEY: 'api-key-secret',
      bytes: new Uint8Array([1, 2, 3]),
      note: 'Bearer nested-secret',
      clientCode: 'client-code-secret',
      accruedInterest: 42,
      profit: 21,
      status: 'session=secret; balance=999',
      code: 'client-secret-token',
      statusCode: '50001',
    },
    deep: { level: { tooDeep: { value: 'deep' } } },
    values: Array.from({ length: 80 }, (_, index) => ({ traceId: `trace-${index}` })),
    wide: Object.fromEntries(Array.from({ length: 80 }, (_, index) => [`key-${index}`, index])),
  };
  hostile.self = hostile;
  const call = streamCall(async function* () {
    for (let index = 0; index < 75; index += 1) {
      yield { traceId: `old-${index}` };
    }
    yield hostile;
  });

  await consume(createErrorHubMiddleware(client)(call, {}));
  await flushClient(client);

  assert.equal(events.length, 1);
  const extra = eventExtra(events[0] ?? {});
  const snapshot = extra.last_message as Record<string, unknown>;
  assert.equal(snapshot.Authorization, '[***Filtered***]');
  assert.equal(snapshot.accountId, '[***Filtered***]');
  assert.equal(snapshot.self, '[Circular]');
  assert.equal(snapshot.message, '[***Filtered***]');
  assert.equal(Object.keys(snapshot.wide as object).length, 50);
  const nested = snapshot.nested as Record<string, unknown>;
  assert.equal(nested.UsEr_Id, '[***Filtered***]');
  assert.equal(nested.API_KEY, '[***Filtered***]');
  assert.equal(nested.bytes, '[***Filtered***]');
  assert.equal(nested.clientCode, '[***Filtered***]');
  assert.equal(nested.accruedInterest, '[***Filtered***]');
  assert.equal(nested.profit, '[***Filtered***]');
  assert.equal(nested.status, '[***Filtered***]');
  assert.equal(nested.code, '[***Filtered***]');
  assert.equal(nested.statusCode, '50001');
  assertBoundedSnapshot(snapshot);
  const retainedSnapshotNodes = countSnapshotNodes(snapshot);
  assert.ok(retainedSnapshotNodes <= 200, `retained snapshot nodes: ${retainedSnapshotNodes}`);
  assert.equal((extra.trace_ids as string[]).length, 20);
  assert.deepEqual(
    extra.trace_ids,
    Array.from({ length: 20 }, (_, index) => `trace-${30 + index}`)
  );
  const serialized = JSON.stringify(events[0]);
  for (const sensitive of [
    'message-secret',
    'account-secret',
    'user-secret',
    'api-key-secret',
    'nested-secret',
    'client-code-secret',
  ]) {
    assert.equal(serialized.includes(sensitive), false);
  }
});

test('overlapping response streams keep independent trace IDs and last messages', async () => {
  const events: CapturedEvent[] = [];
  const client = createErrorHubClient({ sampleRate: 1 }, memoryTransport(events));
  let releaseA!: () => void;
  let releaseB!: () => void;
  const gateA = new Promise<void>((resolve) => (releaseA = resolve));
  const gateB = new Promise<void>((resolve) => (releaseB = resolve));
  const callA = streamCall(
    async function* () {
      yield { traceId: 'only-a', value: 'A' };
      await gateA;
    },
    true,
    '/test.Service/A'
  );
  const callB = streamCall(
    async function* () {
      yield { traceId: 'only-b', value: 'B' };
      await gateB;
    },
    true,
    '/test.Service/B'
  );
  const iteratorA = createErrorHubMiddleware(client)(callA, {});
  const iteratorB = createErrorHubMiddleware(client)(callB, {});
  const firstA = await iteratorA.next();
  const firstB = await iteratorB.next();
  assert.deepEqual(firstA.value, { traceId: 'only-a', value: 'A' });
  assert.deepEqual(firstB.value, { traceId: 'only-b', value: 'B' });
  releaseA();
  releaseB();
  await Promise.all([iteratorA.return?.(undefined), iteratorB.return?.(undefined)]);
  await flushClient(client);

  assert.equal(events.length, 2);
  const byPath = new Map(events.map((event) => [eventExtra(event).path, eventExtra(event)]));
  assert.deepEqual(byPath.get('/test.Service/A')?.trace_ids, ['only-a']);
  assert.deepEqual(byPath.get('/test.Service/B')?.trace_ids, ['only-b']);
  assert.deepEqual(byPath.get('/test.Service/A')?.last_message, {
    traceId: 'only-a',
    value: '[***Filtered***]',
  });
  assert.deepEqual(byPath.get('/test.Service/B')?.last_message, {
    traceId: 'only-b',
    value: '[***Filtered***]',
  });
});

test('telemetry failures do not alter stream values, completion, cancellation, or thrown errors', async () => {
  let transportSendCalls = 0;
  let metricCalls = 0;
  const telemetryError = new Error('transport unavailable');
  const brokenTransport = () =>
    ({
      send: async () => {
        transportSendCalls += 1;
        throw telemetryError;
      },
      flush: async () => false,
    }) as Transport;
  const client = createErrorHubClient({ sampleRate: 1 }, brokenTransport);
  client.on('afterCaptureMetric', () => {
    metricCalls += 1;
    throw new Error('metric hook unavailable');
  });
  const values = [{ value: 1 }, { value: 2 }];
  const completeCall = streamCall(async function* () {
    yield values[0];
    yield values[1];
  });
  assert.deepEqual(await consume(createErrorHubMiddleware(client)(completeCall, {})), values);

  const originalError = new Error('application failure');
  const errorCall = streamCall(async function* () {
    yield* [];
    throw originalError;
  });
  await assert.rejects(
    consume(createErrorHubMiddleware(client)(errorCall, {})),
    (candidate) => candidate === originalError
  );
  await flushClient(client);
  transportSendCalls = 0;
  assert.ok(metricCalls > 0);

  const cancellationError = Object.assign(new Error('request cancelled'), {
    name: 'AbortError',
  });
  const cancellationController = new AbortController();
  let upstreamReturns = 0;
  const cancellationCall = streamCall(async function* (_request, options) {
    try {
      yield { traceId: 'cancelled-stream' };
      await new Promise<void>((_resolve, reject) => {
        const onAbort = () => reject(cancellationError);
        if (options.signal?.aborted) {
          onAbort();
        } else {
          options.signal?.addEventListener('abort', onAbort, { once: true });
        }
      });
    } finally {
      upstreamReturns += 1;
    }
  });
  const cancellationIterator = createErrorHubMiddleware(client)(cancellationCall, {
    signal: cancellationController.signal,
  });
  assert.deepEqual(await cancellationIterator.next(), {
    value: { traceId: 'cancelled-stream' },
    done: false,
  });
  cancellationController.abort();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await assert.rejects(
      Promise.race([
        cancellationIterator.next(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('cancellation hung')), 250);
        }),
      ]),
      (candidate) => candidate === cancellationError && candidate !== telemetryError
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
  assert.equal(upstreamReturns, 1);
  assert.deepEqual(await cancellationIterator.next(), { value: undefined, done: true });
  assert.equal(upstreamReturns, 1);
  await flushClient(client);
  assert.ok(transportSendCalls > 0);
});
