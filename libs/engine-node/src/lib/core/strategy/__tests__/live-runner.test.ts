import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../../bar/bar';
import { BarSeries } from '../../bar/bar-series';
import { BaseStrategy } from '../strategy';
import { FixedRule } from '../../rules/boolean-rules';
import { LiveStrategyRunner } from '../live-runner';

function bar(time: Date, price: number): Bar {
  return new Bar({
    time,
    open: new Decimal(price.toString()),
    high: new Decimal(price.toString()),
    low: new Decimal(price.toString()),
    close: new Decimal(price.toString()),
    volume: new Decimal('1'),
  });
}

test('LiveStrategyRunner emits OrderIntent on entry and exit', () => {
  const series = new BarSeries({ name: 'T' }, []);
  // Entry на индексе 1, exit на индексе 3.
  const strategy = new BaseStrategy('rsi', new FixedRule(1), new FixedRule(3));
  const runner = new LiveStrategyRunner(series, strategy);

  const i0 = runner.push(bar(new Date(2024, 0, 1), 100));
  assert.equal(i0, null);

  const i1 = runner.push(bar(new Date(2024, 0, 2), 101));
  assert.ok(i1);
  assert.equal(i1.side, 'buy');
  assert.equal(i1.quantity.toString(), '1');
  assert.equal(i1.type, 'market');
  assert.equal(i1.index, 1);

  // Подтверждаем fill — иначе record не знает о позиции и exit не сработает.
  runner.recordFill(i1, new Decimal('101'), new Decimal('0'));

  const i2 = runner.push(bar(new Date(2024, 0, 3), 102));
  assert.equal(i2, null);

  const i3 = runner.push(bar(new Date(2024, 0, 4), 103));
  assert.ok(i3);
  assert.equal(i3.side, 'sell');
  assert.equal(i3.quantity.toString(), '1');
});

test('LiveStrategyRunner returns null when sizer yields 0', () => {
  const series = new BarSeries({ name: 'T' }, []);
  const strategy = new BaseStrategy('always', new FixedRule(0), new FixedRule(99));
  const runner = new LiveStrategyRunner(series, strategy, {
    positionSizer: {
      size: () => new Decimal('0'),
      getName: () => 'NullSizer',
    },
  });
  const intent = runner.push(bar(new Date(2024, 0, 1), 100));
  assert.equal(intent, null);
});
