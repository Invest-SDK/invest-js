import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';

/**
 * MaximumDrawdownCriterion — максимальная просадка кривой капитала.
 *
 * Кривая строится по cumulative P&L закрытых позиций; просадка вычисляется
 * как `max((peak - equity) / peak)`. Ниже = лучше.
 */
export class MaximumDrawdownCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('MaximumDrawdown');
  }

  calculatePosition(_series: BarSeries, position: Position): Decimal {
    if (!position.isClosed()) {
      return new Decimal('0');
    }
    const profit = position.getProfit();
    if (profit.isNegative()) {
      const entryValue = position.getEntryPrice().multiply(position.getAmount());
      if (entryValue.isZero()) {
        return new Decimal('0');
      }
      return profit.abs().divide(entryValue);
    }
    return new Decimal('0');
  }

  calculate(_series: BarSeries, record: TradingRecord): Decimal {
    let equity = new Decimal('0');
    let peak = new Decimal('0');
    let maxDrawdown = new Decimal('0');

    for (const position of record.getClosedPositions()) {
      equity = equity.add(position.getProfit());
      if (equity.isGreaterThan(peak)) {
        peak = equity;
      }
      // Просадка считается в абсолютных деньгах относительно пика;
      // нормализация делается только при наличии положительного пика.
      const drawdown = peak.subtract(equity);
      if (peak.isPositive()) {
        const normalized = drawdown.divide(peak);
        if (normalized.isGreaterThan(maxDrawdown)) {
          maxDrawdown = normalized;
        }
      } else if (drawdown.isGreaterThan(maxDrawdown)) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /** Меньше — лучше. */
  override betterThan(a: Decimal, b: Decimal): boolean {
    return a.isLessThan(b);
  }
}
