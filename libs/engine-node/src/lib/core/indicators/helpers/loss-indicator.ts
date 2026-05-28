import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

export class LossIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;

  constructor(source: Indicator<Decimal>) {
    super(source.getSeries(), `Loss(${source.getName()})`);
    this._source = source;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    // No previous bar available
    if (index <= series.beginIndex) {
      return NaNValue;
    }
    if (!this._source.isReady(index) || !this._source.isReady(index - 1)) {
      return NaNValue;
    }
    // Returns absolute loss as positive Decimal
    const diff = this._source.getValue(index - 1).subtract(this._source.getValue(index));
    return diff.isPositive() ? diff : new Decimal('0');
  }
}
