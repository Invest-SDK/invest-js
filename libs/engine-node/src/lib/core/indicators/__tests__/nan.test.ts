import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import { NaNValue, isNaNValue } from '../nan';

test('NaNValue is instanceof Decimal', () => {
  assert.ok(NaNValue instanceof Decimal);
});

test('isNaNValue returns true for NaNValue', () => {
  assert.strictEqual(isNaNValue(NaNValue), true);
});

test('isNaNValue returns false for a regular Decimal', () => {
  assert.strictEqual(isNaNValue(new Decimal('0')), false);
  assert.strictEqual(isNaNValue(new Decimal('42')), false);
});

test('NaNValue.toString() returns "NaN"', () => {
  assert.strictEqual(NaNValue.toString(), 'NaN');
});

test('isNaNValue returns false for non-object values', () => {
  assert.strictEqual(isNaNValue(null), false);
  assert.strictEqual(isNaNValue(undefined), false);
  assert.strictEqual(isNaNValue(0), false);
  assert.strictEqual(isNaNValue('NaN'), false);
});
