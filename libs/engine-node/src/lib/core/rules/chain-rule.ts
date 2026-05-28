/**
 * ChainRule — последовательное подтверждение цепочки правил.
 *
 * Срабатывает, когда условия проходят в порядке `links` в пределах
 * допустимых «дельт» (число баров между подтверждениями). Аналог ta4j ChainRule.
 */
import { AbstractRule, Rule } from './rule';
import { TradingRecord } from '../trading/trading-record';

export interface ChainLink {
  rule: Rule;
  /** Максимум баров назад от текущего, в течение которых правило могло сработать. */
  threshold: number;
}

export class ChainRule extends AbstractRule {
  private readonly _initial: Rule;
  private readonly _links: ChainLink[];

  constructor(initial: Rule, ...links: ChainLink[]) {
    super(`ChainRule(${initial.getName()}, ${links.map((l) => l.rule.getName()).join('->')})`);
    this._initial = initial;
    this._links = links;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!this._initial.isSatisfied(index, tradingRecord)) return false;

    let cursor = index;
    for (const link of this._links) {
      let matched = false;
      const lowest = Math.max(0, cursor - link.threshold);
      for (let i = cursor; i >= lowest; i--) {
        if (link.rule.isSatisfied(i, tradingRecord)) {
          // Следующая цепочка ищется строго раньше — иначе одно срабатывание
          // правила могло бы покрыть всю цепочку.
          cursor = i - 1;
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }
}
