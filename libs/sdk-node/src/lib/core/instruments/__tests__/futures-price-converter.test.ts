import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import type { Future, FutureResponse, Quotation } from '@ttech-pub/grpc-node-client';
import { FuturesPriceConverter } from '../../../../index';

const quotation = (units: number, nano = 0): Quotation => ({ units, nano });

const futureFixture = (minPriceIncrement: Quotation, minPriceIncrementAmount: Quotation): Future =>
  ({ minPriceIncrement, minPriceIncrementAmount }) as Future;

describe('FuturesPriceConverter', () => {
  test('converts currency to points with manual coefficients', () => {
    const future = futureFixture(quotation(0, 500000000), quotation(2, 500000000));

    if (!future.minPriceIncrement || !future.minPriceIncrementAmount) {
      throw new Error('Future coefficient fixture is incomplete');
    }

    assert.strictEqual(
      FuturesPriceConverter.currencyToPoints(
        new Decimal('25'),
        future.minPriceIncrement,
        future.minPriceIncrementAmount
      ).toString(),
      '5'
    );
  });

  test('converts currency to points with a FutureResponse', () => {
    const response: FutureResponse = {
      instrument: futureFixture(quotation(0, 500000000), quotation(2, 500000000)),
    };

    assert.strictEqual(
      FuturesPriceConverter.currencyToPoints(new Decimal('25'), response).toString(),
      '5'
    );
  });

  test('converts points to currency with manual coefficients', () => {
    const future = futureFixture(quotation(10), quotation(12, 500000000));

    if (!future.minPriceIncrement || !future.minPriceIncrementAmount) {
      throw new Error('Future coefficient fixture is incomplete');
    }

    assert.strictEqual(
      FuturesPriceConverter.pointsToCurrency(
        new Decimal('125'),
        future.minPriceIncrement,
        future.minPriceIncrementAmount
      ).toString(),
      '156.25'
    );
  });

  test('converts points to currency with a FutureResponse', () => {
    const response: FutureResponse = {
      instrument: futureFixture(quotation(10), quotation(12, 500000000)),
    };

    assert.strictEqual(
      FuturesPriceConverter.pointsToCurrency(new Decimal('125'), response).toString(),
      '156.25'
    );
  });

  test('keeps nano-based fractional conversion exact for manual coefficients', () => {
    const future = futureFixture(quotation(0, 20000000), quotation(1));

    if (!future.minPriceIncrement || !future.minPriceIncrementAmount) {
      throw new Error('Future coefficient fixture is incomplete');
    }

    const points = FuturesPriceConverter.currencyToPoints(
      new Decimal('123.45'),
      future.minPriceIncrement,
      future.minPriceIncrementAmount
    );

    assert.strictEqual(points.toString(), '2.469');
    assert.strictEqual(
      FuturesPriceConverter.pointsToCurrency(
        points,
        future.minPriceIncrement,
        future.minPriceIncrementAmount
      ).toString(),
      '123.45'
    );
  });

  test('keeps nano-based fractional conversion exact for a FutureResponse', () => {
    const response: FutureResponse = {
      instrument: futureFixture(quotation(0, 20000000), quotation(1)),
    };

    const points = FuturesPriceConverter.currencyToPoints(new Decimal('123.45'), response);

    assert.strictEqual(points.toString(), '2.469');
    assert.strictEqual(
      FuturesPriceConverter.pointsToCurrency(points, response).toString(),
      '123.45'
    );
  });

  test('rejects a response without an instrument', () => {
    assert.throws(
      () => FuturesPriceConverter.currencyToPoints(new Decimal('1'), {} as FutureResponse),
      TypeError
    );
  });

  test('rejects a response without a min price increment', () => {
    assert.throws(
      () =>
        FuturesPriceConverter.currencyToPoints(new Decimal('1'), {
          instrument: { minPriceIncrementAmount: quotation(1) } as Future,
        }),
      TypeError
    );
  });

  test('rejects a response without a min price increment amount', () => {
    assert.throws(
      () =>
        FuturesPriceConverter.currencyToPoints(new Decimal('1'), {
          instrument: { minPriceIncrement: quotation(1) } as Future,
        }),
      TypeError
    );
  });

  test('rejects missing manual coefficients', () => {
    assert.throws(
      () =>
        FuturesPriceConverter.currencyToPoints(new Decimal('1'), undefined as never, quotation(1)),
      TypeError
    );
    assert.throws(
      () =>
        FuturesPriceConverter.currencyToPoints(new Decimal('1'), quotation(1), undefined as never),
      TypeError
    );
  });

  test('delegates malformed manual coefficients to Decimal', () => {
    assert.throws(
      () => FuturesPriceConverter.currencyToPoints(new Decimal('1'), {} as Quotation, quotation(1)),
      Error
    );
    assert.throws(
      () => FuturesPriceConverter.currencyToPoints(new Decimal('1'), quotation(1), {} as Quotation),
      Error
    );
  });

  test('rejects a zero step cost in currency to points', () => {
    assert.throws(
      () => FuturesPriceConverter.currencyToPoints(new Decimal('1'), quotation(1), quotation(0)),
      Error
    );
  });

  test('rejects a zero step in points to currency', () => {
    assert.throws(
      () => FuturesPriceConverter.pointsToCurrency(new Decimal('1'), quotation(0), quotation(1)),
      Error
    );
  });
});
