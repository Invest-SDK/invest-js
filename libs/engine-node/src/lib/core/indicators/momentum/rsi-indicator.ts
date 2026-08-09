import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { GainIndicator, LossIndicator, MMAIndicator } from '../helpers';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * RSIIndicator - Relative Strength Index (Индекс относительной силы)
 *
 * Formula: RSI = 100 - 100 / (1 + RS), where RS = avgGain / avgLoss.
 * Gain/Loss smoothing uses Wilder's MMA seeded from the first `barCount` real
 * price changes, so RSI first becomes ready at `beginIndex + barCount`.
 */
export class RSIIndicator extends AbstractIndicator<Decimal> {
  private readonly _avgGain: MMAIndicator;
  private readonly _avgLoss: MMAIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const sourceIndicator = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `RSI(${barCount})`);

    const gain = new GainIndicator(sourceIndicator);
    const loss = new LossIndicator(sourceIndicator);
    this._avgGain = new MMAIndicator(gain, barCount, 1);
    this._avgLoss = new MMAIndicator(loss, barCount, 1);
  }

  protected calculate(index: number): Decimal {
    if (!this._avgGain.isReady(index) || !this._avgLoss.isReady(index)) {
      return NaNValue;
    }

    const avgLoss = this._avgLoss.getValue(index);

    // ta4j: if avgLoss == 0, RSI = 100 regardless of avgGain (including avgGain == 0)
    if (avgLoss.isZero()) {
      return new Decimal('100');
    }

    const avgGain = this._avgGain.getValue(index);
    if (isNaNValue(avgGain)) {
      return NaNValue;
    }

    const rs = avgGain.divide(avgLoss);
    // RSI = 100 - 100 / (1 + RS)
    return new Decimal('100').subtract(new Decimal('100').divide(new Decimal('1').add(rs)));
  }
}
