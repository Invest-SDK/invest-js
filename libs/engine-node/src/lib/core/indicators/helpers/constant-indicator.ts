import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

export class ConstantIndicator extends AbstractIndicator<Decimal> {
  private readonly _value: Decimal;

  constructor(series: BarSeries, value: Decimal) {
    super(series, `Constant(${value.toString()})`);
    this._value = value;
  }

  protected calculate(_index: number): Decimal {
    return this._value;
  }

  isReady(index: number): boolean {
    return this.getSeries().isValidIndex(index);
  }
}
