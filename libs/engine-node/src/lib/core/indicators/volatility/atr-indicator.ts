import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { MMAIndicator } from '../helpers';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';
import { TrueRangeIndicator } from './true-range-indicator';

/**
 * ATRIndicator — Average True Range.
 *
 * ATR = Wilder's MMA of TrueRange over barCount periods.
 */
export class ATRIndicator extends AbstractIndicator<Decimal> {
  private readonly _mma: MMAIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `ATR(${barCount})`);
    const tr = new TrueRangeIndicator(series);
    this._mma = new MMAIndicator(tr, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._mma.isReady(index)) {
      return NaNValue;
    }
    return this._mma.getValue(index);
  }
}
