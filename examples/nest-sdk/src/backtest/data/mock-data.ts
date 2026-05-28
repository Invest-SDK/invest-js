/**
 * Mock-данные для прогона без сетевого доступа (`--mock`).
 *
 * Генерируем две скоррелированные цены с детерминированным сидом, чтобы
 * демонстрационный прогон был воспроизводимым. Mock работает для всех пар —
 * подменяет только candles-loader, остальная цепочка остаётся той же.
 */

import { Decimal } from '@ttech-pub/invest-core';
import type { CandleSample } from './candles-loader';

export interface MockPairParams {
  /** Сколько часовых баров сгенерировать. */
  barCount: number;
  /** Начальная цена A. */
  basePriceA: number;
  /** Начальная цена B. */
  basePriceB: number;
  /** Сид для воспроизводимости. */
  seed: number;
}

/**
 * Генерирует две серии с медленным трендом и шумом + общая компонента —
 * чтобы лог-отношение мерцало вокруг среднего и стратегия успевала торговать.
 */
export function generateMockPair(params: MockPairParams): {
  a: CandleSample[];
  b: CandleSample[];
} {
  let seed = params.seed;
  const rand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let pA = params.basePriceA;
  let pB = params.basePriceB;
  const start = new Date(2024, 0, 1, 10, 0);

  const a: CandleSample[] = [];
  const b: CandleSample[] = [];
  for (let i = 0; i < params.barCount; i++) {
    const common = Math.sin(i / 25) * 0.3;
    pA = Math.max(1, pA + common + (rand() - 0.5) * 0.8);
    pB = Math.max(1, pB + common * (params.basePriceB / params.basePriceA) + (rand() - 0.5) * 0.4);

    const time = new Date(start.getTime() + i * 60 * 60 * 1000);
    a.push(makeCandle(time, pA, rand));
    b.push(makeCandle(time, pB, rand));
  }
  return { a, b };
}

function makeCandle(time: Date, mid: number, rand: () => number): CandleSample {
  const open = mid + (rand() - 0.5) * 0.2;
  const close = mid + (rand() - 0.5) * 0.2;
  const high = Math.max(open, close) + rand() * 0.3;
  const low = Math.min(open, close) - rand() * 0.3;
  return {
    time,
    open: new Decimal(open.toFixed(4)),
    high: new Decimal(high.toFixed(4)),
    low: new Decimal(low.toFixed(4)),
    close: new Decimal(close.toFixed(4)),
    volume: 100,
  };
}
