import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';

/**
 * ProfitFactorCriterion — отношение валовой прибыли к валовому убытку.
 *
 * Возвращает 0, если ещё не было ни одной проигрышной позиции и нет
 * прибыльных (нет данных); возвращает максимум-сентинель (very large), если
 * проигрышей нет, но есть прибыли. Ta4j делает то же, ведь иначе деление на 0.
 */
export class ProfitFactorCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('ProfitFactor');
  }

  calculatePosition(_series: BarSeries, position: Position): Decimal {
    if (!position.isClosed()) {
      return new Decimal('0');
    }
    // Per-position profit factor не определён — возвращаем сам P&L.
    return position.getProfit();
  }

  calculate(_series: BarSeries, record: TradingRecord): Decimal {
    let grossProfit = new Decimal('0');
    let grossLoss = new Decimal('0');

    for (const position of record.getClosedPositions()) {
      const profit = position.getProfit();
      if (profit.isPositive()) {
        grossProfit = grossProfit.add(profit);
      } else if (profit.isNegative()) {
        grossLoss = grossLoss.add(profit.abs());
      }
    }

    if (grossLoss.isZero()) {
      return grossProfit.isZero() ? new Decimal('0') : new Decimal('999999999');
    }
    return grossProfit.divide(grossLoss);
  }
}
