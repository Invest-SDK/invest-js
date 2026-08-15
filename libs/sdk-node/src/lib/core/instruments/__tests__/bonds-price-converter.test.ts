import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import {
  Decimal,
  DivisionByZeroDecimalError,
  InputParamsNotValidDecimalError,
} from '@ttech-pub/invest-core';
import type { Bond, BondResponse, MoneyValue } from '@ttech-pub/grpc-node-client';
import { BondsPriceConverter } from '../../../../index';

const moneyValue = (units: number, nano = 0, currency = 'rub'): MoneyValue => ({
  currency,
  units,
  nano,
});

const bondResponse = (nominal: MoneyValue | undefined): BondResponse => ({
  instrument: { nominal } as Bond,
});

describe('BondsPriceConverter', () => {
  test('converts currency to points with a manual nominal', () => {
    const result = BondsPriceConverter.currencyToPoints(new Decimal('955'), moneyValue(1000));

    assert.ok(result instanceof Decimal);
    assert.strictEqual(result.toString(), '95.5');
  });

  test('converts currency to points with a BondResponse', () => {
    const result = BondsPriceConverter.currencyToPoints(
      new Decimal('955'),
      bondResponse(moneyValue(1000))
    );

    assert.ok(result instanceof Decimal);
    assert.strictEqual(result.toString(), '95.5');
  });

  test('converts points to currency with a manual nominal', () => {
    const result = BondsPriceConverter.pointsToCurrency(new Decimal('95.5'), moneyValue(1000));

    assert.ok(result instanceof Decimal);
    assert.strictEqual(result.toString(), '955');
  });

  test('converts points to currency with a BondResponse', () => {
    const result = BondsPriceConverter.pointsToCurrency(
      new Decimal('95.5'),
      bondResponse(moneyValue(1000))
    );

    assert.ok(result instanceof Decimal);
    assert.strictEqual(result.toString(), '955');
  });

  test('round-trips nano-based nominal exactly with a manual nominal', () => {
    const nominal = moneyValue(1, 1);
    const currency = BondsPriceConverter.pointsToCurrency(new Decimal('100'), nominal);

    assert.strictEqual(currency.toString(), '1.000000001');
    assert.strictEqual(BondsPriceConverter.currencyToPoints(currency, nominal).toString(), '100');
  });

  test('round-trips nano-based nominal exactly with a BondResponse', () => {
    const response = bondResponse(moneyValue(1, 1));
    const currency = BondsPriceConverter.pointsToCurrency(new Decimal('100'), response);

    assert.strictEqual(currency.toString(), '1.000000001');
    assert.strictEqual(BondsPriceConverter.currencyToPoints(currency, response).toString(), '100');
  });

  test('rejects a response without an instrument', () => {
    assert.throws(
      () => BondsPriceConverter.currencyToPoints(new Decimal('1'), {} as BondResponse),
      TypeError
    );
    assert.throws(
      () => BondsPriceConverter.pointsToCurrency(new Decimal('1'), {} as BondResponse),
      TypeError
    );
  });

  test('rejects a response without a nominal', () => {
    const response = bondResponse(undefined);

    assert.throws(
      () => BondsPriceConverter.currencyToPoints(new Decimal('1'), response),
      TypeError
    );
    assert.throws(
      () => BondsPriceConverter.pointsToCurrency(new Decimal('1'), response),
      TypeError
    );
  });

  test('rejects missing manual nominals', () => {
    assert.throws(
      () => BondsPriceConverter.currencyToPoints(new Decimal('1'), undefined as never),
      TypeError
    );
    assert.throws(
      () => BondsPriceConverter.pointsToCurrency(new Decimal('1'), undefined as never),
      TypeError
    );
  });

  test('delegates malformed nominal values to Decimal', () => {
    const malformed = { currency: 'rub', units: '1', nano: 0 } as unknown as MoneyValue;

    assert.throws(() => BondsPriceConverter.currencyToPoints(new Decimal('1'), malformed), Error);
    assert.throws(() => BondsPriceConverter.pointsToCurrency(new Decimal('1'), malformed), Error);
  });

  test('delegates partial manual nominals to Decimal', () => {
    const malformed = { currency: 'rub', units: 1 } as unknown as MoneyValue;

    assert.throws(
      () => BondsPriceConverter.currencyToPoints(new Decimal('1'), malformed),
      InputParamsNotValidDecimalError
    );
  });

  test('rejects zero nominal when converting currency to points', () => {
    assert.throws(
      () => BondsPriceConverter.currencyToPoints(new Decimal('1'), moneyValue(0)),
      DivisionByZeroDecimalError
    );
  });

  test('returns zero for zero nominal when converting points to currency', () => {
    assert.strictEqual(
      BondsPriceConverter.pointsToCurrency(new Decimal('1'), moneyValue(0)).toString(),
      '0'
    );
  });
});
