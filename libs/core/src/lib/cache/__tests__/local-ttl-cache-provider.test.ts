import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalTTLCacheProvider } from '../local-ttl-cache-provider';

test('returns values before TTL and misses after fixed expiration', async () => {
  const cache = new LocalTTLCacheProvider({ defaultTtl: 20 });
  const value = { id: 'instrument' };

  await cache.set('key', value);
  assert.strictEqual(await cache.get('key'), value);

  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(await cache.get('key'), undefined);
  await cache.clear();
});

test('updates size stats after TTL expiration', async () => {
  const cache = new LocalTTLCacheProvider({ defaultTtl: 20 });

  await cache.set('key', 'value');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(await cache.get('key'), undefined);

  assert.equal(cache.getStats().size, 0);
});
