/**
 * Boolean rules — константные правила и обёртка над индикатором<boolean>.
 */
import { AbstractRule } from './rule';
import { Indicator } from '../indicators/indicator';
import { TradingRecord } from '../trading/trading-record';

/** BooleanRule — статически TRUE или FALSE. */
export class BooleanRule extends AbstractRule {
  static readonly TRUE = new BooleanRule(true);
  static readonly FALSE = new BooleanRule(false);

  private readonly _value: boolean;

  constructor(value: boolean) {
    super(`BooleanRule(${value})`);
    this._value = value;
  }

  isSatisfied(_index: number, _record?: TradingRecord): boolean {
    return this._value;
  }
}

/**
 * BooleanIndicatorRule — оборачивает Indicator<boolean> (например,
 * pattern-распознаватель или результат сравнения) в Rule.
 */
export class BooleanIndicatorRule extends AbstractRule {
  private readonly _indicator: Indicator<boolean>;

  constructor(indicator: Indicator<boolean>) {
    super(`BooleanIndicatorRule(${indicator.getName()})`);
    this._indicator = indicator;
  }

  isSatisfied(index: number, _record?: TradingRecord): boolean {
    if (!this._indicator.isReady(index)) return false;
    return this._indicator.getValue(index) === true;
  }
}

/**
 * FixedRule — true только на указанных индексах. Полезно в тестах.
 */
export class FixedRule extends AbstractRule {
  private readonly _indexes: ReadonlySet<number>;

  constructor(...indexes: number[]) {
    super(`FixedRule(${indexes.join(',')})`);
    this._indexes = new Set(indexes);
  }

  isSatisfied(index: number, _record?: TradingRecord): boolean {
    return this._indexes.has(index);
  }
}
