import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from '../indicator';
import { NaNValue } from '../nan';

/**
 * SimpleLinearRegressionIndicator — линейная регрессия источника по индексу
 * времени (`x = 0..barCount-1`) на скользящем окне `barCount`.
 *
 * Возвращает значение регрессии на текущем баре: `slope * (barCount - 1) + intercept`.
 * Под капотом считает наклон и пересечение методом наименьших квадратов
 * и предоставляет их через {@link getSlope} / {@link getIntercept}.
 */
export class SimpleLinearRegressionIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _slopes: Map<number, Decimal> = new Map();
  private readonly _intercepts: Map<number, Decimal> = new Map();

  constructor(source: Indicator<Decimal>, barCount: number) {
    super(source.getSeries(), `SLR(${source.getName()}, ${barCount})`);
    if (barCount < 2) throw new Error('barCount must be >= 2');
    this._source = source;
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) return NaNValue;

    const n = new Decimal(this._barCount.toString());
    let sumX = new Decimal('0');
    let sumY = new Decimal('0');
    let sumXY = new Decimal('0');
    let sumX2 = new Decimal('0');

    for (let i = 0; i < this._barCount; i++) {
      const x = new Decimal(i.toString());
      const y = this._source.getValue(index - (this._barCount - 1 - i));
      sumX = sumX.add(x);
      sumY = sumY.add(y);
      sumXY = sumXY.add(x.multiply(y));
      sumX2 = sumX2.add(x.multiply(x));
    }

    const denom = n.multiply(sumX2).subtract(sumX.multiply(sumX));
    if (denom.isZero()) {
      // Все точки имеют одинаковый x — этого не бывает для n ≥ 2, но защищаемся.
      return this._source.getValue(index);
    }
    const slope = n.multiply(sumXY).subtract(sumX.multiply(sumY)).divide(denom);
    const intercept = sumY.subtract(slope.multiply(sumX)).divide(n);

    this._slopes.set(index, slope);
    this._intercepts.set(index, intercept);

    return slope.multiply(new Decimal((this._barCount - 1).toString())).add(intercept);
  }

  clearCache(): void {
    super.clearCache();
    this._slopes.clear();
    this._intercepts.clear();
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount - 1;
  }

  /** Наклон регрессии на указанном баре (NaN sentinel при warm-up). */
  getSlope(index: number): Decimal {
    if (!this.isReady(index)) return NaNValue;
    this.getValue(index);
    return this._slopes.get(index) ?? NaNValue;
  }

  /** Свободный член регрессии (значение при x = 0). */
  getIntercept(index: number): Decimal {
    if (!this.isReady(index)) return NaNValue;
    this.getValue(index);
    return this._intercepts.get(index) ?? NaNValue;
  }
}
