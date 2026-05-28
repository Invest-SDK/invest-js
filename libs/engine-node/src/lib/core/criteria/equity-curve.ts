/**
 * EquityCurve — utility для построения кривой капитала по барам.
 *
 * Используется критериями, чувствительными к internal drawdown (например,
 * `MaximumDrawdownByBarCriterion`). Учитывает закрытые позиции + текущую
 * открытую позицию, mark-to-market по close бара.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { Trade } from '../trading/trade';
import { PositionType, TradingRecord } from '../trading/trading-record';

/** Возвращает equity на баре `index` относительно `initialEquity`. */
export function equityAtBar(
  record: TradingRecord,
  series: BarSeries,
  index: number,
  initialEquity: Decimal = new Decimal('0')
): Decimal {
  let equity = initialEquity;

  for (const position of record.positions) {
    const entryIdx = position.getEntryIndex();
    if (entryIdx > index) continue;
    const exitIdx = position.getExitIndex();
    if (exitIdx !== null && exitIdx <= index) {
      // Полностью закрытая позиция к моменту бара index.
      equity = equity.add(position.getProfit());
    } else {
      // Позиция всё ещё открыта (или закрытие после index) — mark-to-market.
      const bar = series.getBar(index);
      if (bar) {
        equity = equity.add(unrealizedPnL(position, bar.close));
      }
    }
  }
  // TradingRecord не создаёт Position, пока нет выходного ордера, — открытая
  // позиция живёт в currentTrade. Учитываем её mark-to-market отдельно.
  const open = record.currentTrade;
  if (open && open.getIndex() <= index) {
    const bar = series.getBar(index);
    if (bar) {
      equity = equity.add(unrealizedFromTrade(open, bar.close, record.positionType));
    }
  }
  return equity;
}

/** Возвращает массив equity по каждому бару серии. */
export function equityCurve(
  record: TradingRecord,
  series: BarSeries,
  initialEquity: Decimal = new Decimal('0')
): Decimal[] {
  const out: Decimal[] = [];
  for (let i = series.beginIndex; i <= series.endIndex; i++) {
    out.push(equityAtBar(record, series, i, initialEquity));
  }
  return out;
}

function unrealizedPnL(position: Position, markPrice: Decimal): Decimal {
  const entry = position.getEntryPrice();
  const qty = position.getAmount();
  // Берём комиссию только за вход — выходной ордер ещё не выписан.
  const entryCommission = position.getEntry().getCommission();
  if (position.isLong()) {
    return markPrice.subtract(entry).multiply(qty).subtract(entryCommission);
  }
  return entry.subtract(markPrice).multiply(qty).subtract(entryCommission);
}

function unrealizedFromTrade(trade: Trade, markPrice: Decimal, type: PositionType): Decimal {
  const entry = trade.getPrice();
  const qty = trade.getAmount();
  const commission = trade.getCommission();
  if (type === PositionType.LONG) {
    return markPrice.subtract(entry).multiply(qty).subtract(commission);
  }
  return entry.subtract(markPrice).multiply(qty).subtract(commission);
}
