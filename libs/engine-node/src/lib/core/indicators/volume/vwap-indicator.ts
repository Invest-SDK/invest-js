import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * VWAPIndicator — Volume-Weighted Average Price на скользящем окне.
 *
 * VWAP = Σ(typicalPrice * volume) / Σ(volume) на окне `barCount`.
 * При нулевом объёме окна возвращает typicalPrice последнего бара.
 */
export class VWAPIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number) {
    super(series, `VWAP(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }
    let pv = new Decimal('0');
    let vol = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const bar = this.getBar(index - i);
      if (!bar) return NaNValue;
      pv = pv.add(bar.typicalPrice.multiply(bar.volume));
      vol = vol.add(bar.volume);
    }
    if (vol.isZero()) {
      const last = this.getBar(index);
      return last ? last.typicalPrice : NaNValue;
    }
    return pv.divide(vol);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount - 1;
  }
}
