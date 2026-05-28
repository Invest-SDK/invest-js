/**
 * ZScoreIndicator: (source - SMA) / StdDev на скользящем окне.
 *
 * Готов с момента, когда готов StdDev (тот же warm-up, что у source: barCount).
 * При нулевой дисперсии возвращает 0 (плоский ряд — нет сигнала).
 */

import { Decimal } from '@ttech-pub/invest-core';
import {
  AbstractIndicator,
  Indicator,
  SMAIndicator,
  StandardDeviationIndicator,
  isNaNValue,
  NaNValue,
} from '@ttech-pub/invest-engine-node';

export class ZScoreIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _sma: SMAIndicator;
  private readonly _stddev: StandardDeviationIndicator;

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `ZScore(${source.getName()}, ${barCount})`);
    if (barCount < 2) throw new Error('barCount must be >= 2');
    this._source = source;
    this._sma = new SMAIndicator(source, barCount);
    this._stddev = new StandardDeviationIndicator(source, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._sma.isReady(index) || !this._stddev.isReady(index)) return NaNValue;
    const mean = this._sma.getValue(index);
    const sd = this._stddev.getValue(index);
    if (isNaNValue(mean) || isNaNValue(sd)) return NaNValue;
    if (sd.isZero()) return new Decimal('0');
    return this._source.getValue(index).subtract(mean).divide(sd);
  }

  isReady(index: number): boolean {
    return this._sma.isReady(index) && this._stddev.isReady(index);
  }
}
