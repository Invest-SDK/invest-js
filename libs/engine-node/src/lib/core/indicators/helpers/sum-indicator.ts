import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

export class SumIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `Sum(${source.getName()}, ${barCount})`);
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
    let total = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      total = total.add(this._source.getValue(index - i));
    }
    return total;
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) {
      return false;
    }
    return index >= series.beginIndex + this._barCount - 1;
  }
}
