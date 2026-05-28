/**
 * Strategy - ta4j-style торговая стратегия
 *
 * Связывает правило входа и правило выхода в единую стратегию.
 */

import { Rule } from '../rules/rule';
import { TradingRecord } from '../trading/trading-record';

/**
 * Интерфейс торговой стратегии, совместимый с ta4j-моделью
 */
export interface Strategy {
  getName(): string;
  getEntryRule(): Rule;
  getExitRule(): Rule;
  /** Количество баров прогрева — сигналы игнорируются пока index < unstableBars */
  getUnstableBars(): number;
  shouldEnter(index: number, tradingRecord?: TradingRecord): boolean;
  shouldExit(index: number, tradingRecord?: TradingRecord): boolean;
  shouldOperate(index: number, tradingRecord?: TradingRecord): boolean;
  /** ta4j AND: entry = A.entry AND B.entry, exit = A.exit OR B.exit */
  and(other: Strategy, name?: string, unstableBars?: number): Strategy;
  /** ta4j OR: entry = A.entry OR B.entry, exit = A.exit AND B.exit */
  or(other: Strategy, name?: string, unstableBars?: number): Strategy;
  /** Меняет местами правила входа и выхода */
  opposite(name?: string): Strategy;
}

/**
 * Базовая реализация Strategy
 */
export class BaseStrategy implements Strategy {
  private readonly _name: string;
  private readonly _entryRule: Rule;
  private readonly _exitRule: Rule;
  private readonly _unstableBars: number;

  constructor(entryRule: Rule, exitRule: Rule);
  constructor(name: string, entryRule: Rule, exitRule: Rule, unstableBars?: number);
  constructor(nameOrEntry: string | Rule, entryOrExit: Rule, exitRule?: Rule, unstableBars = 0) {
    if (typeof nameOrEntry === 'string') {
      this._name = nameOrEntry;
      this._entryRule = entryOrExit;
      // exitRule is guaranteed by overload signature
      this._exitRule = exitRule as Rule;
      this._unstableBars = unstableBars;
    } else {
      this._name = 'BaseStrategy';
      this._entryRule = nameOrEntry;
      this._exitRule = entryOrExit;
      this._unstableBars = 0;
    }
  }

  getName(): string {
    return this._name;
  }

  getEntryRule(): Rule {
    return this._entryRule;
  }

  getExitRule(): Rule {
    return this._exitRule;
  }

  getUnstableBars(): number {
    return this._unstableBars;
  }

  shouldEnter(index: number, tradingRecord?: TradingRecord): boolean {
    if (index < this._unstableBars) {
      return false;
    }
    // ta4j: never enter when a position is already open
    if (tradingRecord && tradingRecord.isOpened()) {
      return false;
    }
    return this._entryRule.isSatisfied(index, tradingRecord);
  }

  shouldExit(index: number, tradingRecord?: TradingRecord): boolean {
    if (index < this._unstableBars) {
      return false;
    }
    // ta4j: never exit when there is no open position
    if (tradingRecord && !tradingRecord.isOpened()) {
      return false;
    }
    return this._exitRule.isSatisfied(index, tradingRecord);
  }

  shouldOperate(index: number, tradingRecord?: TradingRecord): boolean {
    if (tradingRecord?.isOpened()) {
      return this.shouldExit(index, tradingRecord);
    }
    return this.shouldEnter(index, tradingRecord);
  }

  // ta4j convention: combining strategies with AND means both must agree to enter,
  // but either one exiting is enough to exit (conservative position management).
  and(other: Strategy, name?: string, unstableBars?: number): Strategy {
    const combinedName = name ?? `(${this._name} AND ${other.getName()})`;
    const combinedUnstable = unstableBars ?? Math.max(this._unstableBars, other.getUnstableBars());
    return new BaseStrategy(
      combinedName,
      this._entryRule.and(other.getEntryRule()),
      this._exitRule.or(other.getExitRule()),
      combinedUnstable
    );
  }

  // ta4j convention: combining strategies with OR means either can trigger entry,
  // but both must agree to exit (permissive entry, conservative exit).
  or(other: Strategy, name?: string, unstableBars?: number): Strategy {
    const combinedName = name ?? `(${this._name} OR ${other.getName()})`;
    const combinedUnstable = unstableBars ?? Math.max(this._unstableBars, other.getUnstableBars());
    return new BaseStrategy(
      combinedName,
      this._entryRule.or(other.getEntryRule()),
      this._exitRule.and(other.getExitRule()),
      combinedUnstable
    );
  }

  opposite(name?: string): Strategy {
    return new BaseStrategy(
      name ?? `Opposite(${this._name})`,
      this._exitRule,
      this._entryRule,
      this._unstableBars
    );
  }
}
