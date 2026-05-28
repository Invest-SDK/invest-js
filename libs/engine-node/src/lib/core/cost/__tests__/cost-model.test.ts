import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import {
  ZeroCostModel,
  LinearTransactionCostModel,
  FixedTransactionCostModel,
} from '../cost-model';

test('ZeroCostModel returns 0', () => {
  const m = new ZeroCostModel();
  assert.equal(m.calculate(new Decimal('100'), new Decimal('5')).toString(), '0');
});

test('LinearTransactionCostModel returns coefficient * notional', () => {
  const m = new LinearTransactionCostModel(new Decimal('0.001'));
  assert.equal(m.calculate(new Decimal('100'), new Decimal('5')).toString(), '0.5');
});

test('FixedTransactionCostModel returns flat fee', () => {
  const m = new FixedTransactionCostModel(new Decimal('1.5'));
  assert.equal(m.calculate(new Decimal('100'), new Decimal('5')).toString(), '1.5');
});

test('LinearTransactionCostModel rejects negative coefficient', () => {
  assert.throws(() => new LinearTransactionCostModel(new Decimal('-0.01')));
});
