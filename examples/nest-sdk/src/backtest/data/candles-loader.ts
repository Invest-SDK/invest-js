/**
 * Загрузка исторических свечей с батчингом по неделям.
 *
 * T-Invest ограничивает диапазон одного запроса для часовиков (точное
 * ограничение API не задокументировано в SDK, но эмпирически — 7 дней).
 * Бьём период на недельные куски и склеиваем.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { InvestNodeSDK } from '@t-tech/invest-sdk-node';
import { GetCandlesCommand } from '@t-tech/invest-sdk-node';
import { CandleInterval } from '@ttech-pub/grpc-node-client';

export interface CandleSample {
  time: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: number;
}

export interface LoadCandlesParams {
  figi: string;
  from: Date;
  to: Date;
  interval: CandleInterval;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export class CandlesLoader {
  constructor(private readonly _sdk: InvestNodeSDK) {}

  async load(params: LoadCandlesParams): Promise<CandleSample[]> {
    const out: CandleSample[] = [];
    let cursor = params.from.getTime();
    const end = params.to.getTime();

    while (cursor < end) {
      const batchEnd = Math.min(cursor + WEEK_MS, end);
      const res = await this._sdk.send(
        new GetCandlesCommand({
          figi: params.figi,
          from: new Date(cursor),
          to: new Date(batchEnd),
          interval: params.interval,
        })
      );
      for (const c of res.candles) {
        // Свечи с isComplete=false — текущий незакрытый бар, для бэктеста не нужен.
        if (!c.isComplete) continue;
        if (!c.open || !c.high || !c.low || !c.close || !c.time) continue;
        out.push({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Number(c.volume),
        });
      }
      cursor = batchEnd;
    }

    // SDK иногда возвращает свечи с дубликатами на границах недель — дедупим по времени.
    return dedupeByTime(out);
  }
}

function dedupeByTime(samples: CandleSample[]): CandleSample[] {
  const seen = new Set<number>();
  const out: CandleSample[] = [];
  for (const s of samples) {
    const t = s.time.getTime();
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(s);
  }
  out.sort((a, b) => a.time.getTime() - b.time.getTime());
  return out;
}
