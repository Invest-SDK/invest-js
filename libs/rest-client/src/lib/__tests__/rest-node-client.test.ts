import assert from 'node:assert';
import test, { afterEach, beforeEach } from 'node:test';
import { InvestAPIClient } from '../rest-client';
import { EmptyURLError } from '../errors';
import * as pkg from '../../index';

const URL_A = 'http://localhost:3000';
const URL_B = 'http://localhost:3001';

type Captured = { url: string; init: RequestInit };

let captured: Captured[] = [];
let originalFetch: typeof globalThis.fetch;

function headerOf(init: RequestInit, name: string): string | undefined {
  return (init.headers as Record<string, string>)[name];
}

beforeEach(() => {
  captured = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    captured.push({ url, init });
    return {
      ok: true,
      json: async () => ({}),
      text: async () => '',
    };
  }) as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('rejects with no url', async () => {
  let error: Error | null = null;

  try {
    //@ts-expect-error allow for test
    new InvestAPIClient({});
  } catch (e) {
    error = e as Error;
  }

  assert.deepEqual(error, new EmptyURLError('Empty URL'));
});

test('build basic client from url', async () => {
  const client = new InvestAPIClient({
    url: URL_A,
  });

  assert.notEqual(client.restClient, undefined);
});

test('EmptyURLError is exported from the package root', () => {
  assert.equal(pkg.EmptyURLError, EmptyURLError);

  try {
    new InvestAPIClient({ url: '' });
    assert.fail('expected EmptyURLError');
  } catch (e) {
    assert.ok(e instanceof pkg.EmptyURLError);
  }
});

test('token becomes an Authorization header', async () => {
  const client = new InvestAPIClient({ url: URL_A, token: 't0ken' });

  await client.restClient.usersServiceGetAccounts({});

  assert.equal(headerOf(captured[0].init, 'Authorization'), 'Bearer t0ken');
});

test('explicit Authorization header wins over token', async () => {
  const client = new InvestAPIClient({
    url: URL_A,
    token: 't0ken',
    headers: { Authorization: 'Bearer explicit' },
  });

  await client.restClient.usersServiceGetAccounts({});

  assert.equal(headerOf(captured[0].init, 'Authorization'), 'Bearer explicit');
});

test('request body is the caller request, not the options object', async () => {
  const client = new InvestAPIClient({ url: URL_A, token: 't0ken' });

  await client.restClient.instrumentsServiceShares({
    instrumentStatus: 'INSTRUMENT_STATUS_BASE',
  });

  assert.deepEqual(JSON.parse(captured[0].init.body as string), {
    instrumentStatus: 'INSTRUMENT_STATUS_BASE',
  });
});

test('two clients with different tokens do not leak headers into each other', async () => {
  const a = new InvestAPIClient({ url: URL_A, token: 'token-a' });
  const b = new InvestAPIClient({ url: URL_B, token: 'token-b' });

  await Promise.all([
    a.restClient.usersServiceGetAccounts({}),
    b.restClient.usersServiceGetAccounts({}),
  ]);

  const byUrl = new Map(captured.map((c) => [new URL(c.url).port, c.init]));

  assert.equal(headerOf(byUrl.get('3000') as RequestInit, 'Authorization'), 'Bearer token-a');
  assert.equal(headerOf(byUrl.get('3001') as RequestInit, 'Authorization'), 'Bearer token-b');
});

test('a client without a token sends no Authorization', async () => {
  const withToken = new InvestAPIClient({ url: URL_A, token: 'token-a' });
  const without = new InvestAPIClient({ url: URL_B });

  await withToken.restClient.usersServiceGetAccounts({});
  await without.restClient.usersServiceGetAccounts({});

  assert.equal(headerOf(captured[1].init, 'Authorization'), undefined);
});
