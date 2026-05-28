import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * AroonUpIndicator — `100 * (barCount - barsSinceHighestHigh) / barCount`
 * на окне `barCount + 1` (текущий + предыдущие barCount баров).
 */
export class AroonUpIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number) {
    super(series, `AroonUp(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount) {
      return NaNValue;
    }
    let highestIdx = index;
    let highestVal = this.getHighPrice(index);
    for (let i = 1; i <= this._barCount; i++) {
      const v = this.getHighPrice(index - i);
      if (v.isGreaterThan(highestVal)) {
        highestVal = v;
        highestIdx = index - i;
      }
    }
    const barsSince = index - highestIdx;
    return new Decimal(((this._barCount - barsSince) * 100).toString()).divide(
      new Decimal(this._barCount.toString())
    );
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount;
  }
}

/** AroonDownIndicator — симметрично, по lowestLow. */
export class AroonDownIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number) {
    super(series, `AroonDown(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount) {
      return NaNValue;
    }
    let lowestIdx = index;
    let lowestVal = this.getLowPrice(index);
    for (let i = 1; i <= this._barCount; i++) {
      const v = this.getLowPrice(index - i);
      if (v.isLessThan(lowestVal)) {
        lowestVal = v;
        lowestIdx = index - i;
      }
    }
    const barsSince = index - lowestIdx;
    return new Decimal(((this._barCount - barsSince) * 100).toString()).divide(
      new Decimal(this._barCount.toString())
    );
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount;
  }
}

/** AroonOscillator — AroonUp - AroonDown. Диапазон [-100, +100]. */
export class AroonOscillatorIndicator extends AbstractIndicator<Decimal> {
  private readonly _up: AroonUpIndicator;
  private readonly _down: AroonDownIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `AroonOsc(${barCount})`);
    this._up = new AroonUpIndicator(series, barCount);
    this._down = new AroonDownIndicator(series, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._up.isReady(index) || !this._down.isReady(index)) return NaNValue;
    const u = this._up.getValue(index);
    const d = this._down.getValue(index);
    if (isNaNValue(u) || isNaNValue(d)) return NaNValue;
    return u.subtract(d);
  }
}
