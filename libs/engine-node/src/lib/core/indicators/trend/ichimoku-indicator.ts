import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * Базовая линия Ichimoku: (highestHigh + lowestLow) / 2 на окне `barCount`.
 *
 * Используется для Tenkan-sen (9) и Kijun-sen (26).
 */
export class IchimokuLineIndicator extends AbstractIndicator<Decimal> {
  private readonly _barCount: number;

  constructor(series: BarSeries, barCount: number, name?: string) {
    super(series, name ?? `IchimokuLine(${barCount})`);
    if (barCount <= 0) throw new Error('barCount must be positive');
    this._barCount = barCount;
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index < series.beginIndex + this._barCount - 1) return NaNValue;
    let hh = this.getHighPrice(index);
    let ll = this.getLowPrice(index);
    for (let i = 1; i < this._barCount; i++) {
      const h = this.getHighPrice(index - i);
      const l = this.getLowPrice(index - i);
      if (h.isGreaterThan(hh)) hh = h;
      if (l.isLessThan(ll)) ll = l;
    }
    return hh.add(ll).divide(new Decimal('2'));
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) return false;
    return index >= series.beginIndex + this._barCount - 1;
  }
}

/** Tenkan-sen — IchimokuLine(9). */
export class IchimokuTenkanSenIndicator extends IchimokuLineIndicator {
  constructor(series: BarSeries, barCount = 9) {
    super(series, barCount, `IchimokuTenkan(${barCount})`);
  }
}

/** Kijun-sen — IchimokuLine(26). */
export class IchimokuKijunSenIndicator extends IchimokuLineIndicator {
  constructor(series: BarSeries, barCount = 26) {
    super(series, barCount, `IchimokuKijun(${barCount})`);
  }
}

/**
 * Senkou Span A — (Tenkan + Kijun) / 2, сдвинуто вперёд на `offset` баров
 * (стандарт: offset = 26). На текущем индексе возвращает значение, рассчитанное
 * по бару `index - offset`.
 */
export class IchimokuSenkouSpanAIndicator extends AbstractIndicator<Decimal> {
  private readonly _tenkan: IchimokuTenkanSenIndicator;
  private readonly _kijun: IchimokuKijunSenIndicator;
  private readonly _offset: number;

  constructor(series: BarSeries, tenkanBars = 9, kijunBars = 26, offset = 26) {
    super(series, `IchimokuSenkouA(${tenkanBars},${kijunBars},${offset})`);
    this._tenkan = new IchimokuTenkanSenIndicator(series, tenkanBars);
    this._kijun = new IchimokuKijunSenIndicator(series, kijunBars);
    this._offset = offset;
  }

  protected calculate(index: number): Decimal {
    const baseIdx = index - this._offset;
    if (baseIdx < this.getSeries().beginIndex) return NaNValue;
    if (!this._tenkan.isReady(baseIdx) || !this._kijun.isReady(baseIdx)) return NaNValue;
    const t = this._tenkan.getValue(baseIdx);
    const k = this._kijun.getValue(baseIdx);
    return t.add(k).divide(new Decimal('2'));
  }
}

/**
 * Senkou Span B — IchimokuLine(barCount), сдвинуто вперёд на `offset` (стандарт 52, 26).
 */
export class IchimokuSenkouSpanBIndicator extends AbstractIndicator<Decimal> {
  private readonly _line: IchimokuLineIndicator;
  private readonly _offset: number;

  constructor(series: BarSeries, barCount = 52, offset = 26) {
    super(series, `IchimokuSenkouB(${barCount},${offset})`);
    this._line = new IchimokuLineIndicator(series, barCount, `IchimokuSenkouBLine(${barCount})`);
    this._offset = offset;
  }

  protected calculate(index: number): Decimal {
    const baseIdx = index - this._offset;
    if (baseIdx < this.getSeries().beginIndex) return NaNValue;
    if (!this._line.isReady(baseIdx)) return NaNValue;
    return this._line.getValue(baseIdx);
  }
}

/**
 * Chikou Span — close, сдвинутый назад: для текущего индекса возвращает
 * close через `offset` баров. Полезно для подтверждения тренда задним числом.
 */
export class IchimokuChikouSpanIndicator extends AbstractIndicator<Decimal> {
  private readonly _offset: number;

  constructor(series: BarSeries, offset = 26) {
    super(series, `IchimokuChikou(${offset})`);
    this._offset = offset;
  }

  protected calculate(index: number): Decimal {
    const target = index + this._offset;
    const series = this.getSeries();
    if (!series.isValidIndex(target)) return NaNValue;
    return this.getClosePrice(target);
  }
}
