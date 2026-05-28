import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { EMAIndicator } from '../moving-average-indicators';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';

/**
 * MACDIndicator — Moving Average Convergence/Divergence (MACD line).
 *
 * MACD = EMA(short) - EMA(long). Стандартные параметры: 12 и 26.
 * Сигнальную линию и гистограмму см. в {@link MACDSignalIndicator} и
 * {@link MACDHistogramIndicator}.
 */
export class MACDIndicator extends AbstractIndicator<Decimal> {
  private readonly _short: EMAIndicator;
  private readonly _long: EMAIndicator;

  constructor(source: BarSeries | Indicator<Decimal>, shortBarCount = 12, longBarCount = 26) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `MACD(${shortBarCount},${longBarCount})`);
    if (shortBarCount >= longBarCount) {
      throw new Error('shortBarCount must be less than longBarCount');
    }
    this._short = new EMAIndicator(src, shortBarCount);
    this._long = new EMAIndicator(src, longBarCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._long.isReady(index)) return NaNValue;
    const s = this._short.getValue(index);
    const l = this._long.getValue(index);
    if (isNaNValue(s) || isNaNValue(l)) return NaNValue;
    return s.subtract(l);
  }
}

/** Сигнальная линия MACD — EMA(MACD, signalBarCount). */
export class MACDSignalIndicator extends AbstractIndicator<Decimal> {
  private readonly _ema: EMAIndicator;

  constructor(macd: MACDIndicator, signalBarCount = 9) {
    super(macd.getSeries(), `MACDSignal(${signalBarCount})`);
    this._ema = new EMAIndicator(macd, signalBarCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._ema.isReady(index)) return NaNValue;
    const v = this._ema.getValue(index);
    return isNaNValue(v) ? NaNValue : v;
  }
}

/** Гистограмма MACD — MACD - сигнальная линия. */
export class MACDHistogramIndicator extends AbstractIndicator<Decimal> {
  constructor(
    private readonly _macd: MACDIndicator,
    private readonly _signal: MACDSignalIndicator
  ) {
    super(_macd.getSeries(), 'MACDHistogram');
  }

  protected calculate(index: number): Decimal {
    if (!this._macd.isReady(index) || !this._signal.isReady(index)) return NaNValue;
    const m = this._macd.getValue(index);
    const s = this._signal.getValue(index);
    if (isNaNValue(m) || isNaNValue(s)) return NaNValue;
    return m.subtract(s);
  }
}
