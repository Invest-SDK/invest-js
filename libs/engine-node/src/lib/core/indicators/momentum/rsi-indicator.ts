import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { GainIndicator, LossIndicator, MMAIndicator } from '../helpers';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * ZeroOnNaNIndicator — wraps a source indicator and replaces NaN with zero.
 *
 * Required because GainIndicator/LossIndicator return NaN at beginIndex, which
 * causes MMAIndicator's seed sum to crash (Decimal rejects 'NaN' as arithmetic input).
 * By coercing NaN→0 we get a clean MMA seed and the RSI warm-up is handled by the
 * explicit index guard in RSIIndicator.calculate.
 */
class ZeroOnNaNIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;

  constructor(source: Indicator<Decimal>) {
    super(source.getSeries(), source.getName());
    this._source = source;
  }

  protected calculate(index: number): Decimal {
    const v = this._source.getValue(index);
    return isNaNValue(v) ? new Decimal('0') : v;
  }

  isReady(index: number): boolean {
    return this._source.getSeries().isValidIndex(index);
  }
}

/**
 * RSIIndicator - Relative Strength Index (Индекс относительной силы)
 *
 * Formula: RSI = 100 - 100 / (1 + RS), where RS = avgGain / avgLoss.
 * Gain/Loss smoothing uses Wilder's MMA.
 */
export class RSIIndicator extends AbstractIndicator<Decimal> {
  private readonly _avgGain: MMAIndicator;
  private readonly _avgLoss: MMAIndicator;
  private readonly _barCount: number;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const sourceIndicator = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `RSI(${barCount})`);

    this._barCount = barCount;
    // Wrap Gain/Loss so their NaN at beginIndex becomes 0, preventing MMA seed crash.
    const gain = new ZeroOnNaNIndicator(new GainIndicator(sourceIndicator));
    const loss = new ZeroOnNaNIndicator(new LossIndicator(sourceIndicator));
    this._avgGain = new MMAIndicator(gain, barCount);
    this._avgLoss = new MMAIndicator(loss, barCount);
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    // MMA seeds at beginIndex + barCount - 1 using gain[beginIndex]=0 (NaN coerced).
    // The seed is artificially deflated. True RSI warm-up requires barCount+1 bars
    // (first valid gain is at beginIndex+1). Return NaN for the seed bar.
    if (index < series.beginIndex + this._barCount) {
      return NaNValue;
    }

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
