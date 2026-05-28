/**
 * Time-based rules — фильтры по времени бара.
 */
import { AbstractRule } from './rule';
import { BarSeries } from '../bar/bar-series';

/**
 * DayOfWeekRule — бар в один из указанных дней недели (0 = воскресенье,
 * 6 = суббота), в локальной таймзоне процесса.
 */
export class DayOfWeekRule extends AbstractRule {
  private readonly _days: ReadonlySet<number>;

  constructor(
    private readonly _series: BarSeries,
    ...days: number[]
  ) {
    super(`DayOfWeekRule(${days.join(',')})`);
    if (days.length === 0) throw new Error('at least one day required');
    for (const d of days) {
      if (d < 0 || d > 6) throw new Error('day must be in [0, 6]');
    }
    this._days = new Set(days);
  }

  isSatisfied(index: number): boolean {
    const bar = this._series.getBar(index);
    if (!bar) return false;
    return this._days.has(bar.time.getDay());
  }
}

/**
 * TimeRangeRule — бар попадает в один из заданных интервалов времени суток
 * (HH:MM включительно слева, эксклюзивно справа). Удобно для фильтрации по
 * сессии (например, российский рынок: 10:00–18:50 / 19:00–23:50).
 */
export interface TimeRange {
  fromHour: number;
  fromMinute?: number;
  toHour: number;
  toMinute?: number;
}

export class TimeRangeRule extends AbstractRule {
  private readonly _ranges: ReadonlyArray<{ from: number; to: number }>;

  constructor(
    private readonly _series: BarSeries,
    ranges: TimeRange[]
  ) {
    super(`TimeRangeRule(${ranges.length})`);
    if (ranges.length === 0) throw new Error('at least one range required');
    this._ranges = ranges.map((r) => ({
      from: (r.fromHour ?? 0) * 60 + (r.fromMinute ?? 0),
      to: (r.toHour ?? 0) * 60 + (r.toMinute ?? 0),
    }));
  }

  isSatisfied(index: number): boolean {
    const bar = this._series.getBar(index);
    if (!bar) return false;
    const minutes = bar.time.getHours() * 60 + bar.time.getMinutes();
    for (const r of this._ranges) {
      if (r.from <= r.to) {
        if (minutes >= r.from && minutes < r.to) return true;
      } else {
        // Окно через полночь.
        if (minutes >= r.from || minutes < r.to) return true;
      }
    }
    return false;
  }
}
