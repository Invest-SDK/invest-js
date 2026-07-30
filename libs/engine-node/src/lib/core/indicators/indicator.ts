/**
 * Indicator - Базовый интерфейс для технических индикаторов
 *
 * Все индикаторы реализуют этот интерфейс для обеспечения
 * единообразного доступа к значениям.
 */

import { Decimal } from '@t-tech/invest-shared';
import { BarSeries } from '../bar';

/**
 * Базовый интерфейс для всех индикаторов
 *
 * Индикатор — это функция, которая вычисляет значение на основе
 * исторических данных (баров) для каждого временного периода.
 */
export interface Indicator<T = Decimal> {
  /**
   * Возвращает значение индикатора для указанного бара
   * @param index Индекс бара
   */
  getValue(index: number): T;

  /**
   * Возвращает серию баров, на которой работает индикатор
   */
  getSeries(): BarSeries;

  /**
   * Проверяет, достаточно ли данных для вычисления значения
   * @param index Индекс бара
   */
  isReady(index: number): boolean;

  /**
   * Возвращает название индикатора
   */
  getName(): string;
}

/**
 * Абстрактный базовый класс для индикаторов
 *
 * Предоставляет общую функциональность:
 * - Кэширование значений
   - Валидация индексов
 * - Поддержка серии баров
 */
export abstract class AbstractIndicator<T = Decimal> implements Indicator<T> {
  protected readonly _series: BarSeries;
  private readonly _name: string;
  private readonly _cache: Map<number, T>;

  /**
   * Создаёт новый индикатор
   * @param series Серия баров
   * @param name Название индикатора
   */
  constructor(series: BarSeries, name: string) {
    this._series = series;
    this._name = name;
    this._cache = new Map();
  }

  /**
   * @inheritDoc
   */
  getValue(index: number): T {
    // Проверяем кэш
    if (this._cache.has(index)) {
      const cached = this._cache.get(index);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Проверяем валидность индекса
    if (!this._series.isValidIndex(index)) {
      throw new Error(
        `Invalid index: ${index}. Valid range: ${this._series.beginIndex} - ${this._series.endIndex}`
      );
    }

    // Вычисляем значение
    const value = this.calculate(index);

    // Кэшируем результат (null означает, что значение не готово)
    this._cache.set(index, value);

    return value;
  }

  /**
   * Вычисляет значение индикатора
   * @param index Индекс бара
   */
  protected abstract calculate(index: number): T;

  /**
   * @inheritDoc
   */
  getSeries(): BarSeries {
    return this._series;
  }

  /**
   * @inheritDoc
   */
  isReady(index: number): boolean {
    if (!this._series.isValidIndex(index)) {
      return false;
    }
    const value = this.getValue(index);
    return value !== null;
  }

  /**
   * @inheritDoc
   */
  getName(): string {
    return this._name;
  }

  /**
   * Возвращает краткое название с параметрами
   */
  protected getShortName(): string {
    return this._name;
  }

  /**
   * Очищает кэш
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * Возвращает количество закэшированных значений
   */
  getCacheSize(): number {
    return this._cache.size;
  }

  /**
   * Возвращает бар по индексу
   */
  protected getBar(index: number) {
    return this._series.getBar(index);
  }

  /**
   * Возвращает цену закрытия бара
   */
  protected getClosePrice(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.close;
  }

  /**
   * Возвращает цену открытия бара
   */
  protected getOpenPrice(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.open;
  }

  /**
   * Возвращает максимальную цену бара
   */
  protected getHighPrice(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.high;
  }

  /**
   * Возвращает минимальную цену бара
   */
  protected getLowPrice(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.low;
  }

  /**
   * Возвращает типичную цену бара
   */
  protected getTypicalPrice(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.typicalPrice;
  }

  /**
   * Возвращает объём бара
   */
  protected getVolume(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.volume;
  }

  /**
   * Возвращает цену по типу
   */
  protected getPriceByType(
    index: number,
    type: 'open' | 'high' | 'low' | 'close' | 'typical' | 'median'
  ): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }

    switch (type) {
      case 'open':
        return bar.open;
      case 'high':
        return bar.high;
      case 'low':
        return bar.low;
      case 'close':
        return bar.close;
      case 'typical':
        return bar.typicalPrice;
      case 'median':
        return bar.medianPrice;
      default:
        return bar.close;
    }
  }

  /**
   * Вычисляет сумму значений за период
   */
  protected sum(values: Decimal[]): Decimal {
    let sum = new Decimal('0');
    for (const value of values) {
      sum = sum.add(value);
    }
    return sum;
  }

  /**
   * Вычисляет среднее арифметическое
   */
  protected average(values: Decimal[]): Decimal {
    if (values.length === 0) {
      return new Decimal('0');
    }
    return this.sum(values).divide(new Decimal(values.length.toString()));
  }

  /**
   * Находит максимальное значение в массиве
   */
  protected max(values: Decimal[]): Decimal {
    if (values.length === 0) {
      return new Decimal('0');
    }
    let max = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i].isGreaterThan(max)) {
        max = values[i];
      }
    }
    return max;
  }

  /**
   * Находит минимальное значение в массиве
   */
  protected min(values: Decimal[]): Decimal {
    if (values.length === 0) {
      return new Decimal('0');
    }
    let min = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i].isLessThan(min)) {
        min = values[i];
      }
    }
    return min;
  }
}
