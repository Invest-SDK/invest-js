import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';

/**
 * NumberOfBarsCriterion — суммарное число баров, проведённых в позициях.
 * Полезно для нормализации других метрик (return per bar и т.п.).
 */
export class NumberOfBarsCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('NumberOfBars');
  }

  calculatePosition(_series: BarSeries, position: Position): Decimal {
    return new Decimal(position.getBarCount().toString());
  }

  calculate(_series: BarSeries, record: TradingRecord): Decimal {
    let total = 0;
    for (const position of record.getClosedPositions()) {
      total += position.getBarCount();
    }
    return new Decimal(total.toString());
  }

  /** Меньше — лучше (стратегия дольше «в кэше» = риск выше). */
  override betterThan(a: Decimal, b: Decimal): boolean {
    return a.isLessThan(b);
  }
}

/** NumberOfPositionsCriterion — число закрытых позиций. */
export class NumberOfPositionsCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('NumberOfPositions');
  }

  calculatePosition(): Decimal {
    return new Decimal('1');
  }

  calculate(_series: BarSeries, record: TradingRecord): Decimal {
    return new Decimal(record.closedPositionCount.toString());
  }
}
