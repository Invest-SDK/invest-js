/**
 * Resolver тикер → FIGI.
 *
 * SDK не предоставляет ticker-based lookup команды — приходится тянуть весь
 * список инструментов класса (`GetSharesCommand`/`GetETFsCommand`/`GetFuturesCommand`)
 * и фильтровать по полю `ticker`. Результат кэшируем на время процесса.
 */

import { GetSharesCommand, GetETFsCommand, GetFuturesCommand } from '@ttech-pub/invest-sdk-node';
import type { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { InstrumentStatus } from '@ttech-pub/grpc-node-client';
import type { InstrumentClass } from '../config/pairs.config';

export interface ResolvedInstrument {
  ticker: string;
  figi: string;
  uid: string;
  class: InstrumentClass;
  /** Для фьючерсов — дата экспирации; null для остальных. */
  expirationDate: Date | null;
  /** Для фьючерсов — базовый актив (например "SBER"). */
  basicAsset: string | null;
}

interface InstrumentRow {
  ticker: string;
  figi: string;
  uid: string;
  expirationDate?: Date;
  basicAsset?: string;
}

export class InstrumentsResolver {
  private readonly _cache: Map<InstrumentClass, Map<string, ResolvedInstrument>> = new Map();
  private readonly _inflight: Map<InstrumentClass, Promise<void>> = new Map();

  constructor(private readonly _sdk: InvestNodeSDK) {}

  async resolve(
    ticker: string,
    instrumentClass: InstrumentClass
  ): Promise<ResolvedInstrument | null> {
    await this._ensureLoaded(instrumentClass);
    const classCache = this._cache.get(instrumentClass);
    if (!classCache) return null;
    return classCache.get(ticker) ?? null;
  }

  private async _ensureLoaded(cls: InstrumentClass): Promise<void> {
    if (this._cache.has(cls)) return;
    const existing = this._inflight.get(cls);
    if (existing) {
      await existing;
      return;
    }
    const promise = this._load(cls);
    this._inflight.set(cls, promise);
    try {
      await promise;
    } finally {
      this._inflight.delete(cls);
    }
  }

  private async _load(cls: InstrumentClass): Promise<void> {
    const req = { instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE };
    let rows: InstrumentRow[];
    switch (cls) {
      case 'share': {
        const res = await this._sdk.send(new GetSharesCommand(req));
        rows = res.instruments.map(toInstrumentRow);
        break;
      }
      case 'etf': {
        const res = await this._sdk.send(new GetETFsCommand(req));
        rows = res.instruments.map(toInstrumentRow);
        break;
      }
      case 'future': {
        const res = await this._sdk.send(new GetFuturesCommand(req));
        rows = res.instruments.map((i) => ({
          ticker: i.ticker,
          figi: i.figi,
          uid: i.uid,
          expirationDate: i.expirationDate,
          basicAsset: i.basicAsset,
        }));
        break;
      }
    }

    const map = new Map<string, ResolvedInstrument>();
    for (const row of rows) {
      map.set(row.ticker, {
        ticker: row.ticker,
        figi: row.figi,
        uid: row.uid,
        class: cls,
        expirationDate: row.expirationDate ?? null,
        basicAsset: row.basicAsset ?? null,
      });
    }
    this._cache.set(cls, map);
  }
}

function toInstrumentRow(
  instrument: Pick<InstrumentRow, 'ticker' | 'figi' | 'uid'>
): InstrumentRow {
  return {
    ticker: instrument.ticker,
    figi: instrument.figi,
    uid: instrument.uid,
  };
}

/** True, если фьючерс уже истёк к указанной дате. */
export function isExpired(instrument: ResolvedInstrument, asOf: Date = new Date()): boolean {
  if (!instrument.expirationDate) return false;
  return instrument.expirationDate.getTime() < asOf.getTime();
}
