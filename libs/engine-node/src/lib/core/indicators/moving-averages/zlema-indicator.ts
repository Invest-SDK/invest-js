import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { ClosePriceIndicator } from '../price-indicators';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * ZLEMAIndicator — Zero-Lag Exponential Moving Average (Ehlers).
 *
 * lag = (barCount - 1) / 2;
 * dePriced[i] = price[i] + (price[i] - price[i - lag]);
 * ZLEMA = EMA(dePriced, barCount), seeded SMA-стилем как обычный EMA.
 */
export class ZLEMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _lag: number;
  private readonly _multiplier: Decimal;

  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const src = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `ZLEMA(${barCount})`);
    if (barCount <= 1) throw new Error('barCount must be > 1');
    this._source = src;
    this._barCount = barCount;
    this._lag = Math.floor((barCount - 1) / 2);
    this._multiplier = new Decimal('2').divide(new Decimal((barCount + 1).toString()));
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    const seedIndex = series.beginIndex + this._lag + this._barCount - 1;
    if (index < seedIndex) return NaNValue;

    if (index === seedIndex) {
      // SMA от de-priced серии на первых barCount баров с поправкой на lag.
      let sum = new Decimal('0');
      for (let i = 0; i < this._barCount; i++) {
        sum = sum.add(this.dePriced(seedIndex - i));
      }
      return sum.divide(new Decimal(this._barCount.toString()));
    }

    const prev = this.getValue(index - 1);
    const cur = this.dePriced(index);
    return cur.subtract(prev).multiply(this._multiplier).add(prev);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._lag + this._barCount - 1;
  }

  private dePriced(index: number): Decimal {
    const price = this._source.getValue(index);
    const lagged = this._source.getValue(index - this._lag);
    return price.add(price.subtract(lagged));
  }
}
