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
  UnderIndicatorRule,
  combineOr,
  AbstractIndicator,
} from '@ttech-pub/invest-engine-node';
import type { Rule, Strategy } from '@ttech-pub/invest-engine-node';
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

export function createPairStrategy(
  series: BarSeries,
  params: PairStrategyParams
): BuiltPairStrategy {
  const lnRatio = new LogRatioIndicator(series);
  const z = new ZScoreIndicator(lnRatio, params.zscoreWindow);
  const negEntry = new Decimal('0').subtract(params.entryThreshold);
  const negStop = new Decimal('0').subtract(params.stopThreshold);

  let entry: Rule;
  let exit: Rule;

  if (params.side === 'long') {
    entry = new CrossedDownValueRule(z, negEntry);
    const meanRevert = new CrossedUpValueRule(z, params.exitThreshold);
    const stopLoss = new UnderIndicatorRule(z, negStop);
    exit = combineOr([meanRevert, stopLoss]);
  } else {
    entry = new CrossedUpValueRule(z, params.entryThreshold);
    const meanRevert = new CrossedDownValueRule(z, params.exitThreshold);
    const stopLoss = new OverIndicatorRule(z, params.stopThreshold);
    exit = combineOr([meanRevert, stopLoss]);
  }

  const name =
    `PairsMR-${params.side.toUpperCase()}(z${params.zscoreWindow}, ` +
    `entry=${params.entryThreshold.toString()}, stop=${params.stopThreshold.toString()})`;
  return {
    strategy: new BaseStrategy(name, entry, exit, params.zscoreWindow),
    zscore: z,
  };
}

export { AbstractIndicator };
