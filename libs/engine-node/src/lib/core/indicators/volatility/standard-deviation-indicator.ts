import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';
import { VarianceIndicator } from './variance-indicator';

/**
 * StandardDeviationIndicator — population standard deviation (sqrt of VarianceIndicator).
 *
 * Decimal has no native sqrt; Newton-Raphson is used with 30-iteration max and
 * epsilon = 1e-10 to get sufficient precision for financial use.
 */
export class StandardDeviationIndicator extends AbstractIndicator<Decimal> {
  private readonly _variance: VarianceIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    super(
      series,
      `StdDev(${source instanceof BarSeries ? 'ClosePrice' : (source as Indicator<Decimal>).getName()}, ${barCount})`
    );
    this._variance = new VarianceIndicator(source, barCount);
  }

  protected calculate(index: number): Decimal {
    const variance = this._variance.getValue(index);
    if (isNaNValue(variance)) {
      return NaNValue;
    }
    return StandardDeviationIndicator.sqrt(variance);
  }

  /** Newton-Raphson square root for Decimal. Returns 0 for input 0. */
  private static sqrt(n: Decimal): Decimal {
    if (n.isZero()) {
      return new Decimal('0');
    }

    const epsilon = new Decimal('0.0000000001');
    // Initial guess: use the numeric value as starting point
    let x = new Decimal(Math.sqrt(parseFloat(n.toString())).toString());

    for (let i = 0; i < 30; i++) {
      const xNext = x.add(n.divide(x)).divide(new Decimal('2'));
      if (xNext.subtract(x).abs().isLessThan(epsilon)) {
        return xNext;
      }
      x = xNext;
    }
    return x;
  }
}
