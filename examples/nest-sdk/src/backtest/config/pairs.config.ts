/**
 * Конфиг пар для арбитражного бэктеста.
 *
 * Каждая пара состоит из двух «ног»: A и B. Стратегия торгует синтетическим
 * лог-отношением ln(priceA / priceB) — направление «long spread» соответствует
 * long A + short B.
 */

export type InstrumentClass = 'share' | 'etf' | 'future';

export interface PairLeg {
  ticker: string;
  class: InstrumentClass;
}

export interface PairConfig {
  name: string;
  description: string;
  legA: PairLeg;
  legB: PairLeg;
}

/**
 * Тикеры фьючерсов привязаны к экспирациям (SRM6 = SBER June 2026, SRU6 = Sept 2026,
 * GDM6 = Gold June 2026, MXM6 = MIX June 2026). К моменту запуска часть может
 * быть истёкшей — instruments-resolver вернёт `not found`, и pair будет пропущена.
 */
export const PAIRS: PairConfig[] = [
  {
    name: 'SBER vs SRM6',
    description: 'Базовый актив + фьючерс на него',
    legA: { ticker: 'SBER', class: 'share' },
    legB: { ticker: 'SRM6', class: 'future' },
  },
  {
    name: 'SRM6 vs SRU6',
    description: 'Календарный спред (разные экспирации одного фьюча)',
    legA: { ticker: 'SRM6', class: 'future' },
    legB: { ticker: 'SRU6', class: 'future' },
  },
  {
    name: 'TGLD@ vs GDM6',
    description: 'ETF золота + фьючерс на золото',
    legA: { ticker: 'TGLD@', class: 'etf' },
    legB: { ticker: 'GDM6', class: 'future' },
  },
  {
    name: 'TMOS@ vs MXM6',
    description: 'ETF голубых фишек + фьючерс на индекс MIX',
    legA: { ticker: 'TMOS@', class: 'etf' },
    legB: { ticker: 'MXM6', class: 'future' },
  },
  {
    name: 'SBER vs SBERP',
    description: 'Обыкновенные vs привилегированные акции Сбербанка',
    legA: { ticker: 'SBER', class: 'share' },
    legB: { ticker: 'SBERP', class: 'share' },
  },
];
