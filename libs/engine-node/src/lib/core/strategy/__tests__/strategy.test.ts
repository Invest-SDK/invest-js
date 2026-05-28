import { test } from 'node:test';
import assert from 'node:assert';
import { TradingRecord, PositionType } from '../../trading/trading-record';
import { Rule } from '../../rules/rule';
import { BaseStrategy } from '../strategy';

// Minimal Rule implementation for tests — value is fixed at construction time.
function fixedRule(value: boolean, name = `Fixed(${value})`): Rule {
  return {
    getName: () => name,
    isSatisfied: () => value,
    and(other: Rule): Rule {
      return fixedRule(value && other.isSatisfied(0), `${name} AND ${other.getName()}`);
    },
    or(other: Rule): Rule {
      return fixedRule(value || other.isSatisfied(0), `${name} OR ${other.getName()}`);
    },
    not(): Rule {
      return fixedRule(!value, `NOT(${name})`);
    },
  };
}

// Helper: open a LONG position on the TradingRecord
import { Decimal } from '@ttech-pub/invest-core';
function openRecord(): TradingRecord {
  const r = new TradingRecord(PositionType.LONG);
  r.entry(0, new Decimal('100'), new Decimal('1'));
  return r;
}

test('BaseStrategy - shouldEnter returns false when position is opened', () => {
  const strategy = new BaseStrategy(fixedRule(true), fixedRule(false));
  const record = openRecord();
  assert.strictEqual(strategy.shouldEnter(1, record), false);
});

test('BaseStrategy - shouldEnter returns true when no position and rule satisfied', () => {
  const strategy = new BaseStrategy(fixedRule(true), fixedRule(false));
  const record = new TradingRecord();
  assert.strictEqual(strategy.shouldEnter(1, record), true);
});

test('BaseStrategy - shouldExit returns false when position is not opened', () => {
  const strategy = new BaseStrategy(fixedRule(false), fixedRule(true));
  const record = new TradingRecord();
  assert.strictEqual(strategy.shouldExit(1, record), false);
});

test('BaseStrategy - shouldExit returns true when position is opened and exit rule satisfied', () => {
  const strategy = new BaseStrategy(fixedRule(false), fixedRule(true));
  const record = openRecord();
  assert.strictEqual(strategy.shouldExit(1, record), true);
});

test('BaseStrategy - shouldOperate delegates to shouldExit when position opened', () => {
  const strategy = new BaseStrategy(fixedRule(true), fixedRule(true));
  const record = openRecord();
  // Exit rule is true and position is open → shouldOperate returns true
  assert.strictEqual(strategy.shouldOperate(1, record), true);
});

test('BaseStrategy - shouldOperate delegates to shouldEnter when no position', () => {
  const strategy = new BaseStrategy(fixedRule(true), fixedRule(false));
  const record = new TradingRecord();
  assert.strictEqual(strategy.shouldOperate(1, record), true);
});

test('BaseStrategy - unstableBars: shouldEnter returns false for indices below threshold', () => {
  const strategy = new BaseStrategy('s', fixedRule(true), fixedRule(true), 5);
  const record = new TradingRecord();
  assert.strictEqual(strategy.shouldEnter(4, record), false);
  assert.strictEqual(strategy.shouldEnter(5, record), true);
});

test('BaseStrategy - and() combines entry with AND, exit with OR', () => {
  // entry: true AND false = false; exit: false OR true = true
  const s1 = new BaseStrategy(fixedRule(true, 'E1'), fixedRule(false, 'X1'));
  const s2 = new BaseStrategy(fixedRule(false, 'E2'), fixedRule(true, 'X2'));
  const combined = s1.and(s2);

  const noPos = new TradingRecord();
  const opened = openRecord();

  assert.strictEqual(combined.shouldEnter(1, noPos), false, 'entry AND = false');
  assert.strictEqual(combined.shouldExit(1, opened), true, 'exit OR = true');
});

test('BaseStrategy - and() with both entries true enters', () => {
  const s1 = new BaseStrategy(fixedRule(true, 'E1'), fixedRule(false, 'X1'));
  const s2 = new BaseStrategy(fixedRule(true, 'E2'), fixedRule(false, 'X2'));
  const combined = s1.and(s2);
  assert.strictEqual(combined.shouldEnter(1, new TradingRecord()), true);
});

test('BaseStrategy - or() combines entry with OR, exit with AND', () => {
  // entry: false OR true = true; exit: true AND false = false
  const s1 = new BaseStrategy(fixedRule(false, 'E1'), fixedRule(true, 'X1'));
  const s2 = new BaseStrategy(fixedRule(true, 'E2'), fixedRule(false, 'X2'));
  const combined = s1.or(s2);

  const noPos = new TradingRecord();
  const opened = openRecord();

  assert.strictEqual(combined.shouldEnter(1, noPos), true, 'entry OR = true');
  assert.strictEqual(combined.shouldExit(1, opened), false, 'exit AND = false');
});

test('BaseStrategy - opposite() swaps entry and exit rules', () => {
  const s = new BaseStrategy(fixedRule(true, 'entry'), fixedRule(false, 'exit'));
  const opp = s.opposite();

  const noPos = new TradingRecord();
  const opened = openRecord();

  // Original entry (true) is now exit → exit satisfied
  assert.strictEqual(opp.shouldExit(1, opened), true);
  // Original exit (false) is now entry → entry not satisfied
  assert.strictEqual(opp.shouldEnter(1, noPos), false);
});

test('BaseStrategy - getName returns provided name', () => {
  const s = new BaseStrategy('MyStrat', fixedRule(true), fixedRule(false));
  assert.strictEqual(s.getName(), 'MyStrat');
});

test('BaseStrategy - default name when using 2-arg constructor', () => {
  const s = new BaseStrategy(fixedRule(true), fixedRule(false));
  assert.strictEqual(s.getName(), 'BaseStrategy');
});

test('BaseStrategy - and() unstableBars is max of both', () => {
  const s1 = new BaseStrategy('a', fixedRule(true), fixedRule(true), 3);
  const s2 = new BaseStrategy('b', fixedRule(true), fixedRule(true), 7);
  assert.strictEqual(s1.and(s2).getUnstableBars(), 7);
  assert.strictEqual(s2.and(s1).getUnstableBars(), 7);
});
