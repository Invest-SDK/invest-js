import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';
import { BollingerBandsMiddleIndicator } from './bollinger-bands-middle-indicator';

/**
 * BollingerBandsLowerIndicator — middle - k * stdDev.
 */
export class BollingerBandsLowerIndicator extends AbstractIndicator<Decimal> {
  private readonly _middle: BollingerBandsMiddleIndicator;
  private readonly _stdDev: Indicator<Decimal>;
  private readonly _k: Decimal;

  constructor(
    middle: BollingerBandsMiddleIndicator,
    stdDev: Indicator<Decimal>,
    k: Decimal = new Decimal('2')
  ) {
    super(middle.getSeries(), `BBL(k=${k.toString()})`);
    this._middle = middle;
    this._stdDev = stdDev;
    this._k = k;
  }

  protected calculate(index: number): Decimal {
    if (!this._middle.isReady(index) || !this._stdDev.isReady(index)) {
      return NaNValue;
    }
    return this._middle.getValue(index).subtract(this._k.multiply(this._stdDev.getValue(index)));
  }
}
