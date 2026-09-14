import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { InstrumentIdType } from '../../compiled/instruments';
import { createResponseCacheMiddleware } from '../instruments-cache';

const webRequire = createRequire(`${process.cwd()}/package.json`);

const servicePath = '/tinkoff.public.invest.api.contract.v1.InstrumentsService';
const supportedMethods = [
  'GetInstrumentBy',
  'BondBy',
  'CurrencyBy',
  'EtfBy',
  'FutureBy',
  'OptionBy',
  'ShareBy',
  'StructuredNoteBy',
  'DfaBy',
] as const;

type SupportedMethod = (typeof supportedMethods)[number];
type Middleware = ReturnType<typeof createResponseCacheMiddleware>;

type Downstream = {
  calls: number;
  response?: unknown;
  error?: Error;
  metadata?: unknown;
};

type InvokeOptions = {
  method: string;
  request: unknown;
  downstream: Downstream;
  metadata?: unknown;
  requestStream?: boolean;
  responseStream?: boolean;
};

function pathFor(method: string): string {
  return `${servicePath}/${method}`;
}

function requestFor(
  idType: InstrumentIdType,
  id: string,
  classCode?: string
): Record<string, unknown> {
  return classCode === undefined ? { idType, id } : { idType, id, classCode };
}

function instrumentFor(method: SupportedMethod): Record<string, string> {
  const instrument = {
    uid: `${method}-uid`,
    positionUid: `${method}-position-uid`,
    ticker: `${method}-ticker`,
    classCode: `${method}-class-code`,
  };

  if (method !== 'DfaBy') {
    Object.assign(instrument, { figi: `${method}-figi` });
  }

  if (method === 'DfaBy') {
    delete instrument.classCode;
  }

  return instrument;
}

function responseFor(method: SupportedMethod): unknown {
  const instrument = instrumentFor(method);
  return method === 'DfaBy' ? instrument : { instrument };
}

async function invoke(middleware: Middleware, options: InvokeOptions): Promise<unknown> {
  const requestStream = options.requestStream ?? false;
  const responseStream = options.responseStream ?? false;
  const call = {
    method: {
      path: pathFor(options.method),
      requestStream,
      responseStream,
      options: {},
    },
    request: options.request,
    requestStream,
    responseStream,
    next: async function* (...args: unknown[]) {
      options.downstream.calls += 1;
      options.downstream.metadata = (args[1] as { metadata?: unknown } | undefined)?.metadata;
      if (options.downstream.error) {
        throw options.downstream.error;
      }
      yield* [];
      return options.downstream.response;
    },
  } as unknown as Parameters<Middleware>[0];

  const result = await middleware(call, {
    metadata: options.metadata,
  } as Parameters<Middleware>[1]).next();
  assert.equal(result.done, true);
  return result.value;
}

for (const method of supportedMethods) {
  test(`${method} caches exact same-request repeats`, async () => {
    const middleware = createResponseCacheMiddleware();
    const downstream: Downstream = { calls: 0, response: responseFor(method) };
    const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, `${method}-request`);

    const first = await invoke(middleware, { method, request, downstream });
    const second = await invoke(middleware, { method, request, downstream });

    assert.strictEqual(first, downstream.response);
    assert.strictEqual(second, first);
    assert.equal(downstream.calls, 1);
  });

  test(`${method} caches a response-derived alias`, async () => {
    const middleware = createResponseCacheMiddleware();
    const downstream: Downstream = { calls: 0, response: responseFor(method) };
    const instrument = instrumentFor(method);
    const firstRequest = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid);
    const aliasRequest =
      method === 'OptionBy' || method === 'DfaBy'
        ? requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID, instrument.positionUid)
        : requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI, instrument.figi);

    const first = await invoke(middleware, { method, request: firstRequest, downstream });
    const alias = await invoke(middleware, { method, request: aliasRequest, downstream });

    assert.strictEqual(alias, first);
    assert.equal(downstream.calls, 1);
  });
}

test('GetInstrumentBy indexes every specific and universal identifier alias', async () => {
  const middleware = createResponseCacheMiddleware();
  const downstream: Downstream = { calls: 0, response: responseFor('GetInstrumentBy') };
  const instrument = instrumentFor('GetInstrumentBy');
  const first = await invoke(middleware, {
    method: 'GetInstrumentBy',
    request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    downstream,
  });

  const aliases = [
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI, instrument.figi),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID, instrument.positionUid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, instrument.ticker, instrument.classCode),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.figi),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.positionUid),
    requestFor(
      InstrumentIdType.INSTRUMENT_ID_TYPE_ID,
      `${instrument.ticker}_${instrument.classCode}`
    ),
  ];

  for (const request of aliases) {
    assert.strictEqual(
      await invoke(middleware, { method: 'GetInstrumentBy', request, downstream }),
      first
    );
  }
  assert.equal(downstream.calls, 1);
});

test('OptionBy indexes UID, position UID, ticker, and universal aliases but no FIGI', async () => {
  const middleware = createResponseCacheMiddleware();
  const downstream: Downstream = { calls: 0, response: responseFor('OptionBy') };
  const instrument = instrumentFor('OptionBy');
  const first = await invoke(middleware, {
    method: 'OptionBy',
    request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    downstream,
  });

  const aliases = [
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID, instrument.positionUid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, instrument.ticker, instrument.classCode),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.positionUid),
    requestFor(
      InstrumentIdType.INSTRUMENT_ID_TYPE_ID,
      `${instrument.ticker}_${instrument.classCode}`
    ),
  ];

  for (const request of aliases) {
    assert.strictEqual(
      await invoke(middleware, { method: 'OptionBy', request, downstream }),
      first
    );
  }
  assert.equal(downstream.calls, 1);
});

test('DfaBy indexes only UID, position UID, and their universal aliases', async () => {
  const middleware = createResponseCacheMiddleware();
  const downstream: Downstream = { calls: 0, response: responseFor('DfaBy') };
  const instrument = instrumentFor('DfaBy');
  const first = await invoke(middleware, {
    method: 'DfaBy',
    request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    downstream,
  });

  const aliases = [
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID, instrument.positionUid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.uid),
    requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_ID, instrument.positionUid),
  ];

  for (const request of aliases) {
    assert.strictEqual(await invoke(middleware, { method: 'DfaBy', request, downstream }), first);
  }
  assert.equal(downstream.calls, 1);
});

test('ticker class codes and identifier types cannot collide', async () => {
  const middleware = createResponseCacheMiddleware();
  const firstResponse = { instrument: { uid: 'uid-1', ticker: 'same', classCode: 'class-1' } };
  const secondResponse = { instrument: { uid: 'uid-2', ticker: 'same', classCode: 'class-2' } };
  const downstream: Downstream = { calls: 0, response: firstResponse };

  const firstTicker = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, 'same', 'class-1');
  const secondTicker = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, 'same', 'class-2');
  const first = await invoke(middleware, { method: 'ShareBy', request: firstTicker, downstream });
  downstream.response = secondResponse;
  const second = await invoke(middleware, { method: 'ShareBy', request: secondTicker, downstream });

  assert.strictEqual(first, firstResponse);
  assert.strictEqual(second, secondResponse);
  assert.strictEqual(
    await invoke(middleware, { method: 'ShareBy', request: firstTicker, downstream }),
    firstResponse
  );
  assert.equal(downstream.calls, 2);

  const figiResponse = { instrument: { uid: 'figi-response' } };
  const uidResponse = { instrument: { uid: 'uid-response' } };
  downstream.response = figiResponse;
  const rawId = 'raw|id,with_separator';
  const figiRequest = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI, rawId);
  const uidRequest = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, rawId);
  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request: figiRequest, downstream }),
    figiResponse
  );
  downstream.response = uidResponse;
  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request: uidRequest, downstream }),
    uidResponse
  );
  assert.equal(downstream.calls, 4);
});

test('lookup entries are isolated by RPC path and preserve response wrappers', async () => {
  const middleware = createResponseCacheMiddleware();
  const bondResponse = { instrument: { uid: 'shared-uid', figi: 'bond-figi' } };
  const shareResponse = { instrument: { uid: 'shared-uid', figi: 'share-figi' } };
  const downstream: Downstream = { calls: 0, response: bondResponse };
  const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'shared-uid');

  const bond = await invoke(middleware, { method: 'BondBy', request, downstream });
  downstream.response = shareResponse;
  const share = await invoke(middleware, { method: 'ShareBy', request, downstream });

  assert.strictEqual(bond, bondResponse);
  assert.strictEqual(share, shareResponse);
  assert.notStrictEqual(bond, share);
  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request, downstream }),
    bondResponse
  );
  assert.strictEqual(
    await invoke(middleware, { method: 'ShareBy', request, downstream }),
    shareResponse
  );
  assert.equal(downstream.calls, 2);
});

test('rejected calls and responses without recognized identifiers remain retryable', async () => {
  const rejected = createResponseCacheMiddleware();
  const failure: Downstream = { calls: 0, error: new Error('downstream failure') };
  const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'retry-uid');
  await assert.rejects(
    invoke(rejected, { method: 'BondBy', request, downstream: failure }),
    /downstream failure/
  );
  await assert.rejects(
    invoke(rejected, { method: 'BondBy', request, downstream: failure }),
    /downstream failure/
  );
  assert.equal(failure.calls, 2);

  const missing = createResponseCacheMiddleware();
  const missingDownstream: Downstream = { calls: 0, response: { instrument: {} } };
  await invoke(missing, { method: 'BondBy', request, downstream: missingDownstream });
  await invoke(missing, { method: 'BondBy', request, downstream: missingDownstream });
  assert.equal(missingDownstream.calls, 2);
});

test('unsupported methods, invalid identifiers, and streaming calls pass through twice', async () => {
  const cases = [
    {
      method: 'FindInstrument',
      request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'uid'),
    },
    { method: 'GetAssetBy', request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'uid') },
    { method: 'BondBy', request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, '') },
    { method: 'BondBy', request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, 'ticker') },
    { method: 'BondBy', request: requestFor(InstrumentIdType.INSTRUMENT_ID_UNSPECIFIED, 'uid') },
    { method: 'BondBy', request: requestFor(InstrumentIdType.UNRECOGNIZED, 'uid') },
  ];

  for (const item of cases) {
    const middleware = createResponseCacheMiddleware();
    const downstream: Downstream = { calls: 0, response: responseFor('BondBy') };
    await invoke(middleware, { ...item, downstream });
    await invoke(middleware, { ...item, downstream });
    assert.equal(downstream.calls, 2, item.method);
  }

  for (const flags of [
    { requestStream: true, responseStream: false },
    { requestStream: false, responseStream: true },
    { requestStream: true, responseStream: true },
  ]) {
    const middleware = createResponseCacheMiddleware();
    const downstream: Downstream = { calls: 0, response: responseFor('BondBy') };
    const item = {
      method: 'BondBy',
      request: requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'streamed'),
      downstream,
      ...flags,
    };
    await invoke(middleware, item);
    await invoke(middleware, item);
    assert.equal(downstream.calls, 2);
  }
});

test('each cache factory isolates metadata and exact response objects', async () => {
  const firstMiddleware = createResponseCacheMiddleware();
  const secondMiddleware = createResponseCacheMiddleware();
  const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'shared-uid');
  const firstMetadata = { requestId: 'first' };
  const secondMetadata = { requestId: 'second' };
  const firstSentinel = Symbol('first-response');
  const secondSentinel = Symbol('second-response');
  const firstResponse = { instrument: { uid: 'first' }, sentinel: firstSentinel };
  const secondResponse = { instrument: { uid: 'second' }, sentinel: secondSentinel };
  const firstDownstream: Downstream = { calls: 0, response: firstResponse };
  const secondDownstream: Downstream = { calls: 0, response: secondResponse };

  const first = await invoke(firstMiddleware, {
    method: 'BondBy',
    request,
    downstream: firstDownstream,
    metadata: firstMetadata,
  });
  const second = await invoke(secondMiddleware, {
    method: 'BondBy',
    request,
    downstream: secondDownstream,
    metadata: secondMetadata,
  });
  assert.strictEqual(
    await invoke(firstMiddleware, { method: 'BondBy', request, downstream: firstDownstream }),
    firstResponse
  );
  assert.strictEqual(
    await invoke(secondMiddleware, { method: 'BondBy', request, downstream: secondDownstream }),
    secondResponse
  );
  assert.strictEqual(first, firstResponse);
  assert.strictEqual(second, secondResponse);
  assert.strictEqual((first as typeof firstResponse).sentinel, firstSentinel);
  assert.strictEqual((second as typeof secondResponse).sentinel, secondSentinel);
  assert.strictEqual(firstDownstream.metadata, firstMetadata);
  assert.strictEqual(secondDownstream.metadata, secondMetadata);
  assert.equal(firstDownstream.calls, 1);
  assert.equal(secondDownstream.calls, 1);
});

test('cache hits preserve a non-serializable sentinel and response identity', async () => {
  const middleware = createResponseCacheMiddleware();
  const sentinel = () => 'sentinel';
  const response = { instrument: { uid: 'identity-uid' }, sentinel };
  const downstream: Downstream = { calls: 0, response };
  const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'identity-uid');

  const first = await invoke(middleware, { method: 'BondBy', request, downstream });
  const hit = await invoke(middleware, { method: 'BondBy', request, downstream });

  assert.strictEqual(first, response);
  assert.strictEqual(hit, response);
  assert.strictEqual((hit as typeof response).sentinel, sentinel);
  assert.equal(downstream.calls, 1);
});

test('cached responses expire after the fixed TTL', async () => {
  const middleware = createResponseCacheMiddleware(20);
  const firstResponse = responseFor('BondBy');
  const secondResponse = { instrument: { uid: 'refreshed-uid' } };
  const downstream: Downstream = { calls: 0, response: firstResponse };
  const request = requestFor(InstrumentIdType.INSTRUMENT_ID_TYPE_UID, 'ttl-uid');

  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request, downstream }),
    firstResponse
  );
  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request, downstream }),
    firstResponse
  );
  await new Promise((resolve) => setTimeout(resolve, 30));
  downstream.response = secondResponse;
  assert.strictEqual(
    await invoke(middleware, { method: 'BondBy', request, downstream }),
    secondResponse
  );
  assert.equal(downstream.calls, 2);
});

test('WebApiClient enables response cache by default and supports opt-out', async () => {
  type FakeFactory = {
    use(middleware: unknown): FakeFactory;
    create(definition: unknown, channel: unknown): object;
  };
  type FactoryModule = { createClientFactory: () => FakeFactory };
  type ChannelModule = { createChannel: (...args: unknown[]) => object };

  const factoryModule = webRequire('nice-grpc-web/lib/client/ClientFactory.js') as FactoryModule;
  const channelModule = webRequire('nice-grpc-web/lib/client/channel.js') as ChannelModule;
  const originalFactory = factoryModule.createClientFactory;
  const originalChannel = channelModule.createChannel;
  const used: unknown[] = [];
  const created: Array<{ factory: FakeFactory; definition: unknown; client: object }> = [];
  let finalFactory: FakeFactory | undefined;

  const makeFactory = (): FakeFactory => {
    const factory: FakeFactory = {
      use(middleware) {
        used.push(middleware);
        const next = makeFactory();
        finalFactory = next;
        return next;
      },
      create(definition) {
        const client = { factory, definition };
        created.push({ factory, definition, client });
        return client;
      },
    };
    return factory;
  };

  factoryModule.createClientFactory = makeFactory;
  channelModule.createChannel = () => ({});

  try {
    const { WebApiClient } = await import('../index');
    const client = new WebApiClient({ token: 'token' });

    assert.equal(used.length, 3, 'response cache and ErrorHub are enabled by default');
    assert.ok(finalFactory);
    assert.equal(created.length, 10);
    for (const entry of created) {
      assert.strictEqual(entry.factory, finalFactory);
    }
    assert.strictEqual(client.instruments, created[0]?.client);

    used.length = 0;
    created.length = 0;
    finalFactory = undefined;

    const uncachedClient = new WebApiClient({
      token: 'token',
      cache: { instruments: false },
    });
    assert.equal(used.length, 2, 'ErrorHub remains enabled when response cache is disabled');
    assert.ok(finalFactory);
    assert.equal(created.length, 10);
    assert.strictEqual(uncachedClient.instruments, created[0]?.client);

    used.length = 0;
    created.length = 0;
    finalFactory = undefined;

    new WebApiClient({ token: 'token', telemetry: 'enabled' });
    assert.equal(used.length, 3, 'explicit ErrorHub enable matches default middleware');

    used.length = 0;
    created.length = 0;
    finalFactory = undefined;

    new WebApiClient({
      token: 'token',
      cache: { instruments: false },
      telemetry: 'disabled',
    });
    assert.equal(used.length, 1, 'disabled ErrorHub adds no middleware');
    for (const telemetry of [true, false, null, 'yes', {}]) {
      assert.throws(() => new WebApiClient({ token: 'token', telemetry: telemetry as never }), {
        name: 'TypeError',
        message: 'telemetry must be "enabled" or "disabled"',
      });
    }
  } finally {
    factoryModule.createClientFactory = originalFactory;
    channelModule.createChannel = originalChannel;
  }
});
