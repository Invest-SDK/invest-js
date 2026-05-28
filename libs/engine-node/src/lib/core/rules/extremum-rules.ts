/**
 * Extremum / range rules.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { AbstractRule } from './rule';
import { Indicator } from '../indicators/indicator';
import { isNaNValue } from '../indicators/nan';

/**
 * IsHighestRule — текущее значение индикатора — максимум за окно `barCount`.
 */
export class IsHighestRule extends AbstractRule {
  constructor(
    private readonly _indicator: Indicator<Decimal>,
    private readonly _barCount: number
  ) {
    super(`IsHighestRule(${_indicator.getName()}, ${_barCount})`);
    if (_barCount <= 0) throw new Error('barCount must be positive');
  }

  isSatisfied(index: number): boolean {
    const current = this._indicator.getValue(index);
    if (isNaNValue(current)) return false;
    const start = Math.max(0, index - this._barCount + 1);
    for (let i = start; i <= index; i++) {
      if (i === index) continue;
      const v = this._indicator.getValue(i);
      if (isNaNValue(v)) return false;
      if (v.isGreaterThan(current)) return false;
    }
    return true;
  }
}

/** IsLowestRule — симметрия. */
export class IsLowestRule extends AbstractRule {
  constructor(
    private readonly _indicator: Indicator<Decimal>,
    private readonly _barCount: number
  ) {
    super(`IsLowestRule(${_indicator.getName()}, ${_barCount})`);
    if (_barCount <= 0) throw new Error('barCount must be positive');
  }

  isSatisfied(index: number): boolean {
    const current = this._indicator.getValue(index);
    if (isNaNValue(current)) return false;
    const start = Math.max(0, index - this._barCount + 1);
    for (let i = start; i <= index; i++) {
      if (i === index) continue;
      const v = this._indicator.getValue(i);
      if (isNaNValue(v)) return false;
      if (v.isLessThan(current)) return false;
    }
    return true;
  }
}

/**
 * InPipeRule — значение индикатора в коридоре [lower, upper] включительно.
 * lower/upper могут быть фиксированными Decimal или индикаторами.
 */
export class InPipeRule extends AbstractRule {
  private readonly _indicator: Indicator<Decimal>;
  private readonly _upper: Indicator<Decimal> | Decimal;
  private readonly _lower: Indicator<Decimal> | Decimal;

  constructor(
    indicator: Indicator<Decimal>,
    upper: Indicator<Decimal> | Decimal,
    lower: Indicator<Decimal> | Decimal
  ) {
    super(`InPipeRule(${indicator.getName()})`);
    this._indicator = indicator;
    this._upper = upper;
    this._lower = lower;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) return false;
    const value = this._indicator.getValue(index);
    const upper = this.resolve(this._upper, index);
    const lower = this.resolve(this._lower, index);
    if (!upper || !lower) return false;
    return value.isLessThanOrEqual(upper) && value.isGreaterThanOrEqual(lower);
  }

  private resolve(bound: Indicator<Decimal> | Decimal, index: number): Decimal | null {
    if (bound instanceof Decimal) return bound;
    if (!bound.isReady(index)) return null;
    const v = bound.getValue(index);
    return isNaNValue(v) ? null : v;
  }
}
