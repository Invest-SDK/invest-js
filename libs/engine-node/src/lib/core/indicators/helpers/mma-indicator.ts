import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

/**
 * Wilder's Modified Moving Average (MMA / RMA).
 *
 * Seed at beginIndex + barCount - 1: SMA of the first barCount values.
 * Formula thereafter: prev * (barCount-1)/barCount + current/barCount
 *
 * Used internally by RSI, ATR, ADX.
 */
export class MMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `MMA(${source.getName()}, ${barCount})`);
    if (barCount <= 0) {
      throw new Error('barCount must be positive');
    }
    this._source = source;
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    const seedIndex = series.beginIndex + this._barCount - 1;

    if (index < seedIndex) {
      return NaNValue;
    }

    if (index === seedIndex) {
      // Seed value: SMA of first barCount values starting at beginIndex
      let sum = new Decimal('0');
      for (let i = series.beginIndex; i <= seedIndex; i++) {
        sum = sum.add(this._source.getValue(i));
      }
      return sum.divide(new Decimal(this._barCount.toString()));
    }

    // prev * (n-1)/n + current/n
    const prev = this.getValue(index - 1);
    const current = this._source.getValue(index);
    const n = new Decimal(this._barCount.toString());
    return prev
      .multiply(n.subtract(new Decimal('1')))
      .divide(n)
      .add(current.divide(n));
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) {
      return false;
    }
    return index >= series.beginIndex + this._barCount - 1;
  }
}
