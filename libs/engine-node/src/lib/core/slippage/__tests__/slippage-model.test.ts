import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import {
  ZeroSlippageModel,
  FixedBpsSlippageModel,
  SpreadFractionSlippageModel,
} from '../slippage-model';

function bar(o: number, h: number, l: number, c: number): Bar {
  return new Bar({
    time: new Date(),
    open: new Decimal(o.toString()),
    high: new Decimal(h.toString()),
    low: new Decimal(l.toString()),
    close: new Decimal(c.toString()),
    volume: new Decimal('1'),
  });
}

test('ZeroSlippageModel returns price unchanged', () => {
  const m = new ZeroSlippageModel();
  assert.equal(m.apply(new Decimal('100'), 'buy').toString(), '100');
  assert.equal(m.apply(new Decimal('100'), 'sell').toString(), '100');
});

test('FixedBpsSlippageModel: buy up, sell down by bps', () => {
  // 10 bps = 0.1%
  const m = new FixedBpsSlippageModel(new Decimal('10'));
  // 100 * 1.001 = 100.1
  assert.equal(m.apply(new Decimal('100'), 'buy').toString(), '100.1');
  assert.equal(m.apply(new Decimal('100'), 'sell').toString(), '99.9');
});

test('SpreadFractionSlippageModel: buy moves toward high, sell toward low', () => {
  // close=100, high=102, low=98. fraction=0.5
  const m = new SpreadFractionSlippageModel(new Decimal('0.5'));
  const b = bar(100, 102, 98, 100);
  // buy: 100 + 0.5 * (102 - 100) = 101
  assert.equal(m.apply(new Decimal('100'), 'buy', b).toString(), '101');
  // sell: 100 - 0.5 * (100 - 98) = 99
  assert.equal(m.apply(new Decimal('100'), 'sell', b).toString(), '99');
});
