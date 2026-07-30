/**
 * Константы бэктеста pair-arbitrage. Меняйте здесь — `pairs-arbitrage.ts` ссылается.
 */

import { Decimal } from '@ttech-pub/invest-core';

export const BACKTEST_CONFIG = {
  /** Период загрузки исторических свечей (календарных дней назад от now). */
  lookbackDays: 90,

  /** Окно для скользящего среднего и stddev z-score (в барах). */
  zscoreWindow: 60,

  /** Порог входа: |z| > entryThreshold → открываем позицию. */
  entryThreshold: new Decimal('2.0'),

  /** Порог выхода по mean-reversion: z пересекает 0. Реализуется в правиле. */
  exitThreshold: new Decimal('0'),

  /** Стоп-лосс: |z| > stopThreshold → закрываем позицию (расхождение углубляется). */
  stopThreshold: new Decimal('4.0'),

  /** Минимум закрытых позиций для содержательной отчётности по паре. */
  minClosedPositionsForReport: 1,

  /** Транзакционные издержки на одну сторону сделки (доля от notional). */
  transactionCostFraction: new Decimal('0.0005'), // 5 bps

  /** Начальный «капитал» для %-сайзера и кривой equity (в условных единицах). */
  initialEquity: new Decimal('100000'),
} as const;
