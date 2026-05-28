import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

/**
 * TrueRangeIndicator — True Range per bar.
 *
 * At beginIndex: TR = high - low (no previous close available, ta4j convention).
 * Elsewhere:     TR = max(high - low, |high - prevClose|, |low - prevClose|).
 */
export class TrueRangeIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'TR');
  }

  protected calculate(index: number): Decimal {
    const high = this.getHighPrice(index);
    const low = this.getLowPrice(index);
    const hl = high.subtract(low);

    if (index === this.getSeries().beginIndex) {
      return hl;
    }

    const prevClose = this.getClosePrice(index - 1);
    const hpc = high.subtract(prevClose).abs();
    const lpc = low.subtract(prevClose).abs();

    // max of three values
    let tr = hl;
    if (hpc.isGreaterThan(tr)) tr = hpc;
    if (lpc.isGreaterThan(tr)) tr = lpc;
    return tr;
  }
}
