import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * KAMAIndicator — Kaufman's Adaptive Moving Average.
 *
 * ER (efficiency ratio) = |price[i] - price[i - barCountER]| / Σ|Δprice|
 *   за окно `barCountER`.
 * SC (smoothing constant) = (ER * (fastSC - slowSC) + slowSC)^2,
 *   где fastSC = 2/(fast+1), slowSC = 2/(slow+1).
 * KAMA[i] = KAMA[i-1] + SC * (price[i] - KAMA[i-1]). Seed = price на bar `barCountER`.
 */
export class KAMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _erBarCount: number;
  private readonly _fastSC: Decimal;
  private readonly _slowSC: Decimal;

  constructor(
    source: BarSeries | Indicator<Decimal>,
    barCountER = 10,
    barCountFastEMA = 2,
    barCountSlowEMA = 30
  ) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `KAMA(${barCountER},${barCountFastEMA},${barCountSlowEMA})`);
    if (barCountER <= 0) throw new Error('barCountER must be positive');
    this._source = src;
    this._erBarCount = barCountER;
    this._fastSC = new Decimal('2').divide(new Decimal((barCountFastEMA + 1).toString()));
    this._slowSC = new Decimal('2').divide(new Decimal((barCountSlowEMA + 1).toString()));
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    const seedIndex = series.beginIndex + this._erBarCount;
    if (index < seedIndex) return NaNValue;
    if (index === seedIndex) {
      return this._source.getValue(index);
    }
    const prev = this.getValue(index - 1);
    const cur = this._source.getValue(index);
    const er = this.efficiencyRatio(index);
    const scBase = er.multiply(this._fastSC.subtract(this._slowSC)).add(this._slowSC);
    const sc = scBase.multiply(scBase);
    return prev.add(sc.multiply(cur.subtract(prev)));
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._erBarCount;
  }

  private efficiencyRatio(index: number): Decimal {
    const cur = this._source.getValue(index);
    const ref = this._source.getValue(index - this._erBarCount);
    const change = cur.subtract(ref).abs();
    let volatility = new Decimal('0');
    for (let i = 0; i < this._erBarCount; i++) {
      const a = this._source.getValue(index - i);
      const b = this._source.getValue(index - i - 1);
      volatility = volatility.add(a.subtract(b).abs());
    }
    if (volatility.isZero()) return new Decimal('0');
    return change.divide(volatility);
  }
}
