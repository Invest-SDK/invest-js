import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * VarianceIndicator — population variance over a rolling window.
 *
 * Uses population formula (divide by n, not n-1) for ta4j parity.
 */
export class VarianceIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const sourceIndicator = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `Var(${sourceIndicator.getName()}, ${barCount})`);

    if (barCount <= 0) {
      throw new Error('barCount must be positive');
    }
    this._source = sourceIndicator;
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }

    // Compute mean of the window
    let sum = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const v = this._source.getValue(index - i);
      if (isNaNValue(v)) return NaNValue;
      sum = sum.add(v);
    }
    const n = new Decimal(this._barCount.toString());
    const mean = sum.divide(n);

    // Sum of squared deviations
    let sqSum = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const diff = this._source.getValue(index - i).subtract(mean);
      sqSum = sqSum.add(diff.multiply(diff));
    }

    return sqSum.divide(n);
  }
}
