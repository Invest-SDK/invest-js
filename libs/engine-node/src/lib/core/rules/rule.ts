/**
 * Rule - Базовый интерфейс для правил торговой стратегии
 *
 * Правила определяют условия для входа и выхода из позиций.
 */

import { TradingRecord } from '../trading';

/**
 * Базовый интерфейс для всех правил
 *
 * Правило — это функция, которая возвращает boolean значение
 * для указанного индекса бара, указывая, выполнено ли условие.
 */
export interface Rule {
  /**
   * Проверяет, выполнено ли правило на указанном баре
   * @param index Индекс бара
   * @param tradingRecord Запись торговых операций (опционально)
   */
  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean;

  /**
   * Возвращает название правила
   */
  getName(): string;

  /**
   * Создаёт новый индикатор на основе AND комбинации
   */
  and(other: Rule): Rule;

  /**
   * Создаёт новый индикатор на основе OR комбинации
   */
  or(other: Rule): Rule;

  /**
   * Создаёт новый индикатор на основе NOT комбинации
   */
  not(): Rule;
}

/**
 * Абстрактный базовый класс для правил
 */
export abstract class AbstractRule implements Rule {
  protected readonly _name: string;

  constructor(name: string) {
    this._name = name;
  }

  abstract isSatisfied(index: number, tradingRecord?: TradingRecord): boolean;

  getName(): string {
    return this._name;
  }

  and(other: Rule): Rule {
    return new AndRule(this, other);
  }

  or(other: Rule): Rule {
    return new OrRule(this, other);
  }

  not(): Rule {
    return new NotRule(this);
  }
}

/**
 * Правило "И" (AND) - оба условия должны быть выполнены
 */
export class AndRule extends AbstractRule {
  private readonly _left: Rule;
  private readonly _right: Rule;

  constructor(left: Rule, right: Rule) {
    super(`AndRule(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    return (
      this._left.isSatisfied(index, tradingRecord) && this._right.isSatisfied(index, tradingRecord)
    );
  }
}

/**
 * Правило "ИЛИ" (OR) - хотя бы одно условие должно быть выполнено
 */
export class OrRule extends AbstractRule {
  private readonly _left: Rule;
  private readonly _right: Rule;

  constructor(left: Rule, right: Rule) {
    super(`OrRule(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    return (
      this._left.isSatisfied(index, tradingRecord) || this._right.isSatisfied(index, tradingRecord)
    );
  }
}

/**
 * Правило "НЕ" (NOT) - инвертирует условие
 */
export class NotRule extends AbstractRule {
  private readonly _rule: Rule;

  constructor(rule: Rule) {
    super(`NotRule(${rule.getName()})`);
    this._rule = rule;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    return !this._rule.isSatisfied(index, tradingRecord);
  }
}

/**
 * Правило "Исключающее ИЛИ" (XOR) - только одно условие должно быть выполнено
 */
export class XorRule extends AbstractRule {
  private readonly _left: Rule;
  private readonly _right: Rule;

  constructor(left: Rule, right: Rule) {
    super(`XorRule(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    const leftSatisfied = this._left.isSatisfied(index, tradingRecord);
    const rightSatisfied = this._right.isSatisfied(index, tradingRecord);
    return leftSatisfied !== rightSatisfied;
  }
}

/**
 * Правило "НИ" (NAND) - оба условия НЕ должны быть выполнены одновременно
 */
export class NandRule extends AbstractRule {
  private readonly _left: Rule;
  private readonly _right: Rule;

  constructor(left: Rule, right: Rule) {
    super(`NandRule(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    return !(
      this._left.isSatisfied(index, tradingRecord) && this._right.isSatisfied(index, tradingRecord)
    );
  }
}

/**
 * Правило "И-НЕ" (NOR) - ни одно условие не должно быть выполнено
 */
export class NorRule extends AbstractRule {
  private readonly _left: Rule;
  private readonly _right: Rule;

  constructor(left: Rule, right: Rule) {
    super(`NorRule(${left.getName()}, ${right.getName()})`);
    this._left = left;
    this._right = right;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    return (
      !this._left.isSatisfied(index, tradingRecord) &&
      !this._right.isSatisfied(index, tradingRecord)
    );
  }
}

/**
 * Комбинирует несколько правил с помощью AND
 */
export function combineAnd(rules: Rule[]): Rule {
  if (rules.length === 0) {
    throw new Error('At least one rule required');
  }
  if (rules.length === 1) {
    return rules[0];
  }

  let result = rules[0];
  for (let i = 1; i < rules.length; i++) {
    result = result.and(rules[i]);
  }
  return result;
}

/**
 * Комбинирует несколько правил с помощью OR
 */
export function combineOr(rules: Rule[]): Rule {
  if (rules.length === 0) {
    throw new Error('At least one rule required');
  }
  if (rules.length === 1) {
    return rules[0];
  }

  let result = rules[0];
  for (let i = 1; i < rules.length; i++) {
    result = result.or(rules[i]);
  }
  return result;
}
