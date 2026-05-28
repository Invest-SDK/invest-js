import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

/**
 * ThreeWhiteSoldiersIndicator — три подряд бычьих бара, каждый закрывается
 * выше предыдущего и открывается внутри тела предыдущего.
 *
 * Требует минимум 3 бара истории; на первых двух — `false`.
 */
export class ThreeWhiteSoldiersIndicator extends AbstractIndicator<boolean> {
  constructor(series: BarSeries) {
    super(series, 'ThreeWhiteSoldiers');
  }

  protected calculate(index: number): boolean {
    const series = this.getSeries();
    if (index < series.beginIndex + 2) return false;
    const b1 = this.getBar(index - 2);
    const b2 = this.getBar(index - 1);
    const b3 = this.getBar(index);
    if (!b1 || !b2 || !b3) return false;
    if (!b1.isBullish() || !b2.isBullish() || !b3.isBullish()) return false;
    if (!b2.close.isGreaterThan(b1.close) || !b3.close.isGreaterThan(b2.close)) return false;
    // Каждый следующий открывается в теле предыдущего: open ∈ [prev.open, prev.close].
    if (!b2.open.isGreaterThanOrEqual(b1.open) || !b2.open.isLessThanOrEqual(b1.close)) {
      return false;
    }
    if (!b3.open.isGreaterThanOrEqual(b2.open) || !b3.open.isLessThanOrEqual(b2.close)) {
      return false;
    }
    return true;
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    return series.isValidIndex(index) && index >= series.beginIndex + 2;
  }
}

/**
 * ThreeBlackCrowsIndicator — симметричный медвежий паттерн.
 */
export class ThreeBlackCrowsIndicator extends AbstractIndicator<boolean> {
  constructor(series: BarSeries) {
    super(series, 'ThreeBlackCrows');
  }

  protected calculate(index: number): boolean {
    const series = this.getSeries();
    if (index < series.beginIndex + 2) return false;
    const b1 = this.getBar(index - 2);
    const b2 = this.getBar(index - 1);
    const b3 = this.getBar(index);
    if (!b1 || !b2 || !b3) return false;
    if (!b1.isBearish() || !b2.isBearish() || !b3.isBearish()) return false;
    if (!b2.close.isLessThan(b1.close) || !b3.close.isLessThan(b2.close)) return false;
    // Каждый следующий открывается в теле предыдущего: open ∈ [prev.close, prev.open].
    if (!b2.open.isLessThanOrEqual(b1.open) || !b2.open.isGreaterThanOrEqual(b1.close)) {
      return false;
    }
    if (!b3.open.isLessThanOrEqual(b2.open) || !b3.open.isGreaterThanOrEqual(b2.close)) {
      return false;
    }
    return true;
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    return series.isValidIndex(index) && index >= series.beginIndex + 2;
  }
}
