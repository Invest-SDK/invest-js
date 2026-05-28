/**
 * SMAIndicator - Simple Moving Average (Простая скользящая средняя)
 *
 * SMA вычисляется как среднее арифметическое цен за указанный период.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, Indicator } from './indicator';
import { ClosePriceIndicator } from './price-indicators';
import { BarSeries } from '../bar';
import { NaNValue } from './nan';

/**
 * Класс SMAIndicator вычисляет простую скользящую среднюю
 *
 * Простая скользящая средняя (SMA) рассчитывается по формуле:
 * SMA = (P₁ + P₂ + ... + Pₙ) / n
 *
 * где P - цены закрытия, n - период.
 *
 * @example
 * ```typescript
 * const series = new BarSeries('AAPL');
 * const close = new ClosePriceIndicator(series);
 * const sma20 = new SMAIndicator(close, 20); // 20-дневная SMA
 *
 * // Получить значение SMA для последнего бара
 * const smaValue = sma20.getValue(series.endIndex);
 * ```
 */
export class SMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;

  /**
   * Создаёт SMAIndicator
   * @param source Источник данных (индикатор или серия)
   * @param barCount Период SMA
   */
  constructor(source: BarSeries | Indicator<Decimal>, barCount: number);
  /**
   * Создаёт SMAIndicator с явно указанным источником
   */
  constructor(source: Indicator<Decimal>, barCount: number);
  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const sourceIndicator = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `SMA(${barCount})`);

    if (barCount <= 0) {
      throw new Error('Bar count must be positive');
    }

    this._source = sourceIndicator;
    this._barCount = barCount;
  }

  /**
   * @inheritDoc
   */
  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    // Окно SMA опирается на абсолютные индексы серии: warm-up относительно
    // series.beginIndex, чтобы корректно работать после вытеснения старых баров.
    if (index < series.beginIndex + this._barCount - 1) {
      return NaNValue;
    }

    let sum = new Decimal('0');
    for (let i = 0; i < this._barCount; i++) {
      const value = this._source.getValue(index - i);
      sum = sum.add(value);
    }

    return sum.divide(new Decimal(this._barCount.toString()));
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) {
      return false;
    }
    return index >= series.beginIndex + this._barCount - 1;
  }

  /**
   * Возвращает период SMA
   */
  getBarCount(): number {
    return this._barCount;
  }

  /**
   * Возвращает источник данных
   */
  getSource(): Indicator<Decimal> {
    return this._source;
  }
}

/**
 * EMAIndicator - Exponential Moving Average (Экспоненциальная скользящая средняя)
 *
 * EMA рассчитывается с использованием множителя сглаживания:
 * Multiplier = 2 / (n + 1)
 * EMA = (Close - Previous EMA) * Multiplier + Previous EMA
 *
 * EMA придаёт больший вес последним ценам.
 */
export class EMAIndicator extends AbstractIndicator<Decimal> {
  private readonly _source: Indicator<Decimal>;
  private readonly _barCount: number;
  private readonly _multiplier: Decimal;

  /**
   * Создаёт EMAIndicator
   * @param source Источник данных
   * @param barCount Период EMA
   */
  constructor(source: BarSeries | Indicator<Decimal>, barCount: number);
  constructor(source: Indicator<Decimal>, barCount: number);
  constructor(source: BarSeries | Indicator<Decimal>, barCount: number) {
    const series = source instanceof BarSeries ? source : source.getSeries();
    const sourceIndicator = source instanceof BarSeries ? new ClosePriceIndicator(source) : source;
    super(series, `EMA(${barCount})`);

    if (barCount <= 0) {
      throw new Error('Bar count must be positive');
    }

    this._source = sourceIndicator;
    this._barCount = barCount;
    // Множитель = 2 / (n + 1)
    this._multiplier = new Decimal('2').divide(new Decimal((barCount + 1).toString()));
  }

  /**
   * @inheritDoc
   *
   * Затравка EMA — SMA первых N значений источника, начиная с первого индекса,
   * где источник готов. Для вложенных EMA это даёт «плавающий» seed, который
   * не падает на NaN-входах нижнего слоя.
   */
  protected calculate(index: number): Decimal {
    const seedIndex = this.effectiveSeedIndex();
    if (seedIndex === null || index < seedIndex) {
      return NaNValue;
    }

    if (index === seedIndex) {
      const start = seedIndex - this._barCount + 1;
      let sum = new Decimal('0');
      for (let i = start; i <= seedIndex; i++) {
        sum = sum.add(this._source.getValue(i));
      }
      return sum.divide(new Decimal(this._barCount.toString()));
    }

    const previousEMA = this.getValue(index - 1);
    const currentClose = this._source.getValue(index);

    return currentClose.subtract(previousEMA).multiply(this._multiplier).add(previousEMA);
  }

  isReady(index: number): boolean {
    const series = this.getSeries();
    if (!series.isValidIndex(index)) {
      return false;
    }
    const seedIndex = this.effectiveSeedIndex();
    return seedIndex !== null && index >= seedIndex;
  }

  private _cachedSeedIndex: number | undefined;
  private effectiveSeedIndex(): number | null {
    // Кэшируем только успешно найденный seed: для streaming-серии новые бары
    // могут открыть окно, которого ещё не было — null оставляем без кэша.
    if (this._cachedSeedIndex !== undefined) {
      return this._cachedSeedIndex;
    }
    const series = this.getSeries();
    // Ищем первое i, в котором источник готов на [i - barCount + 1 .. i].
    for (let i = series.beginIndex; i <= series.endIndex; i++) {
      const start = i - this._barCount + 1;
      if (start < series.beginIndex) continue;
      let ok = true;
      for (let j = start; j <= i; j++) {
        if (!this._source.isReady(j)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        this._cachedSeedIndex = i;
        return i;
      }
    }
    return null;
  }

  /**
   * Возвращает период EMA
   */
  getBarCount(): number {
    return this._barCount;
  }

  /**
   * Возвращает множитель сглаживания
   */
  getMultiplier(): Decimal {
    return this._multiplier;
  }

  /**
   * Возвращает источник данных
   */
  getSource(): Indicator<Decimal> {
    return this._source;
  }
}
