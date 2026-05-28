import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * ChaikinMoneyFlowIndicator (CMF).
 *
 * mfMultiplier = ((close - low) - (high - close)) / (high - low);
 *   при high == low → 0 (нет диапазона).
 * mfVolume = mfMultiplier * volume.
 * CMF = Σ(mfVolume) / Σ(volume) на окне `barCount`. Диапазон [-1, +1].
 */
export class ChaikinMoneyFlowIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number) {
    super(series, `CMF(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }
    let sumMf = new Decimal('0');
    let sumVol = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const bar = this.getBar(index - i);
      if (!bar) return NaNValue;
      const range = bar.high.subtract(bar.low);
      if (!range.isZero()) {
        const multiplier = bar.close
          .subtract(bar.low)
          .subtract(bar.high.subtract(bar.close))
          .divide(range);
        sumMf = sumMf.add(multiplier.multiply(bar.volume));
      }
      sumVol = sumVol.add(bar.volume);
    }
    if (sumVol.isZero()) return new Decimal('0');
    return sumMf.divide(sumVol);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount - 1;
  }
}
