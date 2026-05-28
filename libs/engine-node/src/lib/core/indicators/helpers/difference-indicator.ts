import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue, isNaNValue } from '../nan';

export class DifferenceIndicator extends AbstractIndicator<Decimal> {
  private readonly _left: Indicator<Decimal>;
  private readonly _right: Indicator<Decimal>;

  constructor(left: Indicator<Decimal>, right: Indicator<Decimal>) {
    super(left.getSeries(), `Diff(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
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
    return l.subtract(r);
  }
}
