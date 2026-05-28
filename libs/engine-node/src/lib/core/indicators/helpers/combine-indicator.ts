import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue, isNaNValue } from '../nan';

export class CombineIndicator extends AbstractIndicator<Decimal> {
  private readonly _left: Indicator<Decimal>;
  private readonly _right: Indicator<Decimal>;
  private readonly _op: (a: Decimal, b: Decimal) => Decimal;

  constructor(
    left: Indicator<Decimal>,
    right: Indicator<Decimal>,
    op: (a: Decimal, b: Decimal) => Decimal,
    name?: string
  ) {
    super(left.getSeries(), name ?? `Combine(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
    this._op = op;
  }

  protected calculate(index: number): Decimal {
    if (!this._left.isReady(index) || !this._right.isReady(index)) {
      return NaNValue;
    }
    const l = this._left.getValue(index);
    const r = this._right.getValue(index);
    if (isNaNValue(l) || isNaNValue(r)) {
      return NaNValue;
    }
    return this._op(l, r);
  }
}
