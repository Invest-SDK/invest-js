import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMetadata } from '../metadata';

test('Web client fixes x-app-name and preserves other metadata', () => {
  const metadata = createMetadata(
    undefined,
    {
      'x-app-name': 'node-ts-myapp',
      'x-request-id': 'request-1',
    },
    'token-1'
  );

  assert.strictEqual(metadata.get('x-app-name'), 't-invest-js-web-sdk');
  assert.strictEqual(metadata.get('x-request-id'), 'request-1');
  assert.strictEqual(metadata.get('authorization'), 'Bearer token-1');
});

test('Web client sends metadata from the constructor', () => {
  const metadata = createMetadata({ 'x-tracking-id': 'tracking-1' }, undefined, 'token-1');

  assert.strictEqual(metadata.get('x-tracking-id'), 'tracking-1');
});

test('Web client lets per-call metadata override the constructor', () => {
  const metadata = createMetadata(
    { 'x-request-id': 'from-constructor', 'x-tracking-id': 'tracking-1' },
    { 'x-request-id': 'from-call' },
    'token-1'
  );

  assert.strictEqual(metadata.get('x-request-id'), 'from-call');
  assert.strictEqual(metadata.get('x-tracking-id'), 'tracking-1');
});

test('Web client keeps x-app-name fixed whichever side sets it', () => {
  const metadata = createMetadata(
    { 'x-app-name': 'from-constructor' },
    { 'x-app-name': 'from-call' },
    'token-1'
  );

  assert.strictEqual(metadata.get('x-app-name'), 't-invest-js-web-sdk');
});
