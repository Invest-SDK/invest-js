import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { SMAIndicator } from '../moving-average-indicators';
import { NaNValue, isNaNValue } from '../nan';

/**
 * PearsonCorrelationIndicator — коэффициент корреляции Пирсона на окне.
 *
 * r = Σ((X-mx)(Y-my)) / sqrt(Σ(X-mx)² * Σ(Y-my)²). Возвращает 0 при
 * вырожденной дисперсии в одной из переменных.
 */
export class PearsonCorrelationIndicator extends AbstractIndicator<Decimal> {
  private readonly _x: Indicator<Decimal>;
  private readonly _y: Indicator<Decimal>;
  private readonly _smaX: SMAIndicator;
  private readonly _smaY: SMAIndicator;
  private readonly _barCount: number;

  constructor(x: Indicator<Decimal>, y: Indicator<Decimal>, barCount: number) {
    if (x.getSeries() !== y.getSeries()) {
      throw new Error('PearsonCorrelationIndicator: x and y must share the same BarSeries');
    }
    super(x.getSeries(), `PearsonCorr(${x.getName()}, ${y.getName()}, ${barCount})`);
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

    let sumXY = new Decimal('0');
    let sumX2 = new Decimal('0');
    let sumY2 = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const dx = this._x.getValue(index - i).subtract(mx);
      const dy = this._y.getValue(index - i).subtract(my);
      sumXY = sumXY.add(dx.multiply(dy));
      sumX2 = sumX2.add(dx.multiply(dx));
      sumY2 = sumY2.add(dy.multiply(dy));
    }
    if (sumX2.isZero() || sumY2.isZero()) return new Decimal('0');
    return sumXY.divide(sqrtDecimal(sumX2.multiply(sumY2)));
  }

  isReady(index: number): boolean {
    return this._smaX.isReady(index) && this._smaY.isReady(index);
  }
}

function sqrtDecimal(n: Decimal): Decimal {
  if (n.isZero()) return new Decimal('0');
  const epsilon = new Decimal('0.0000000001');
  let x = new Decimal(Math.sqrt(parseFloat(n.toString())).toString());
  for (let i = 0; i < 30; i++) {
    const next = x.add(n.divide(x)).divide(new Decimal('2'));
    if (next.subtract(x).abs().isLessThan(epsilon)) return next;
    x = next;
  }
  return x;
}
