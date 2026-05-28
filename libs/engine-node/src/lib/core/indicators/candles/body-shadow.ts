import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

/**
 * RealBodyIndicator — close - open (со знаком).
 *
 * Положительное значение = бычий бар, отрицательное = медвежий.
 */
export class RealBodyIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'RealBody');
  }

  protected calculate(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) return new Decimal('0');
    return bar.close.subtract(bar.open);
  }
}

/**
 * UpperShadowIndicator — high - max(open, close).
 * Длина верхней тени свечи.
 */
export class UpperShadowIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'UpperShadow');
  }

  protected calculate(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) return new Decimal('0');
    return bar.high.subtract(Decimal.max(bar.open, bar.close));
  }
}

/**
 * LowerShadowIndicator — min(open, close) - low.
 * Длина нижней тени свечи.
 */
export class LowerShadowIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'LowerShadow');
  }

  protected calculate(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) return new Decimal('0');
    return Decimal.min(bar.open, bar.close).subtract(bar.low);
  }
}
