import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';

/**
 * ReturnCriterion — простой gross return стратегии в виде множителя капитала.
 *
 * Для одной позиции: (exitPrice / entryPrice) для LONG, либо
 * (2 - exitPrice/entryPrice) для SHORT. Открытые позиции возвращают 1.
 * Для всей записи — произведение per-position результатов.
 */
export class ReturnCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('Return');
  }

  calculatePosition(_series: BarSeries, position: Position): Decimal {
    if (!position.isClosed()) {
      return new Decimal('1');
    }
    const entry = position.getEntryPrice();
    const exit = position.getExitPrice();
    if (!exit || entry.isZero()) {
      return new Decimal('1');
    }
    if (position.isLong()) {
      return exit.divide(entry);
    }
    // SHORT: симметрично — выигрыш при падении цены.
    return new Decimal('2').subtract(exit.divide(entry));
  }

  calculate(series: BarSeries, record: TradingRecord): Decimal {
    let result = new Decimal('1');
    for (const position of record.getClosedPositions()) {
      result = result.multiply(this.calculatePosition(series, position));
    }
    return result;
  }
}
