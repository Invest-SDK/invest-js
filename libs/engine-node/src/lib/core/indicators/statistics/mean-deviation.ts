import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { SMAIndicator } from '../moving-average-indicators';
import { NaNValue, isNaNValue } from '../nan';

/**
 * MeanDeviationIndicator — среднее абсолютное отклонение от SMA на окне.
 *
 * MD = (1/n) * Σ|price[i] - SMA(price, n)[curr]| на окне barCount.
 * Используется как ингредиент CCI и устойчивая мера дисперсии.
 */
export class MeanDeviationIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _sma: SMAIndicator;
  private readonly _barCount: number;

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `MeanDeviation(${source.getName()}, ${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._source = source;
    this._sma = new SMAIndicator(source, barCount);
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    if (!this._sma.isReady(index)) return NaNValue;
    const mean = this._sma.getValue(index);
    if (isNaNValue(mean)) return NaNValue;
    let acc = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const v = this._source.getValue(index - i);
      acc = acc.add(v.subtract(mean).abs());
    }
    return acc.divide(new Decimal(this._barCount.toString()));
  }

  isReady(index: number): boolean {
    return this._sma.isReady(index);
  }
}
