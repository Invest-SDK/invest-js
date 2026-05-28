import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { SMAIndicator } from '../moving-average-indicators';
import { NaNValue } from '../nan';

/**
 * BollingerBandsMiddleIndicator — SMA of source over barCount (the middle band).
 */
export class BollingerBandsMiddleIndicator extends AbstractIndicator<Decimal> {
  private readonly _sma: SMAIndicator;

  constructor(source: Indicator<Decimal>, barCount = 20) {
    super(source.getSeries(), `BBM(${source.getName()}, ${barCount})`);
    this._sma = new SMAIndicator(source, barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._sma.isReady(index)) {
      return NaNValue;
    }
    return this._sma.getValue(index);
  }
}
