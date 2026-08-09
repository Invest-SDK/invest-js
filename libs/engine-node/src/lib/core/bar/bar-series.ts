/**
 * BarSeries - Коллекция баров для технического анализа
 *
 * Управляет последовательностью баров (свечей) и предоставляет
 * методы для доступа, добавления и кэширования данных.
 */

import { Decimal, ValidationError } from '@ttech-pub/invest-core';
import { Bar, BarInput } from './bar';

/**
 * Интерфейс событий BarSeries
 */
export interface BarSeriesEventMap {
  barAdded: { bar: Bar; index: number };
  barRemoved: { bar: Bar; index: number };
  seriesReset: void;
}

/**
 * Тип функции обработчика событий
 */
export type BarSeriesEventHandler<K extends keyof BarSeriesEventMap> = (
  event: BarSeriesEventMap[K]
) => void;

/**
 * Интерфейс для создания BarSeries
 */
export interface BarSeriesBuilderOptions {
  name?: string;
  maxCapacity?: number;
}

/**
 * Интерфейс диапазона индексов
 */
export interface IndexRange {
  start: number;
  end: number;
}

/**
 * Класс BarSeries управляет последовательностью торговых баров
 *
 * Предоставляет эффективный доступ к данным, кэширование индексов
 * и поддержку событий при изменении данных.
 */
export class BarSeries {
  private readonly _name: string;
  private readonly _bars: Bar[];
  private _maxCapacity: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _eventListeners: Map<keyof BarSeriesEventMap, Set<BarSeriesEventHandler<any>>>;
  private _endIndex = -1;
  private _beginIndex = 0;
  private _revision = 0;

  constructor(options: BarSeriesBuilderOptions, bars: Bar[]) {
    this._name = options.name ?? 'BarSeries';
    // Clone bars properly by creating new Bar instances
    this._bars = bars.map(
      (bar) =>
        new Bar({
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          amount: bar.amount,
        })
    );
    this._maxCapacity = options.maxCapacity || 10000;

    this._eventListeners = new Map();

    if (this._bars.length > 0) {
      this._endIndex = this._bars.length - 1;
    }
  }

  /**
   * Название серии
   */
  get name(): string {
    return this._name;
  }

  /**
   * Количество баров в серии
   */
  get barCount(): number {
    return this._bars.length;
  }

  /**
   * Индекс последнего бара
   */
  get endIndex(): number {
    return this._endIndex;
  }

  /**
   * Индекс первого бара
   */
  get beginIndex(): number {
    return this._beginIndex;
  }

  /** Версия данных для инвалидации кэшей: растёт при `clear`/`setBars`, но не при append. */
  get revision(): number {
    return this._revision;
  }

  /**
   * Возвращает true если серия пуста
   */
  isEmpty(): boolean {
    return this._bars.length === 0;
  }

  /**
   * Возвращает true если серия не пуста
   */
  isNotEmpty(): boolean {
    return this._bars.length > 0;
  }

  /**
   * Добавляет новый бар в конец серии
   * @param bar Бар для добавления
   */
  addBar(bar: Bar): void {
    // Проверяем, что бары добавляются в хронологическом порядке
    const lastBar = this.getLastBar();
    if (lastBar && bar.time < lastBar.time) {
      throw new ValidationError('Bars must be added in chronological order');
    }

    if (this._maxCapacity > 0 && this._bars.length >= this._maxCapacity) {
      this._bars.shift();
      this._beginIndex++;
    }

    this._bars.push(bar);
    this._endIndex = this._beginIndex + this._bars.length - 1;

    this.emit('barAdded', { bar, index: this._endIndex });
  }

  /**
   * Добавляет несколько баров
   * @param bars Массив баров для добавления
   */
  addBars(bars: Bar[]): void {
    for (const bar of bars) {
      this.addBar(bar);
    }
  }

  /**
   * Добавляет бар из данных
   * @param data Данные для создания бара
   */
  addBarData(data: BarInput): void {
    this.addBar(new Bar(data));
  }

  /**
   * Возвращает бар по индексу
   * @param index Индекс бара
   */
  getBar(index: number): Bar | null {
    if (index < this._beginIndex || index > this._endIndex) {
      return null;
    }
    return this._bars[index - this._beginIndex];
  }

  /**
   * Возвращает последний бар
   */
  getLastBar(): Bar | null {
    if (this.isEmpty()) {
      return null;
    }
    return this._bars[this._bars.length - 1];
  }

  /**
   * Возвращает предпоследний бар
   */
  getPenultimateBar(): Bar | null {
    if (this._bars.length < 2) {
      return null;
    }
    return this._bars[this._bars.length - 2];
  }

  /**
   * Возвращает бар по смещению от конца
   * @param fromEnd Смещение от конца (0 = последний)
   */
  getBarAtEnd(fromEnd: number): Bar | null {
    const index = this._bars.length - 1 - fromEnd;
    if (index < 0) {
      return null;
    }
    return this._bars[index];
  }

  /**
   * Возвращает срез баров
   * @param start Начальный индекс
   * @param end Конечный индекс (включительно)
   */
  getBars(start: number, end: number): Bar[] {
    if (start < this._beginIndex || end > this._endIndex || start > end) {
      return [];
    }

    const actualStart = start - this._beginIndex;
    const actualEnd = end - this._beginIndex + 1;
    return this._bars.slice(actualStart, actualEnd);
  }

  /**
   * Возвращает все бары
   */
  getAllBars(): Bar[] {
    return [...this._bars];
  }

  /**
   * Удаляет бар по индексу
   * @param index Индекс бара для удаления
   */
  removeBar(index: number): Bar | null {
    if (index < this._beginIndex || index > this._endIndex) {
      return null;
    }
    // Разрешено только удаление головы серии — иначе абсолютные индексы
    // оставшихся баров «сдвинулись» бы, инвалидируя кэши индикаторов.
    if (index !== this._beginIndex) {
      throw new Error(
        `removeBar: разрешено удаление только головы (beginIndex=${this._beginIndex}), получено index=${index}`
      );
    }

    const bar = this._bars.shift() as Bar;
    this._beginIndex++;

    this.emit('barRemoved', { bar, index });

    return bar;
  }

  /**
   * Удаляет все бары
   */
  clear(): void {
    this._bars.length = 0;
    this._endIndex = -1;
    this._beginIndex = 0;
    this._revision++;

    this.emit('seriesReset', undefined);
  }

  /**
   * Сбрасывает серию и загружает новые данные
   * @param bars Новые данные
   */
  setBars(bars: Bar[]): void {
    this.clear();
    this.addBars(bars);
  }

  /**
   * Возвращает цену закрытия последнего бара
   */
  getLastClose(): Decimal | null {
    const lastBar = this.getLastBar();
    return lastBar ? lastBar.close : null;
  }

  /**
   * Возвращает массив цен закрытия
   */
  getClosePrices(): Decimal[] {
    return this._bars.map((bar) => bar.close);
  }

  /**
   * Возвращает массив цен открытия
   */
  getOpenPrices(): Decimal[] {
    return this._bars.map((bar) => bar.open);
  }

  /**
   * Возвращает массив максимальных цен
   */
  getHighPrices(): Decimal[] {
    return this._bars.map((bar) => bar.high);
  }

  /**
   * Возвращает массив минимальных цен
   */
  getLowPrices(): Decimal[] {
    return this._bars.map((bar) => bar.low);
  }

  /**
   * Возвращает массив объёмов
   */
  getVolumes(): Decimal[] {
    return this._bars.map((bar) => bar.volume);
  }

  /**
   * Возвращает массив времён
   */
  getTimes(): Date[] {
    return this._bars.map((bar) => bar.time);
  }

  /**
   * Находит индекс бара по времени
   * @param time Время для поиска
   * @param exactMatch Точное совпадение
   */
  findBarByTime(time: Date, exactMatch = false): number | null {
    if (this.isEmpty()) {
      return null;
    }

    let low = this._beginIndex;
    let high = this._endIndex;
    const targetTime = time.getTime();

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midBar = this.getBar(mid);

      if (!midBar) {
        break;
      }

      const midTime = midBar.time.getTime();

      if (midTime === targetTime && exactMatch) {
        return mid;
      }

      if (midTime < targetTime) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (!exactMatch && high >= this._beginIndex) {
      const highBar = this.getBar(high);
      if (highBar && highBar.time.getTime() <= targetTime) {
        return high;
      }
    }

    return null;
  }

  /**
   * Находит индекс первого бара после указанного времени
   */
  findFirstBarAfter(time: Date): number | null {
    if (this.isEmpty()) {
      return null;
    }

    for (let i = this._beginIndex; i <= this._endIndex; i++) {
      const bar = this.getBar(i);
      if (bar && bar.time > time) {
        return i;
      }
    }

    return null;
  }

  /**
   * Находит индекс последнего бара до указанного времени
   */
  findLastBarBefore(time: Date): number | null {
    if (this.isEmpty()) {
      return null;
    }

    for (let i = this._endIndex; i >= this._beginIndex; i--) {
      const bar = this.getBar(i);
      if (bar && bar.time <= time) {
        return i;
      }
    }

    return null;
  }

  /**
   * Проверяет, содержит ли серия указанный индекс
   */
  isValidIndex(index: number): boolean {
    return index >= this._beginIndex && index <= this._endIndex;
  }

  /**
   * Возвращает подсерию с указанным диапазоном
   * @param start Начальный индекс
   * @param end Конечный индекс
   */
  getSubSeries(start: number, end: number): BarSeries {
    if (!this.isValidIndex(start) || !this.isValidIndex(end) || start > end) {
      return new BarSeries({ name: `${this._name}-empty` }, []);
    }

    const subBars = this.getBars(start, end);
    const subSeries = new BarSeries(
      {
        name: `${this._name}-${start}-${end}`,
      },
      subBars
    );
    return subSeries;
  }

  /**
   * Возвращает последние N баров
   * @param count Количество баров
   */
  getRecentBars(count: number): Bar[] {
    if (count >= this._bars.length) {
      return [...this._bars];
    }
    return this._bars.slice(-count);
  }

  /**
   * Итерирует по барам
   * @param callback Функция обратного вызова
   */
  forEach(callback: (bar: Bar, index: number) => void): void {
    for (let i = this._beginIndex; i <= this._endIndex; i++) {
      const bar = this.getBar(i);
      if (bar) {
        callback(bar, i);
      }
    }
  }

  /**
   * Итерирует по барам в обратном порядке
   */
  forEachReverse(callback: (bar: Bar, index: number) => void): void {
    for (let i = this._endIndex; i >= this._beginIndex; i--) {
      const bar = this.getBar(i);
      if (bar) {
        callback(bar, i);
      }
    }
  }

  /**
   * Применяет функцию к каждому бару и возвращает массив результатов
   */
  map<T>(callback: (bar: Bar, index: number) => T): T[] {
    const results: T[] = [];
    this.forEach((bar, index) => {
      results.push(callback(bar, index));
    });
    return results;
  }

  /**
   * Фильтрует бары по условию
   */
  filter(callback: (bar: Bar, index: number) => boolean): Bar[] {
    const results: Bar[] = [];
    this.forEach((bar, index) => {
      if (callback(bar, index)) {
        results.push(bar);
      }
    });
    return results;
  }

  /**
   * Находит первый бар по условию
   */
  find(callback: (bar: Bar, index: number) => boolean): Bar | null {
    for (let i = this._beginIndex; i <= this._endIndex; i++) {
      const bar = this.getBar(i);
      if (bar && callback(bar, i)) {
        return bar;
      }
    }
    return null;
  }

  /**
   * Проверяет, существует ли бар по условию
   */
  some(callback: (bar: Bar, index: number) => boolean): boolean {
    return this.find(callback) !== null;
  }

  /**
   * Проверяет, все ли бары удовлетворяют условию
   */
  every(callback: (bar: Bar, index: number) => boolean): boolean {
    for (let i = this._beginIndex; i <= this._endIndex; i++) {
      const bar = this.getBar(i);
      if (bar && !callback(bar, i)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Подписывается на событие
   */
  on<K extends keyof BarSeriesEventMap>(event: K, handler: BarSeriesEventHandler<K>): () => void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this._eventListeners.get(event)!.add(handler);

    // Возвращает функцию для отписки
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Отписывается от события
   */
  off<K extends keyof BarSeriesEventMap>(event: K, handler?: BarSeriesEventHandler<K>): void {
    if (handler) {
      const handlers = this._eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    } else {
      this._eventListeners.delete(event);
    }
  }

  /**
   * Устанавливает максимальную ёмкость серии
   */
  setMaxCapacity(maxCapacity: number): void {
    if (maxCapacity < 0) {
      throw new ValidationError('Maximum capacity cannot be negative');
    }

    this._maxCapacity = maxCapacity;
    while (this._bars.length > maxCapacity && this._bars.length > 0) {
      this._bars.shift();
      this._beginIndex++;
    }
    this._endIndex = this._beginIndex + this._bars.length - 1;
  }

  /**
   * Проверяет равенство с другой серией
   */
  equals(other: BarSeries): boolean {
    if (this._bars.length !== other._bars.length) {
      return false;
    }

    for (let i = 0; i < this._bars.length; i++) {
      const thisBar = this._bars[i];
      const otherBar = other.getBar(i);
      if (!otherBar) {
        return false;
      }

      const timesEqual = thisBar.time.getTime() === otherBar.time.getTime();
      const closesEqual = thisBar.close.isEqualTo(otherBar.close);

      if (!timesEqual || !closesEqual) {
        return false;
      }
    }

    return true;
  }

  /**
   * Создаёт копию серии
   */
  clone(): BarSeries {
    const cloned = new BarSeries({ name: this._name, maxCapacity: this._maxCapacity }, [
      ...this._bars,
    ]);
    return cloned;
  }

  /**
   * Преобразует серию в JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this._name,
      bars: this._bars.map((bar) => bar.toJSON()),
    };
  }

  /**
   * Создаёт BarSeries из JSON
   */
  static fromJSON(json: Record<string, unknown>): BarSeries {
    const series = new BarSeries({ name: json.name as string }, []);
    const bars = (json.bars as Record<string, string>[]).map((barJson) => Bar.fromJSON(barJson));
    series.addBars(bars);
    return series;
  }

  /**
   * Внутренний метод для генерации событий
   */
  private emit<K extends keyof BarSeriesEventMap>(event: K, data: BarSeriesEventMap[K]): void {
    const handlers = this._eventListeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}
