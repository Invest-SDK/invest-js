import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';
import { WMAIndicator } from './wma-indicator';

/**
 * HullMovingAverageIndicator (HMA).
 *
 * HMA = WMA( 2*WMA(price, n/2) - WMA(price, n), sqrt(n) ).
 */
export class HullMovingAverageIndicator extends AbstractIndicator<Decimal> {
  private readonly _hma: WMAIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `HMA(${barCount})`);

    const halfPeriod = Math.max(1, Math.floor(barCount / 2));
    const sqrtPeriod = Math.max(1, Math.floor(Math.sqrt(barCount)));

    const wmaHalf = new WMAIndicator(src, halfPeriod);
    const wmaFull = new WMAIndicator(src, barCount);
    const diff = new Diff2xMinus(wmaHalf, wmaFull);
    this._hma = new WMAIndicator(diff, sqrtPeriod);
  }

  protected calculate(index: number): Decimal {
    if (!this._hma.isReady(index)) return NaNValue;
    const v = this._hma.getValue(index);
    return isNaNValue(v) ? NaNValue : v;
  }
}

/** Внутренний хелпер: 2*a - b, с пробросом NaN. */
class Diff2xMinus extends AbstractIndicator<Decimal> {
  constructor(
    private readonly _a: Indicator<Decimal>,
    private readonly _b: Indicator<Decimal>
  ) {
    super(_a.getSeries(), `(2*${_a.getName()} - ${_b.getName()})`);
  }

  protected calculate(index: number): Decimal {
    if (!this._a.isReady(index) || !this._b.isReady(index)) return NaNValue;
    const a = this._a.getValue(index);
    const b = this._b.getValue(index);
    if (isNaNValue(a) || isNaNValue(b)) return NaNValue;
    return a.multiply(new Decimal('2')).subtract(b);
  }
}
