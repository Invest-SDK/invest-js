/**
 * Фабрика mean-reversion стратегии на z-score лог-отношения.
 *
 * Entry (long spread): z < -entryThreshold (отношение сильно ниже среднего).
 * Exit:
 *   - z >= exitThreshold (вернулись к среднему, фиксируем);
 *   - ИЛИ |z| > stopThreshold (расхождение углубляется, стоп).
 *
 * Для SHORT-зеркала (z > +entryThreshold → short spread) запустите
 * createStrategy ещё раз с poolside='short'. Из-за того что engine-node Strategy
 * однонаправлена (LONG-only внутри одного прогона), SHORT-сценарий бэктестится
 * параллельно с PositionType.SHORT в BarSeriesManager.run.
 */

import { Decimal } from '@ttech-pub/invest-core';
import {
  BaseStrategy,
  BarSeries,
  CrossedDownValueRule,
  CrossedUpValueRule,
  OverIndicatorRule,
  Strategy,
  UnderIndicatorRule,
  combineOr,
  AbstractIndicator,
} from '@t-tech/engine-node';
import { LogRatioIndicator } from './log-ratio-indicator';
import { ZScoreIndicator } from './zscore-indicator';

export type PairSide = 'long' | 'short';

export interface PairStrategyParams {
  side: PairSide;
  zscoreWindow: number;
  entryThreshold: Decimal;
  /** Уровень возврата к среднему: |z| < exitThreshold → exit. */
  exitThreshold: Decimal;
  stopThreshold: Decimal;
}

export interface BuiltPairStrategy {
  strategy: Strategy;
  zscore: ZScoreIndicator;
}

export function createPairStrategy(series: BarSeries, params: PairStrategyParams): BuiltPairStrategy {
  const lnRatio = new LogRatioIndicator(series);
  const z = new ZScoreIndicator(lnRatio, params.zscoreWindow);
  const negEntry = new Decimal('0').subtract(params.entryThreshold);
  const negStop = new Decimal('0').subtract(params.stopThreshold);

  let entry;
  let exit;

  if (params.side === 'long') {
    // LONG: вход — СОБЫТИЕ пересечения z через -entry сверху вниз. Непрерывное
    // условие `z < -entry` приводит к death-spiral: после stop-exit стратегия
    // на следующем баре снова видит `z < -entry`, входит, тут же выходит —
    // и так в цикле. Crossover стреляет ровно один раз.
    entry = new CrossedDownValueRule(z, negEntry);
    const meanRevert = new CrossedUpValueRule(z, params.exitThreshold);
    const stopLoss = new UnderIndicatorRule(z, negStop);
    exit = combineOr([meanRevert, stopLoss]);
  } else {
    // SHORT: симметрично — entry на пересечении +entry снизу вверх.
    entry = new CrossedUpValueRule(z, params.entryThreshold);
    const meanRevert = new CrossedDownValueRule(z, params.exitThreshold);
    const stopLoss = new OverIndicatorRule(z, params.stopThreshold);
    exit = combineOr([meanRevert, stopLoss]);
  }

  const name = `PairsMR-${params.side.toUpperCase()}(z${params.zscoreWindow}, ` +
    `entry=${params.entryThreshold.toString()}, stop=${params.stopThreshold.toString()})`;
  return {
    strategy: new BaseStrategy(name, entry, exit, params.zscoreWindow),
    zscore: z,
  };
}

// Re-export для удобства консьюмера.
export { AbstractIndicator };
