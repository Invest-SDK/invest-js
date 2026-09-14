import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import * as https from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import test from 'node:test';
import * as tls from 'node:tls';
import type { Envelope } from '@sentry/core';
import { strToU8, zipSync } from 'fflate';
import { createErrorHubClient } from '../error-hub-client';
import { createConfiguredErrorHubMiddleware } from '../error-hub';
import { makeErrorHubTransport } from '../error-hub-transport';
import { downloadMincifryCertificate, MINCIFRY_CERTIFICATE_URL } from '../mincifry-certificate';

const envelope: Envelope = [
  { event_id: 'tls-test', sent_at: new Date().toISOString() },
  [[{ type: 'event' }, { message: 'test' }]],
];

test('ErrorHub downloads and trusts Mincifry alongside existing CAs without disabling TLS', async (t) => {
  const requests: https.RequestOptions[] = [];
  const options: Parameters<typeof makeErrorHubTransport>[0] = {
    url: 'https://example.test/api/envelope/',
    recordDroppedEvent: () => undefined,
    httpModule: {
      request(requestOptions, callback) {
        requests.push(requestOptions as https.RequestOptions);
        const request = new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback?.({
              statusCode: 200,
              headers: {},
              on() {
                return this;
              },
              off() {
                return this;
              },
              setEncoding() {
                return this;
              },
            });
            done();
          },
        });
        return request as ReturnType<typeof https.request>;
      },
    },
  };
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 503 })
  );

  assert.equal(createConfiguredErrorHubMiddleware('disabled', 'example.test'), undefined);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(fetchMock.mock.callCount(), 0, 'disabled diagnostics must not download');

  const fallback = makeErrorHubTransport(options);
  const fallbackResponse = await fallback.send(envelope);
  assert.equal(fallbackResponse.statusCode, 200);
  assert.equal(requests.pop()?.ca, undefined, 'download failure retains Node default trust');

  const directory = mkdtempSync(join(tmpdir(), 'error-hub-tls-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost',
      '-keyout',
      join(directory, 'key.pem'),
      '-out',
      join(directory, 'certificate.pem'),
    ],
    { stdio: 'ignore' }
  );
  const certificate = readFileSync(join(directory, 'certificate.pem'));
  const archive = zipSync({ 'russiantrustedca.pem': strToU8(certificate.toString()) });
  let finishDownload!: (response: Response) => void;
  fetchMock.mock.mockImplementation(async (url, init) => {
    assert.equal(url, MINCIFRY_CERTIFICATE_URL);
    assert.ok(init?.signal instanceof AbortSignal);
    return new Promise<Response>((resolve) => {
      finishDownload = resolve;
    });
  });

  const client = createErrorHubClient();
  t.after(() => client.close());
  const transport = makeErrorHubTransport({ ...options, bufferSize: 1 });
  const sent = transport.send(envelope);
  // flush must honor its deadline even when the certificate download is pending.
  const keepAlive = setTimeout(() => undefined, 1_000);
  try {
    assert.equal(await transport.flush(10), false);
    assert.equal(fetchMock.mock.callCount(), 2, 'clients share one certificate download');
    assert.equal(requests.length, 0, 'first event waits for the CA bundle');
    await assert.rejects(Promise.resolve(transport.send(envelope)));
  } finally {
    clearTimeout(keepAlive);
    finishDownload(new Response(archive));
  }
  assert.equal((await sent).statusCode, 200);
  assert.equal(await transport.flush(), true);
  const trusted = tls.getCACertificates?.() ?? tls.rootCertificates;
  const request = requests.pop();
  assert.deepEqual(request?.ca, [...trusted, certificate]);
  assert.notEqual(request?.rejectUnauthorized, false);
  assert.deepEqual(tls.getCACertificates?.() ?? tls.rootCertificates, trusted);
  assert.equal(https.globalAgent.options.ca, undefined);
  assert.deepEqual(await downloadMincifryCertificate(), certificate);
  assert.equal(fetchMock.mock.callCount(), 2, 'gRPC reuses the downloaded certificate');

  const configured = makeErrorHubTransport({ ...options, caCerts: 'configured-proxy-ca' });
  await configured.send(envelope);
  assert.deepEqual(requests.pop()?.ca, ['configured-proxy-ca', certificate]);

  const server = https.createServer(
    {
      key: readFileSync(join(directory, 'key.pem')),
      cert: certificate,
    },
    (incoming, response) => {
      incoming.resume();
      incoming.on('end', () => response.end('{}'));
    }
  );
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const originalNoProxy = process.env.no_proxy;
  process.env.no_proxy = 'localhost,127.0.0.1';
  t.after(() => {
    if (originalNoProxy === undefined) {
      delete process.env.no_proxy;
    } else {
      process.env.no_proxy = originalNoProxy;
    }
  });

  const trustedTransport = makeErrorHubTransport({
    url: `https://localhost:${port}/`,
    recordDroppedEvent: options.recordDroppedEvent,
  });
  const response = await trustedTransport.send(envelope);
  assert.equal(response.statusCode, 200, 'downloaded CA permits a real TLS handshake');

  const wrongHostname = makeErrorHubTransport({
    url: `https://127.0.0.1:${port}/`,
    recordDroppedEvent: options.recordDroppedEvent,
  });
  await assert.rejects(Promise.resolve(wrongHostname.send(envelope)), {
    code: 'ERR_TLS_CERT_ALTNAME_INVALID',
  });
});
