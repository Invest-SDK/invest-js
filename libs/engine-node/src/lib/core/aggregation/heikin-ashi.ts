/**
 * Heikin-Ashi свечи.
 *
 * HA-Close = (O + H + L + C) / 4
 * HA-Open  = (prevHAOpen + prevHAClose) / 2; для первого бара — (O + C) / 2.
 * HA-High  = max(H, HA-Open, HA-Close)
 * HA-Low   = min(L, HA-Open, HA-Close)
 *
 * Time/volume/amount проброшены из исходных баров без изменений.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar/bar';
import { BarSeries } from '../bar/bar-series';

export function toHeikinAshiBars(source: BarSeries): Bar[] {
  const out: Bar[] = [];
  let prevHAOpen: Decimal | null = null;
  let prevHAClose: Decimal | null = null;

  for (let i = source.beginIndex; i <= source.endIndex; i++) {
    const bar = source.getBar(i);
    if (!bar) continue;
    const haClose = bar.open.add(bar.high).add(bar.low).add(bar.close).divide(new Decimal('4'));
    const haOpen: Decimal =
      prevHAOpen === null || prevHAClose === null
        ? bar.open.add(bar.close).divide(new Decimal('2'))
        : prevHAOpen.add(prevHAClose).divide(new Decimal('2'));
    const haHigh = Decimal.max(bar.high, Decimal.max(haOpen, haClose));
    const haLow = Decimal.min(bar.low, Decimal.min(haOpen, haClose));

    out.push(
      new Bar({
        time: bar.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: bar.volume,
        amount: bar.amount,
      })
    );
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }
  return out;
}

/** Создаёт новую серию из Heikin-Ashi свечей. */
export function toHeikinAshiSeries(source: BarSeries, name?: string): BarSeries {
  return new BarSeries({ name: name ?? `${source.name}/HA` }, toHeikinAshiBars(source));
}
