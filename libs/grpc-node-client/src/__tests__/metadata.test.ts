import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMetadata } from '../metadata';

test('Node client fixes x-app-name and preserves other metadata', () => {
  const metadata = createMetadata(
    {
      'x-app-name': 'node-ts-myapp',
      'x-request-id': 'request-1',
    },
    'token-1'
  );

  assert.strictEqual(metadata.get('x-app-name'), 't-invest-js-node-sdk');
  assert.strictEqual(metadata.get('x-request-id'), 'request-1');
  assert.strictEqual(metadata.get('authorization'), 'Bearer token-1');
});
