import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { EMAIndicator } from '../moving-average-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * TripleEMAIndicator (TEMA) — 3 * EMA - 3 * EMA(EMA) + EMA(EMA(EMA)).
 */
export class TripleEMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _ema1: EMAIndicator;
  private readonly _ema2: EMAIndicator;
  private readonly _ema3: EMAIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `TEMA(${barCount})`);
    this._ema1 = new EMAIndicator(src, barCount);
    this._ema2 = new EMAIndicator(this._ema1, barCount);
    this._ema3 = new EMAIndicator(this._ema2, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._ema3.isReady(index)) return NaNValue;
    const e1 = this._ema1.getValue(index);
    const e2 = this._ema2.getValue(index);
    const e3 = this._ema3.getValue(index);
    if (isNaNValue(e1) || isNaNValue(e2) || isNaNValue(e3)) return NaNValue;
    return e1
      .multiply(new Decimal('3'))
      .subtract(e2.multiply(new Decimal('3')))
      .add(e3);
  }
}
