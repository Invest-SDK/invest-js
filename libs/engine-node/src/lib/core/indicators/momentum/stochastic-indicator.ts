import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator, HighPriceIndicator, LowPriceIndicator } from '../price-indicators';
import { HighestValueIndicator, LowestValueIndicator } from '../helpers';
import { SMAIndicator } from '../moving-average-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * StochasticOscillatorKIndicator — линия %K.
 *
 * %K = 100 * (close - lowestLow(n)) / (highestHigh(n) - lowestLow(n)).
 * При равенстве high и low возвращает 0 (ta4j-совместимое поведение
 * для случая «плоского» окна).
 */
export class StochasticOscillatorKIndicator extends AbstractIndicator<Decimal> {
  private readonly _close: Indicator<Decimal>;
  private readonly _highest: HighestValueIndicator;
  private readonly _lowest: LowestValueIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `StochK(${barCount})`);
    this._close = new ClosePriceIndicator(series);
    this._highest = new HighestValueIndicator(new HighPriceIndicator(series), barCount);
    this._lowest = new LowestValueIndicator(new LowPriceIndicator(series), barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._highest.isReady(index) || !this._lowest.isReady(index)) {
      return NaNValue;
    }
    const high = this._highest.getValue(index);
    const low = this._lowest.getValue(index);
    if (isNaNValue(high) || isNaNValue(low)) return NaNValue;
    const range = high.subtract(low);
    if (range.isZero()) {
      return new Decimal('0');
    }
    const close = this._close.getValue(index);
    return close.subtract(low).divide(range).multiply(new Decimal('100'));
  }
}

/**
 * StochasticOscillatorDIndicator — линия %D, сглаживание %K с помощью SMA.
 *
 * Классические параметры: %D = SMA(%K, 3).
 */
export class StochasticOscillatorDIndicator extends AbstractIndicator<Decimal> {
  private readonly _sma: SMAIndicator;

  constructor(k: StochasticOscillatorKIndicator, barCount = 3) {
    super(k.getSeries(), `StochD(${barCount})`);
    this._sma = new SMAIndicator(k, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._sma.isReady(index)) return NaNValue;
    const v = this._sma.getValue(index);
    return isNaNValue(v) ? NaNValue : v;
  }
}
