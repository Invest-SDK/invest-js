import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';
import { equityCurve } from './equity-curve';

/**
 * MaximumDrawdownByBarCriterion — максимальная просадка по equity-кривой,
 * построенной побарово (mark-to-market открытых позиций).
 *
 * В отличие от {@link MaximumDrawdownCriterion}, учитывает «внутрипозиционные»
 * просадки: пиковый убыток открытой позиции, даже если она потом закрылась в плюс.
 *
 * Возвращает просадку в процентах от пика (как Decimal в долях, не *100).
 */
export class MaximumDrawdownByBarCriterion extends AbstractAnalysisCriterion {
  constructor(private readonly _initialEquity: Decimal = new Decimal('0')) {
    super('MaximumDrawdownByBar');
  }

  calculatePosition(_series: BarSeries, position: Position): Decimal {
    if (!position.isClosed()) return new Decimal('0');
    const profit = position.getProfit();
    if (!profit.isNegative()) return new Decimal('0');
    const entry = position.getEntryPrice().multiply(position.getAmount());
    if (entry.isZero()) return new Decimal('0');
    return profit.abs().divide(entry);
  }

  calculate(series: BarSeries, record: TradingRecord): Decimal {
    const curve = equityCurve(record, series, this._initialEquity);
    let peak = this._initialEquity;
    let maxDrawdown = new Decimal('0');
    for (const equity of curve) {
      if (equity.isGreaterThan(peak)) peak = equity;
      const dd = peak.subtract(equity);
      if (peak.isPositive()) {
        const normalized = dd.divide(peak);
        if (normalized.isGreaterThan(maxDrawdown)) maxDrawdown = normalized;
      } else if (dd.isGreaterThan(maxDrawdown)) {
        maxDrawdown = dd;
      }
    }
    return maxDrawdown;
  }

  /** Меньше — лучше. */
  override betterThan(a: Decimal, b: Decimal): boolean {
    return a.isLessThan(b);
  }
}
