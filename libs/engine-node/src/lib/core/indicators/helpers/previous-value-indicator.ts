import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

export class PreviousValueIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _n: number;

  constructor(source: Indicator<Decimal>, n = 1) {
    super(source.getSeries(), `Prev(${source.getName()}, ${n})`);
    if (n <= 0) {
      throw new Error('n must be positive');
    }
    this._source = source;
    this._n = n;
  }

  protected calculate(index: number): Decimal {
    const prevIndex = index - this._n;
    if (prevIndex < this.getSeries().beginIndex || !this._source.isReady(prevIndex)) {
      return NaNValue;
    }
    return this._source.getValue(prevIndex);
  }
}
