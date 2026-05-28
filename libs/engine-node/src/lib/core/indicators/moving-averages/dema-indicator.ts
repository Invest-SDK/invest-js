import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { EMAIndicator } from '../moving-average-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * DoubleEMAIndicator (DEMA) — 2 * EMA - EMA(EMA).
 */
export class DoubleEMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _ema: EMAIndicator;
  private readonly _emaOfEma: EMAIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `DEMA(${barCount})`);
    this._ema = new EMAIndicator(src, barCount);
    this._emaOfEma = new EMAIndicator(this._ema, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._emaOfEma.isReady(index)) return NaNValue;
    const a = this._ema.getValue(index);
    const b = this._emaOfEma.getValue(index);
    if (isNaNValue(a) || isNaNValue(b)) return NaNValue;
    return a.multiply(new Decimal('2')).subtract(b);
  }
}
