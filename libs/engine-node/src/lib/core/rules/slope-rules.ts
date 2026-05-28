/**
 * Slope rules — направление движения индикатора.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { AbstractRule } from './rule';
import { Indicator } from '../indicators/indicator';
import { isNaNValue } from '../indicators/nan';

/**
 * IsRisingRule — значения индикатора строго растут на последних `barCount` барах
 * с допуском `minStrength` ∈ [0, 1] (1 = монотонно растут все шаги; 0.5 = хотя
 * бы половина шагов растущие).
 */
export class IsRisingRule extends AbstractRule {
  private readonly _indicator: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _minStrength: number;

  constructor(indicator: Indicator<Decimal>, barCount: number, minStrength = 1) {
    super(`IsRisingRule(${indicator.getName()}, ${barCount}, ${minStrength})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    if (minStrength < 0 || minStrength > 1) {
      throw new Error('minStrength must be in [0, 1]');
    }
    this._indicator = indicator;
    this._barCount = barCount;
    this._minStrength = minStrength;
  }

  isSatisfied(index: number): boolean {
    if (index - this._barCount < 0) return false;
    let upSteps = 0;
    for (let i = index - this._barCount + 1; i <= index; i++) {
      if (i <= 0) return false;
      const curr = this._indicator.getValue(i);
      const prev = this._indicator.getValue(i - 1);
      if (isNaNValue(curr) || isNaNValue(prev)) return false;
      if (curr.isGreaterThan(prev)) upSteps++;
    }
    return upSteps / this._barCount >= this._minStrength;
  }
}

/** IsFallingRule — симметричное правило для убывания. */
export class IsFallingRule extends AbstractRule {
  private readonly _indicator: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _minStrength: number;

  constructor(indicator: Indicator<Decimal>, barCount: number, minStrength = 1) {
    super(`IsFallingRule(${indicator.getName()}, ${barCount}, ${minStrength})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    if (minStrength < 0 || minStrength > 1) {
      throw new Error('minStrength must be in [0, 1]');
    }
    this._indicator = indicator;
    this._barCount = barCount;
    this._minStrength = minStrength;
  }

  isSatisfied(index: number): boolean {
    if (index - this._barCount < 0) return false;
    let downSteps = 0;
    for (let i = index - this._barCount + 1; i <= index; i++) {
      if (i <= 0) return false;
      const curr = this._indicator.getValue(i);
      const prev = this._indicator.getValue(i - 1);
      if (isNaNValue(curr) || isNaNValue(prev)) return false;
      if (curr.isLessThan(prev)) downSteps++;
    }
    return downSteps / this._barCount >= this._minStrength;
  }
}
