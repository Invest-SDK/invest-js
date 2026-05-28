import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * WMAIndicator — Weighted Moving Average.
 *
 * Веса линейно убывают: для barCount = n текущий бар имеет вес n,
 * предыдущий — (n-1), …, самый старый — 1. Делитель — n(n+1)/2.
 */
export class WMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _denominator: Decimal;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `WMA(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._source = src;
    this._barCount = barCount;
    this._denominator = new Decimal(((barCount * (barCount + 1)) / 2).toString());
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }
    let sum = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const weight = new Decimal((this._barCount - i).toString());
      sum = sum.add(this._source.getValue(index - i).multiply(weight));
    }
    return sum.divide(this._denominator);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount - 1;
  }

  getBarCount(): number {
    return this._barCount;
  }
}
