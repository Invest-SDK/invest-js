import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

/**
 * Wilder's Modified Moving Average (MMA / RMA).
 *
 * Seed starts at `beginIndex + seedOffset` and averages `barCount` values.
 * `seedOffset` defaults to 0; use it to skip source warm-up values such as the
 * undefined first price change used by RSI.
 * Formula thereafter: prev * (barCount-1)/barCount + current/barCount
 *
 * Used internally by RSI, ATR, ADX.
 */
export class MMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _seedOffset: number;

  constructor(source: Indicator<Decimal>, barCount: number, seedOffset = 0) {
    super(source.getSeries(), `MMA(${source.getName()}, ${barCount})`);
    if (barCount <= 0) {
      throw new Error('barCount must be positive');
    }
    if (!Number.isInteger(seedOffset) || seedOffset < 0) {
      throw new Error('seedOffset must be a non-negative integer');
    }
    this._source = source;
    this._barCount = barCount;
    this._seedOffset = seedOffset;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    const seedStart = series.beginIndex + this._seedOffset;
    const seedIndex = seedStart + this._barCount - 1;

    if (index < seedIndex) {
      return NaNValue;
    }

    if (index === seedIndex) {
      // Seed value: SMA of barCount real source values starting at the configured offset.
      let sum = new Decimal('0');
      for (let i = seedStart; i <= seedIndex; i++) {
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
    return index >= series.beginIndex + this._seedOffset + this._barCount - 1;
  }
}
