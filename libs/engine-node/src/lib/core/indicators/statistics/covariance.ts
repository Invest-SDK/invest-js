import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { SMAIndicator } from '../moving-average-indicators';
import { NaNValue, isNaNValue } from '../nan';

/**
 * CovarianceIndicator — population covariance двух источников на окне.
 *
 * Cov(X, Y) = (1/n) * Σ((X[i] - meanX) * (Y[i] - meanY)).
 */
export class CovarianceIndicator extends AbstractIndicator<Decimal> {
  private readonly _x: Indicator<Decimal>;
  private readonly _y: Indicator<Decimal>;
  private readonly _smaX: SMAIndicator;
  private readonly _smaY: SMAIndicator;
  private readonly _barCount: number;

  constructor(x: Indicator<Decimal>, y: Indicator<Decimal>, barCount: number) {
    if (x.getSeries() !== y.getSeries()) {
      // Pair-trading с двумя разными сериями требует выравнивания по времени —
      // это не задача индикатора. Поднимаем ошибку, чтобы случайно не сравнить
      // несинхронные данные.
      throw new Error('CovarianceIndicator: x and y must share the same BarSeries');
    }
    super(x.getSeries(), `Cov(${x.getName()}, ${y.getName()}, ${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._x = x;
    this._y = y;
    this._smaX = new SMAIndicator(x, barCount);
    this._smaY = new SMAIndicator(y, barCount);
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    if (!this._smaX.isReady(index) || !this._smaY.isReady(index)) return NaNValue;
    const mx = this._smaX.getValue(index);
    const my = this._smaY.getValue(index);
    if (isNaNValue(mx) || isNaNValue(my)) return NaNValue;
    let acc = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const dx = this._x.getValue(index - i).subtract(mx);
      const dy = this._y.getValue(index - i).subtract(my);
      acc = acc.add(dx.multiply(dy));
    }
    return acc.divide(new Decimal(this._barCount.toString()));
  }

  isReady(index: number): boolean {
    return this._smaX.isReady(index) && this._smaY.isReady(index);
  }
}
