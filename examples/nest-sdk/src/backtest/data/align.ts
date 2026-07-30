/**
 * Inner-join двух серий свечей по timestamp.
 *
 * Возвращает массив пар (sampleA, sampleB) — только для timestamp'ов,
 * присутствующих в обеих сериях. Сортировка по времени.
 */

import type { CandleSample } from './candles-loader';

export interface AlignedSample {
  time: Date;
  a: CandleSample;
  b: CandleSample;
}

export function alignByTime(seriesA: CandleSample[], seriesB: CandleSample[]): AlignedSample[] {
  const mapB = new Map<number, CandleSample>();
  for (const s of seriesB) mapB.set(s.time.getTime(), s);

  const out: AlignedSample[] = [];
  for (const a of seriesA) {
    const t = a.time.getTime();
    const b = mapB.get(t);
    if (!b) continue;
    out.push({ time: a.time, a, b });
  }
  out.sort((x, y) => x.time.getTime() - y.time.getTime());
  return out;
}
