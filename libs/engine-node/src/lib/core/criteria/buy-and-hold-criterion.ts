import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';

/**
 * BuyAndHoldReturnCriterion — доходность пассивного «купи-и-держи» на серии.
 *
 * Для всей записи: lastClose / firstClose на диапазоне серии.
 * Для одной позиции — return за время удержания этой позиции по close-ценам
 * её entry/exit баров.
 */
export class BuyAndHoldReturnCriterion extends AbstractAnalysisCriterion {
  constructor() {
    super('BuyAndHoldReturn');
  }

  calculatePosition(series: BarSeries, position: Position): Decimal {
    const entryBar = series.getBar(position.getEntryIndex());
    const exitIndex = position.getExitIndex();
    if (!entryBar || exitIndex === null) {
      return new Decimal('1');
    }
    const exitBar = series.getBar(exitIndex);
    if (!exitBar || entryBar.close.isZero()) {
      return new Decimal('1');
    }
    return exitBar.close.divide(entryBar.close);
  }

  calculate(series: BarSeries, _record: TradingRecord): Decimal {
    if (series.isEmpty()) {
      return new Decimal('1');
    }
    const first = series.getBar(series.beginIndex);
    const last = series.getBar(series.endIndex);
    if (!first || !last || first.close.isZero()) {
      return new Decimal('1');
    }
    return last.close.divide(first.close);
  }
}
