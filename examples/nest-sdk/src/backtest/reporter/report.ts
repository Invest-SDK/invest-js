/**
 * Сводка по результату бэктеста одной пары.
 *
 * **Важно про единицы:** синтетическая Bar-серия использует price = offset + lnRatio
 * (offset = const, см. build-spread-series). Все производные `Position.getProfit()`
 * = (exit - entry) * qty корректны: offset сокращается, qty=1 → P&L позиции в
 * чистых lnRatio единицах.
 *
 * Engine'овские Return/BuyAndHold/Sharpe-критерии берут price-ratio (exit/entry)
 * — с offset они вырождаются в ≈1 и теряют смысл. Поэтому ВСЕ метрики ниже
 * считаются прямо из per-trade lnRatio P&L, без обращения к criteria.*.
 *
 * Транзакционные издержки в реальных RUB не транслируются в lnRatio через offset.
 * Поэтому manager.run запускается без CostModel (commission=0), а реалистичная
 * комиссия учитывается тут: ≈ 2 * transactionCostFraction за round-trip
 * (ln(1+f) ≈ f при малых f).
 */

import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries, Position, TradingRecord } from '@t-tech/engine-node';
import type { PairSide } from '../strategy/pairs-strategy';
import { SPREAD_OFFSET } from '../strategy/build-spread-series';

export interface PairBacktestResult {
  pairName: string;
  side: PairSide;
  series: BarSeries;
  record: TradingRecord;
  /** Доля от notional на одну сторону. См. файл-докстринг. */
  transactionCostFraction: Decimal;
  bars: number;
}

/** Конвертация log-return → percent: (exp(x) - 1) * 100. */
function logToPercent(logReturn: number): number {
  return (Math.exp(logReturn) - 1) * 100;
}

function asNumber(value: Decimal | number): number {
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

function formatNumber(value: number, digits = 4): string {
  if (!isFinite(value)) return 'n/a';
  return value.toFixed(digits);
}

/**
 * Per-trade lnRatio P&L с учётом round-trip transaction cost.
 *
 * Position.getProfit() уже даёт правильный знак (engine знает side), offset
 * сокращается в (exit - entry). Из него вычитаем round-trip комиссию.
 */
function perTradeLogPnL(position: Position, roundTripCost: number): number {
  return asNumber(position.getProfit()) - roundTripCost;
}

/** Bar.close в lnRatio (вычитает offset). */
function lnRatioAt(series: BarSeries, index: number): number {
  const bar = series.getBar(index);
  if (!bar) return 0;
  return asNumber(bar.close.subtract(SPREAD_OFFSET));
}

interface ComputedMetrics {
  closedCount: number;
  perTradeLog: number[];
  netLog: number;
  netPercent: number;
  meanPerTradePct: number;
  sharpe: number;
  profitFactor: number | null;
  maxDrawdownPercent: number;
  buyAndHoldPercent: number;
  winRate: number;
}

function computeMetrics(result: PairBacktestResult): ComputedMetrics {
  const closed = result.record.getClosedPositions();
  const roundTrip = 2 * asNumber(result.transactionCostFraction);
  const perTradeLog = closed.map((p) => perTradeLogPnL(p, roundTrip));
  const perTradePct = perTradeLog.map(logToPercent);

  const netLog = perTradeLog.reduce((a, b) => a + b, 0);
  const netPercent = logToPercent(netLog);

  // Sharpe считаем в процентах, risk-free = 0.
  // Для одной/двух сделок дисперсия не определена — возвращаем 0.
  let sharpe = 0;
  if (perTradePct.length >= 2) {
    const mean = perTradePct.reduce((a, b) => a + b, 0) / perTradePct.length;
    const variance =
      perTradePct.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / perTradePct.length;
    if (variance > 0) sharpe = mean / Math.sqrt(variance);
  }

  let grossWin = 0;
  let grossLoss = 0;
  for (const x of perTradeLog) {
    if (x > 0) grossWin += x;
    else if (x < 0) grossLoss += -x;
  }
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;

  // Max drawdown по equity-кривой в lnRatio пространстве; конвертация в %
  // через (1 - exp(-dd)).
  let equity = 0;
  let peak = 0;
  let maxDD = 0;
  for (const x of perTradeLog) {
    equity += x;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDrawdownPercent = (1 - Math.exp(-maxDD)) * 100;

  const winRate =
    perTradeLog.length === 0 ? 0 : perTradeLog.filter((x) => x > 0).length / perTradeLog.length;

  // Buy-and-hold на самой синтетической lnRatio-серии:
  // logReturn = lastLn - firstLn → процент через exp().
  const series = result.series;
  const firstLn = lnRatioAt(series, series.beginIndex);
  const lastLn = lnRatioAt(series, series.endIndex);
  const buyAndHoldPercent = logToPercent(lastLn - firstLn);

  const meanPerTradePct =
    perTradePct.length === 0 ? 0 : perTradePct.reduce((a, b) => a + b, 0) / perTradePct.length;

  return {
    closedCount: closed.length,
    perTradeLog,
    netLog,
    netPercent,
    meanPerTradePct,
    sharpe,
    profitFactor,
    maxDrawdownPercent,
    buyAndHoldPercent,
    winRate,
  };
}

export function formatPairReport(result: PairBacktestResult): string[] {
  const lines: string[] = [];

  lines.push(`=== ${result.pairName}  [${result.side.toUpperCase()}] ===`);
  lines.push(`  Bars (aligned): ${result.bars}`);

  const m = computeMetrics(result);

  lines.push(`  Closed positions: ${m.closedCount}`);
  if (m.closedCount === 0) {
    lines.push('  No closed positions — стратегия не сработала на этой выборке.');
    return lines;
  }

  lines.push(`  Net P&L (lnRatio): ${formatNumber(m.netLog)}`);
  lines.push(`  Net Approx %:      ${formatNumber(m.netPercent, 3)}%`);
  lines.push(`  Avg per-trade %:   ${formatNumber(m.meanPerTradePct, 3)}%`);
  lines.push(`  WinRate:           ${formatNumber(m.winRate * 100, 1)}%`);
  lines.push(
    `  ProfitFactor:      ${
      m.profitFactor === null
        ? 'n/a'
        : m.profitFactor === Infinity
          ? '∞'
          : formatNumber(m.profitFactor, 3)
    }`
  );
  lines.push(`  Sharpe (per-trade):${formatNumber(m.sharpe, 3)}`);
  lines.push(`  MaxDrawdown:       ${formatNumber(m.maxDrawdownPercent, 3)}%`);
  lines.push(`  BuyAndHold ratio:  ${formatNumber(m.buyAndHoldPercent, 3)}%`);

  // Top-5 трейдов по абсолютному размеру.
  const closed = result.record.getClosedPositions();
  const roundTrip = 2 * asNumber(result.transactionCostFraction);
  const top = [...closed]
    .map((p) => ({ position: p, pnl: perTradeLogPnL(p, roundTrip) }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5);

  lines.push(`  Top trades (by |pnl|):`);
  for (const t of top) {
    const entry = t.position.getEntryTime().toISOString().slice(0, 16).replace('T', ' ');
    const exitTime = t.position.getExitTime();
    const exit = exitTime ? exitTime.toISOString().slice(0, 16).replace('T', ' ') : 'OPEN';
    lines.push(
      `    ${entry} → ${exit}  lnP&L=${formatNumber(t.pnl)}  (${formatNumber(logToPercent(t.pnl), 3)}%)`
    );
  }

  return lines;
}

export const REPORT_NOTES = [
  `Synthetic price = ${SPREAD_OFFSET.toString()} + lnRatio (offset satisfies Bar(price>0)).`,
  `All metrics computed directly from per-trade lnRatio P&L; engine's price-ratio`,
  `criteria are NOT used here (offset would distort them).`,
  `Transaction cost applied as 2 × fraction per round-trip in lnRatio (ln(1+f) ≈ f).`,
];
