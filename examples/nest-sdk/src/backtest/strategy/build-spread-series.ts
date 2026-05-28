/**
 * Построение синтетической BarSeries из выровненных пар свечей.
 *
 * OHLC лог-отношения (conservative bound):
 *   open  = ln(openA  / openB)
 *   close = ln(closeA / closeB)
 *   high  = ln(highA  / lowB)   — верхняя теоретическая граница ratio в баре
 *   low   = ln(lowA   / highB)  — нижняя теоретическая граница
 *
 * Если low_B == 0 (вырожденный бар) — fallback на max/min(open, close).
 */

import { Decimal } from '@ttech-pub/invest-core';
import { Bar, BarSeries } from '@ttech-pub/invest-engine-node';
import type { AlignedSample } from '../data/align';

export interface SpreadSeriesOptions {
  name: string;
  /** Условный объём бара (Bar требует volume > 0; реальный смысл отсутствует). */
  syntheticVolume?: Decimal;
}

/** Constant offset, применённый в buildSpreadBar. Экспортируется для отчёта. */
export const SPREAD_OFFSET = new Decimal('1000');

/**
 * Один синтетический Bar из пары исходных свечей. Используется как для
 * batch-режима (buildSpreadSeries для backtest), так и для live (на каждом
 * закрытом баре стрима).
 */
export function buildSpreadBar(
  sample: AlignedSample,
  syntheticVolume: Decimal = new Decimal('1')
): Bar | null {
  const { time, a, b } = sample;
  if (a.open.isZero() || a.close.isZero() || a.high.isZero() || a.low.isZero()) return null;
  if (b.open.isZero() || b.close.isZero() || b.high.isZero() || b.low.isZero()) return null;

  const openLn = lnRatio(a.open, b.open);
  const closeLn = lnRatio(a.close, b.close);

  let highLn: Decimal;
  let lowLn: Decimal;
  if (b.low.isZero() || b.high.isZero()) {
    highLn = openLn.isGreaterThan(closeLn) ? openLn : closeLn;
    lowLn = openLn.isLessThan(closeLn) ? openLn : closeLn;
  } else {
    highLn = lnRatio(a.high, b.low);
    lowLn = lnRatio(a.low, b.high);
  }

  const open = SPREAD_OFFSET.add(openLn);
  const close = SPREAD_OFFSET.add(closeLn);
  const high = SPREAD_OFFSET.add(highLn);
  const low = SPREAD_OFFSET.add(lowLn);

  return new Bar({ time, open, high, low, close, volume: syntheticVolume });
}

export function buildSpreadSeries(
  aligned: AlignedSample[],
  options: SpreadSeriesOptions
): BarSeries {
  const syntheticVolume = options.syntheticVolume ?? new Decimal('1');
  const bars: Bar[] = [];
  for (const sample of aligned) {
    const bar = buildSpreadBar(sample, syntheticVolume);
    if (bar) bars.push(bar);
  }
  return new BarSeries({ name: options.name }, bars);
}

/** ln(a / b) через parseFloat — достаточно точно для ratio-стратегии. */
function lnRatio(a: Decimal, b: Decimal): Decimal {
  const ratio = parseFloat(a.toString()) / parseFloat(b.toString());
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(`lnRatio: invalid ratio ${ratio} for a=${a.toString()} b=${b.toString()}`);
  }
  return new Decimal(Math.log(ratio).toFixed(10));
}
