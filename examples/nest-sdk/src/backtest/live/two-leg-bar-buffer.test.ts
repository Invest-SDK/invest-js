import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '@ttech-pub/invest-core';
import type { CandleSample } from '../data/candles-loader';
import { TwoLegBarBuffer } from './two-leg-bar-buffer';

function sample(time: number): CandleSample {
  const price = new Decimal('100');
  return {
    time: new Date(time),
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 1,
  };
}

describe('TwoLegBarBuffer', () => {
  test('не выдаёт пару старее последней выданной', () => {
    const buffer = new TwoLegBarBuffer();
    const current = sample(2_000);
    const stale = sample(1_000);

    assert.strictEqual(buffer.push('a', current), null);
    assert.ok(buffer.push('b', current));
    assert.strictEqual(buffer.push('a', stale), null);
    assert.strictEqual(buffer.push('b', stale), null);
    assert.strictEqual(buffer.pendingCount(), 0);
  });

  test('удаляет самый старый timestamp, а не старейшую вставку', () => {
    const buffer = new TwoLegBarBuffer();
    for (let time = 257_000; time >= 1_000; time -= 1_000) {
      buffer.push('a', sample(time));
    }

    assert.ok(buffer.push('b', sample(257_000)));
  });
});
