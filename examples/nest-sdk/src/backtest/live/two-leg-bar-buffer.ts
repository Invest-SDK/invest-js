/**
 * TwoLegBarBuffer — буфер свечей для двух ног пары.
 *
 * Стрим T-Invest присылает свечи по двум figi асинхронно. Нам нужно
 * соединить их по timestamp и эмитить «спред-бар» только когда оба
 * присутствуют. Этот класс — чистая ts-логика без зависимости от SDK
 * (тестируется изолированно).
 *
 * Старые ts-слоты эвиктятся, чтобы Map не рос бесконечно. Лимит — 256
 * незавершённых слотов; этого хватает на десятки минут 1-min стрима.
 */

import type { CandleSample } from '../data/candles-loader';

export type LegId = 'a' | 'b';

export interface PairedCandle {
  time: Date;
  a: CandleSample;
  b: CandleSample;
}

const MAX_PENDING_SLOTS = 256;

export class TwoLegBarBuffer {
  private readonly _slots: Map<number, { a?: CandleSample; b?: CandleSample }> = new Map();
  private _lastEmittedTime = Number.NEGATIVE_INFINITY;

  /**
   * Пушим свечу одной ноги. Возвращает спаренный бар если в этом слоте
   * уже была свеча другой ноги, иначе null.
   */
  push(leg: LegId, sample: CandleSample): PairedCandle | null {
    const t = sample.time.getTime();
    if (t <= this._lastEmittedTime) return null;
    const slot = this._slots.get(t) ?? {};
    slot[leg] = sample;

    if (slot.a && slot.b) {
      this._slots.delete(t);
      this._lastEmittedTime = t;
      return { time: sample.time, a: slot.a, b: slot.b };
    }

    this._slots.set(t, slot);
    this._evictIfNeeded();
    return null;
  }

  /** Незавершённые слоты (для логов/диагностики). */
  pendingCount(): number {
    return this._slots.size;
  }

  private _evictIfNeeded(): void {
    if (this._slots.size <= MAX_PENDING_SLOTS) return;
    const overflow = this._slots.size - MAX_PENDING_SLOTS;
    const oldest = [...this._slots.keys()].sort((a, b) => a - b).slice(0, overflow);
    for (const key of oldest) {
      this._slots.delete(key);
    }
  }
}
