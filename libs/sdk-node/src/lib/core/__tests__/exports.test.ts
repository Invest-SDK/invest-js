import assert from 'node:assert';
import test from 'node:test';
import * as sdk from '../../../index';

test('BaseCommand и APIService доступны из точки входа пакета', () => {
  assert.equal(typeof sdk.BaseCommand, 'function');

  class Noop extends sdk.BaseCommand<{ id: string }, string> {
    call(): string {
      return this.options.id;
    }
  }

  assert.equal(new Noop({ id: 'ok' }).call(), 'ok');
});

test('EmptyTokenError доступен из точки входа пакета', () => {
  assert.equal(typeof sdk.EmptyTokenError, 'function');

  assert.throws(
    () => new sdk.InvestNodeSDK({ token: '' }),
    (e: Error) => e instanceof sdk.EmptyTokenError
  );
});
