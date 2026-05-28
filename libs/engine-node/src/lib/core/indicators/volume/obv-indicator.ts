import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

/**
 * OnBalanceVolumeIndicator (OBV).
 *
 * obv[0] = 0;
 * obv[i] = obv[i-1] + volume[i], если close[i] > close[i-1];
 *        = obv[i-1] - volume[i], если close[i] < close[i-1];
 *        = obv[i-1] иначе.
 */
export class OnBalanceVolumeIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'OBV');
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index === series.beginIndex) {
      return new Decimal('0');
    }
    const prev = this.getValue(index - 1);
    const close = this.getClosePrice(index);
    const prevClose = this.getClosePrice(index - 1);
    const volume = this.getVolume(index);
    if (close.isGreaterThan(prevClose)) return prev.add(volume);
    if (close.isLessThan(prevClose)) return prev.subtract(volume);
    return prev;
  }
}
