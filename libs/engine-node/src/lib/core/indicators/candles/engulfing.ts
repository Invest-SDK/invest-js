import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';

/**
 * BullishEngulfingIndicator — `true` если предыдущая свеча медвежья, текущая
 * бычья и тело текущей перекрывает тело предыдущей (open[i] ≤ close[i-1]
 * и close[i] ≥ open[i-1]). На beginIndex всегда `false` (нет предыдущей).
 */
export class BullishEngulfingIndicator extends AbstractIndicator<boolean> {
  constructor(series: BarSeries) {
    super(series, 'BullishEngulfing');
  }

  protected calculate(index: number): boolean {
    if (index === this.getSeries().beginIndex) return false;
    const prev = this.getBar(index - 1);
    const cur = this.getBar(index);
    if (!prev || !cur) return false;
    if (!prev.isBearish() || !cur.isBullish()) return false;
    return cur.open.isLessThanOrEqual(prev.close) && cur.close.isGreaterThanOrEqual(prev.open);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    return series.isValidIndex(index) && index > series.beginIndex;
  }
}

/**
 * BearishEngulfingIndicator — симметричный паттерн: предыдущая бычья,
 * текущая медвежья, тело текущей перекрывает тело предыдущей.
 */
export class BearishEngulfingIndicator extends AbstractIndicator<boolean> {
  constructor(series: BarSeries) {
    super(series, 'BearishEngulfing');
  }

  protected calculate(index: number): boolean {
    if (index === this.getSeries().beginIndex) return false;
    const prev = this.getBar(index - 1);
    const cur = this.getBar(index);
    if (!prev || !cur) return false;
    if (!prev.isBullish() || !cur.isBearish()) return false;
    return cur.open.isGreaterThanOrEqual(prev.close) && cur.close.isLessThanOrEqual(prev.open);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    return series.isValidIndex(index) && index > series.beginIndex;
  }
}
