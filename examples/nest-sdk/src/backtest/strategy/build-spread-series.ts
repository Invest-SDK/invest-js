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
import { Bar, BarSeries } from '@t-tech/engine-node';
import type { AlignedSample } from '../data/align';

export interface SpreadSeriesOptions {
  name: string;
  /** Условный объём бара (Bar требует volume > 0; реальный смысл отсутствует). */
  syntheticVolume?: Decimal;
}

export function buildSpreadSeries(
  aligned: AlignedSample[],
  options: SpreadSeriesOptions
): BarSeries {
  const bars: Bar[] = [];
  const syntheticVolume = options.syntheticVolume ?? new Decimal('1');

  for (const { time, a, b } of aligned) {
    if (a.open.isZero() || a.close.isZero() || a.high.isZero() || a.low.isZero()) continue;
    if (b.open.isZero() || b.close.isZero() || b.high.isZero() || b.low.isZero()) continue;

    const openLn = lnRatio(a.open, b.open);
    const closeLn = lnRatio(a.close, b.close);

    // Conservative bound: max ratio when A is at high and B is at low simultaneously.
    let highLn: Decimal;
    let lowLn: Decimal;
    if (b.low.isZero() || b.high.isZero()) {
      // Защита от деления на ноль на вырожденных барах — берём open/close range.
      highLn = openLn.isGreaterThan(closeLn) ? openLn : closeLn;
      lowLn = openLn.isLessThan(closeLn) ? openLn : closeLn;
    } else {
      highLn = lnRatio(a.high, b.low);
      lowLn = lnRatio(a.low, b.high);
    }

    // Сдвигаем в положительную область, потому что Bar валидирует price > 0.
    // Сдвиг — константа на всю серию, в производных значениях (ratio, z-score,
    // P&L позиций) он сокращается. Это безопаснее, чем менять валидацию Bar.
    const offset = new Decimal('1000');
    const open = offset.add(openLn);
    const close = offset.add(closeLn);
    const high = offset.add(highLn);
    const low = offset.add(lowLn);

    bars.push(
      new Bar({
        time,
        open,
        high,
        low,
        close,
        volume: syntheticVolume,
      })
    );
  }

  return new BarSeries({ name: options.name }, bars);
}

/** Constant offset, применённый в buildSpreadSeries. Экспортируется для отчёта. */
export const SPREAD_OFFSET = new Decimal('1000');

/** ln(a / b) через parseFloat — достаточно точно для ratio-стратегии. */
function lnRatio(a: Decimal, b: Decimal): Decimal {
  const ratio = parseFloat(a.toString()) / parseFloat(b.toString());
  if (!isFinite(ratio) || ratio <= 0) {
    throw new Error(`lnRatio: invalid ratio ${ratio} for a=${a.toString()} b=${b.toString()}`);
  }
  return new Decimal(Math.log(ratio).toFixed(10));
}
