/**
 * AnalysisCriterion — метрика качества стратегии.
 *
 * Аналог ta4j `AnalysisCriterion`. Считается двумя способами:
 * - по всей `TradingRecord` (общий результат);
 * - по одной `Position` (для срезов / per-position-метрик).
 */

import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';

export interface AnalysisCriterion {
  /** Значение критерия для одной закрытой позиции. */
  calculatePosition(series: BarSeries, position: Position): Decimal;

  /** Значение критерия для всей торговой записи. */
  calculate(series: BarSeries, record: TradingRecord): Decimal;

  /**
   * Лучший результат из двух — true, если `a` лучше `b`.
   * Большинство метрик стремятся к максимуму; те, где ниже = лучше
   * (drawdown), переопределяют сравнение.
   */
  betterThan(a: Decimal, b: Decimal): boolean;

  getName(): string;
}

export abstract class AbstractAnalysisCriterion implements AnalysisCriterion {
  protected readonly _name: string;

  constructor(name: string) {
    this._name = name;
  }

  abstract calculatePosition(series: BarSeries, position: Position): Decimal;
  abstract calculate(series: BarSeries, record: TradingRecord): Decimal;

  /** По умолчанию — выше лучше. */
  betterThan(a: Decimal, b: Decimal): boolean {
    return a.isGreaterThan(b);
  }

  getName(): string {
    return this._name;
  }
}
