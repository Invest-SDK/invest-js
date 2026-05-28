import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * MoneyFlowIndexIndicator (MFI).
 *
 * RawMoneyFlow[i] = typicalPrice[i] * volume[i].
 * Positive flow — баров где typicalPrice вырос, negative — где упал.
 * MFI = 100 - 100 / (1 + posFlow / negFlow) на окне `barCount`.
 */
export class MoneyFlowIndexIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number) {
    super(series, `MFI(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    // Нужно barCount значений + предыдущий бар для сравнения typical price.
    if (index < series.beginIndex + this._barCount) {
      return NaNValue;
    }
    let posFlow = new Decimal('0');
    let negFlow = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const cur = this.getBar(index - i);
      const prev = this.getBar(index - i - 1);
      if (!cur || !prev) return NaNValue;
      const flow = cur.typicalPrice.multiply(cur.volume);
      if (cur.typicalPrice.isGreaterThan(prev.typicalPrice)) {
        posFlow = posFlow.add(flow);
      } else if (cur.typicalPrice.isLessThan(prev.typicalPrice)) {
        negFlow = negFlow.add(flow);
      }
    }
    if (negFlow.isZero()) {
      return posFlow.isZero() ? new Decimal('50') : new Decimal('100');
    }
    const ratio = posFlow.divide(negFlow);
    return new Decimal('100').subtract(new Decimal('100').divide(new Decimal('1').add(ratio)));
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount;
  }
}
