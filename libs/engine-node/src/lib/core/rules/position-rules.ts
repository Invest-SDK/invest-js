/**
 * Position-aware rules: правила, опирающиеся на состояние TradingRecord.
 */
import { AbstractRule } from './rule';
import { TradingRecord } from '../trading/trading-record';

/**
 * OpenedPositionMinimumBarCountRule — позиция уже открыта минимум `barCount` баров.
 *
 * Часто используется как фильтр для exit-правил: «не выходи раньше, чем
 * через N баров после входа».
 */
export class OpenedPositionMinimumBarCountRule extends AbstractRule {
  constructor(private readonly _barCount: number) {
    super(`OpenedPositionMinimumBarCountRule(${_barCount})`);
    if (_barCount < 1) throw new Error('barCount must be >= 1');
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!tradingRecord || !tradingRecord.isOpened()) return false;
    const entry = tradingRecord.currentTrade;
    if (!entry) return false;
    return index - entry.getIndex() >= this._barCount;
  }
}
