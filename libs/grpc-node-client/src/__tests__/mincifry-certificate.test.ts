import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { downloadMincifryCertificate, MINCIFRY_CERTIFICATE_URL } from '../mincifry-certificate';
import { NodeApiClient } from '../index';

const certificate = `-----BEGIN CERTIFICATE-----
test-certificate
-----END CERTIFICATE-----`;

test('fails when the Mincifry certificate archive cannot be downloaded', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503, statusText: 'Unavailable' });

  try {
    await assert.rejects(downloadMincifryCertificate(), {
      message: 'Failed to download Mincifry certificate: 503 Unavailable',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fails when the Mincifry certificate is missing from the archive', async () => {
  const originalFetch = globalThis.fetch;
  const archive = zipSync({ 'other.pem': strToU8(certificate) });
  globalThis.fetch = async () => new Response(archive, { status: 200 });

  try {
    await assert.rejects(downloadMincifryCertificate(), {
      message: 'Mincifry certificate archive does not contain russiantrustedca.pem',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NodeApiClient downloads the Mincifry certificate once and reuses the cache', async () => {
  const originalFetch = globalThis.fetch;
  const archive = zipSync({ 'russiantrustedca.pem': strToU8(certificate) });
  let fetchCount = 0;

  globalThis.fetch = async (url) => {
    fetchCount += 1;
    assert.equal(url, MINCIFRY_CERTIFICATE_URL);
    return new Response(archive, { status: 200 });
  };

  try {
    const [first, second] = await Promise.all([
      NodeApiClient.create({ token: 'token', useMincifryCertificate: true }),
      NodeApiClient.create({ token: 'token', useMincifryCertificate: true }),
    ]);

    assert.ok(first instanceof NodeApiClient);
    assert.ok(second instanceof NodeApiClient);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
