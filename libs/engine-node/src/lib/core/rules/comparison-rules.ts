/**
 * Comparison Rules - Правила сравнения индикаторов
 *
 * Базовые правила для сравнения значений индикаторов и пороговых значений.
 */
import { Decimal } from '@t-tech/invest-shared';
import { AbstractRule } from './rule';
import { Indicator } from '../indicators';

/**
 * Базовый класс для правил сравнения индикаторов
 */
export abstract class IndicatorRule extends AbstractRule {
  protected readonly _indicator: Indicator<Decimal>;

  constructor(name: string, indicator: Indicator<Decimal>) {
    super(name);
    this._indicator = indicator;
  }

  /**
   * Возвращает индикатор
   */
  getIndicator(): Indicator<Decimal> {
    return this._indicator;
  }
}

/**
 * Правило "Больше чем" (Over)
 *
 * Условие выполняется, когда значение индикатора больше порога
 */
export class OverIndicatorRule extends IndicatorRule {
  private readonly _threshold: Decimal;

  constructor(indicator: Indicator<Decimal>, threshold: Decimal) {
    super(`OverIndicatorRule(${indicator.getName()}, ${threshold.toString()})`, indicator);
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) {
      return false;
    }
    return this._indicator.getValue(index).isGreaterThan(this._threshold);
  }
}

/**
 * Правило "Больше или равно" (Over or Equal)
 */
export class OverOrEqualIndicatorRule extends IndicatorRule {
  private readonly _threshold: Decimal;

  constructor(indicator: Indicator<Decimal>, threshold: Decimal) {
    super(`OverOrEqualIndicatorRule(${indicator.getName()}, ${threshold.toString()})`, indicator);
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) {
      return false;
    }
    return this._indicator.getValue(index).isGreaterThanOrEqual(this._threshold);
  }
}

/**
 * Правило "Меньше чем" (Under)
 *
 * Условие выполняется, когда значение индикатора меньше порога
 */
export class UnderIndicatorRule extends IndicatorRule {
  private readonly _threshold: Decimal;

  constructor(indicator: Indicator<Decimal>, threshold: Decimal) {
    super(`UnderIndicatorRule(${indicator.getName()}, ${threshold.toString()})`, indicator);
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) {
      return false;
    }
    return this._indicator.getValue(index).isLessThan(this._threshold);
  }
}

/**
 * Правило "Меньше или равно" (Under or Equal)
 */
export class UnderOrEqualIndicatorRule extends IndicatorRule {
  private readonly _threshold: Decimal;

  constructor(indicator: Indicator<Decimal>, threshold: Decimal) {
    super(`UnderOrEqualIndicatorRule(${indicator.getName()}, ${threshold.toString()})`, indicator);
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) {
      return false;
    }
    return this._indicator.getValue(index).isLessThanOrEqual(this._threshold);
  }
}

/**
 * Правило "Равно"
 */
export class EqualsIndicatorRule extends IndicatorRule {
  private readonly _value: Decimal;

  constructor(indicator: Indicator<Decimal>, value: Decimal) {
    super(`EqualsIndicatorRule(${indicator.getName()}, ${value.toString()})`, indicator);
    this._value = value;
  }

  isSatisfied(index: number): boolean {
    if (!this._indicator.isReady(index)) {
      return false;
    }
    return this._indicator.getValue(index).isEqualTo(this._value);
  }
}

/**
 * Пересечение индикаторов снизу вверх (Crossed Up)
 *
 * Условие выполняется, когда первый индикатор пересекает второй снизу вверх
 */
export class CrossedUpIndicatorRule extends AbstractRule {
  private readonly _upper: Indicator<Decimal>;
  private readonly _lower: Indicator<Decimal>;

  constructor(upper: Indicator<Decimal>, lower: Indicator<Decimal>) {
    super(`CrossedUpIndicatorRule(${upper.getName()}, ${lower.getName()})`);
    this._upper = upper;
    this._lower = lower;
  }

  isSatisfied(index: number): boolean {
    if (index < 1) {
      return false;
    }

    if (!this._upper.isReady(index) || !this._lower.isReady(index)) {
      return false;
    }

    const prevUpper = this._upper.getValue(index - 1);
    const prevLower = this._lower.getValue(index - 1);
    const currUpper = this._upper.getValue(index);
    const currLower = this._lower.getValue(index);

    // Текущее: upper > lower
    // Предыдущее: upper <= lower
    return currUpper.isGreaterThan(currLower) && prevUpper.isLessThanOrEqual(prevLower);
  }
}

/**
 * Пересечение индикаторов сверху вниз (Crossed Down)
 *
 * Условие выполняется, когда первый индикатор пересекает второй сверху вниз
 */
export class CrossedDownIndicatorRule extends AbstractRule {
  private readonly _upper: Indicator<Decimal>;
  private readonly _lower: Indicator<Decimal>;

  constructor(upper: Indicator<Decimal>, lower: Indicator<Decimal>) {
    super(`CrossedDownIndicatorRule(${upper.getName()}, ${lower.getName()})`);
    this._upper = upper;
    this._lower = lower;
  }

  isSatisfied(index: number): boolean {
    if (index < 1) {
      return false;
    }

    if (!this._upper.isReady(index) || !this._lower.isReady(index)) {
      return false;
    }

    const prevUpper = this._upper.getValue(index - 1);
    const prevLower = this._lower.getValue(index - 1);
    const currUpper = this._upper.getValue(index);
    const currLower = this._lower.getValue(index);

    // Текущее: upper < lower
    // Предыдущее: upper >= lower
    return currUpper.isLessThan(currLower) && prevUpper.isGreaterThanOrEqual(prevLower);
  }
}

/**
 * Индикатор пересёк значение снизу вверх
 */
export class CrossedUpValueRule extends AbstractRule {
  private readonly _indicator: Indicator<Decimal>;
  private readonly _value: Decimal;

  constructor(indicator: Indicator<Decimal>, value: Decimal) {
    super(`CrossedUpValueRule(${indicator.getName()}, ${value.toString()})`);
    this._indicator = indicator;
    this._value = value;
  }

  isSatisfied(index: number): boolean {
    if (index < 1) {
      return false;
    }

    if (!this._indicator.isReady(index)) {
      return false;
    }

    const prevValue = this._indicator.getValue(index - 1);
    const currValue = this._indicator.getValue(index);

    // Текущее: indicator > value
    // Предыдущее: indicator <= value
    return currValue.isGreaterThan(this._value) && prevValue.isLessThanOrEqual(this._value);
  }
}

/**
 * Индикатор пересёк значение сверху вниз
 */
export class CrossedDownValueRule extends AbstractRule {
  private readonly _indicator: Indicator<Decimal>;
  private readonly _value: Decimal;

  constructor(indicator: Indicator<Decimal>, value: Decimal) {
    super(`CrossedDownValueRule(${indicator.getName()}, ${value.toString()})`);
    this._indicator = indicator;
    this._value = value;
  }

  isSatisfied(index: number): boolean {
    if (index < 1) {
      return false;
    }

    if (!this._indicator.isReady(index)) {
      return false;
    }

    const prevValue = this._indicator.getValue(index - 1);
    const currValue = this._indicator.getValue(index);

    // Текущее: indicator < value
    // Предыдущее: indicator >= value
    return currValue.isLessThan(this._value) && prevValue.isGreaterThanOrEqual(this._value);
  }
}

/**
 * Правило "Больше" между двумя индикаторами
 */
export class IndicatorOverIndicatorRule extends AbstractRule {
  private readonly _first: Indicator<Decimal>;
  private readonly _second: Indicator<Decimal>;

  constructor(first: Indicator<Decimal>, second: Indicator<Decimal>) {
    super(`IndicatorOverIndicatorRule(${first.getName()}, ${second.getName()})`);
    this._first = first;
    this._second = second;
  }

  isSatisfied(index: number): boolean {
    if (!this._first.isReady(index) || !this._second.isReady(index)) {
      return false;
    }
    return this._first.getValue(index).isGreaterThan(this._second.getValue(index));
  }
}

/**
 * Правило "Меньше" между двумя индикаторами
 */
export class IndicatorUnderIndicatorRule extends AbstractRule {
  private readonly _first: Indicator<Decimal>;
  private readonly _second: Indicator<Decimal>;

  constructor(first: Indicator<Decimal>, second: Indicator<Decimal>) {
    super(`IndicatorUnderIndicatorRule(${first.getName()}, ${second.getName()})`);
    this._first = first;
    this._second = second;
  }

  isSatisfied(index: number): boolean {
    if (!this._first.isReady(index) || !this._second.isReady(index)) {
      return false;
    }
    return this._first.getValue(index).isLessThan(this._second.getValue(index));
  }
}
