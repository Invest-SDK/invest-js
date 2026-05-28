/**
 * BarAggregator — апсэмплинг тонких баров в более крупный таймфрейм.
 *
 * Аналог ta4j `BarAggregator`: принимает группу мелких баров и собирает один
 * крупный (OHLC + сумма volume/amount). Время крупного бара = время первого
 * исходного бара группы.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar/bar';
import { BarSeries } from '../bar/bar-series';

export interface BarAggregator {
  /**
   * Собирает массив исходных баров в один. Возвращает null, если входной
   * массив пуст. Не валидирует таймфрейм — это задача стратегии группировки
   * (см. {@link DurationBarAggregator}).
   */
  aggregate(bars: ReadonlyArray<Bar>): Bar | null;
}

/** Базовая OHLCV-агрегация: первый open, max high, min low, последний close. */
export class OhlcvBarAggregator implements BarAggregator {
  aggregate(bars: ReadonlyArray<Bar>): Bar | null {
    if (bars.length === 0) return null;
    const first = bars[0];
    const last = bars[bars.length - 1];
    let high = first.high;
    let low = first.low;
    let volume = new Decimal('0');
    let amount = new Decimal('0');
    for (const b of bars) {
      if (b.high.isGreaterThan(high)) high = b.high;
      if (b.low.isLessThan(low)) low = b.low;
      volume = volume.add(b.volume);
      amount = amount.add(b.amount);
    }
    return new Bar({
      time: first.time,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
      amount,
    });
  }
}

/**
 * DurationBarAggregator — группирует исходные бары в окна длиной `durationMs`
 * и аггрегирует каждое окно. Окна выровнены по эпохе (Math.floor(time/duration)),
 * что повторяет поведение Tinkoff/Stockcharts для таймфреймов 1m/5m/1h/1d.
 */
export class DurationBarAggregator implements BarAggregator {
  private readonly _inner: BarAggregator;

  constructor(
    private readonly _durationMs: number,
    inner: BarAggregator = new OhlcvBarAggregator()
  ) {
    if (_durationMs <= 0) throw new Error('durationMs must be positive');
    this._inner = inner;
  }

  /** Группирует и аггрегирует. Незавершённое последнее окно НЕ возвращается. */
  aggregateSeries(series: BarSeries): Bar[] {
    const out: Bar[] = [];
    let bucket: Bar[] = [];
    let bucketStart = -1;

    for (let i = series.beginIndex; i <= series.endIndex; i++) {
      const bar = series.getBar(i);
      if (!bar) continue;
      const t = bar.time.getTime();
      const slot = Math.floor(t / this._durationMs);
      if (bucketStart === -1) {
        bucketStart = slot;
      } else if (slot !== bucketStart) {
        const agg = this._inner.aggregate(bucket);
        if (agg) out.push(agg);
        bucket = [];
        bucketStart = slot;
      }
      bucket.push(bar);
    }

    // Незакрытое окно сознательно отбрасывается — в backtest нельзя торговать
    // по неполным барам. При необходимости полный сбор — см. flush().
    return out;
  }

  /** Включая последний (возможно неполный) bucket. */
  flushSeries(series: BarSeries): Bar[] {
    const out: Bar[] = [];
    let bucket: Bar[] = [];
    let bucketStart = -1;
    for (let i = series.beginIndex; i <= series.endIndex; i++) {
      const bar = series.getBar(i);
      if (!bar) continue;
      const t = bar.time.getTime();
      const slot = Math.floor(t / this._durationMs);
      if (bucketStart === -1) {
        bucketStart = slot;
      } else if (slot !== bucketStart) {
        const agg = this._inner.aggregate(bucket);
        if (agg) out.push(agg);
        bucket = [];
        bucketStart = slot;
      }
      bucket.push(bar);
    }
    if (bucket.length > 0) {
      const agg = this._inner.aggregate(bucket);
      if (agg) out.push(agg);
    }
    return out;
  }

  aggregate(bars: ReadonlyArray<Bar>): Bar | null {
    return this._inner.aggregate(bars);
  }
}

/**
 * Конструирует BarSeries в крупном таймфрейме из мелкого.
 *
 * @param source — исходная серия (1m, 5m, …).
 * @param durationMs — длительность результирующего бара в мс (5*60_000 → 5m).
 * @param name — имя новой серии (default: source.name + '@<duration>ms').
 */
export function aggregateBarSeries(
  source: BarSeries,
  durationMs: number,
  name?: string
): BarSeries {
  const agg = new DurationBarAggregator(durationMs);
  const bars = agg.aggregateSeries(source);
  return new BarSeries({ name: name ?? `${source.name}@${durationMs}ms` }, bars);
}
