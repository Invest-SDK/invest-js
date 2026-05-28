import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

export class HighestValueIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `Highest(${source.getName()}, ${barCount})`);
    if (barCount <= 0) {
      throw new Error('barCount must be positive');
    }
    this._source = source;
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }
    let highest = this._source.getValue(index);
    for (let i = 1; i < this._barCount; i++) {
      const val = this._source.getValue(index - i);
      if (val.isGreaterThan(highest)) {
        highest = val;
      }
    }
    return highest;
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) {
      return false;
    }
    return index >= series.beginIndex + this._barCount - 1;
  }
}
