/**
 * CostModel — модель транзакционных издержек для бэктеста.
 *
 * Аналог ta4j `CostModel` (transaction cost). Возвращает комиссию для одной
 * стороны сделки на основе цены и объёма.
 */

import { Decimal } from '@ttech-pub/invest-core';

export interface CostModel {
  /**
   * Возвращает комиссию для одной стороны сделки.
   * @param price цена исполнения
   * @param amount объём в единицах инструмента
   */
  calculate(price: Decimal, amount: Decimal): Decimal;

  getName(): string;
}

/** Нулевая комиссия — поведение по умолчанию (совместимо со старыми тестами). */
export class ZeroCostModel implements CostModel {
  calculate(_price?: Decimal, _amount?: Decimal): Decimal {
    return new Decimal('0');
  }

  getName(): string {
    return 'ZeroCostModel';
  }
}

/** Линейная комиссия: коэффициент × notional (price × amount). */
export class LinearTransactionCostModel implements CostModel {
  private readonly _coefficient: Decimal;

  constructor(coefficient: Decimal) {
    if (coefficient.isNegative()) {
      throw new Error('coefficient cannot be negative');
    }
    this._coefficient = coefficient;
  }

  calculate(price: Decimal, amount: Decimal): Decimal {
    return price.multiply(amount).multiply(this._coefficient);
  }

  getCoefficient(): Decimal {
    return this._coefficient;
  }

  getName(): string {
    return `LinearTransactionCostModel(${this._coefficient.toString()})`;
  }
}

/** Фиксированная комиссия на одну сторону сделки. */
export class FixedTransactionCostModel implements CostModel {
  private readonly _fee: Decimal;

  constructor(fee: Decimal) {
    if (fee.isNegative()) {
      throw new Error('fee cannot be negative');
    }
    this._fee = fee;
  }

  calculate(_price?: Decimal, _amount?: Decimal): Decimal {
    return this._fee;
  }

  getFee(): Decimal {
    return this._fee;
  }

  getName(): string {
    return `FixedTransactionCostModel(${this._fee.toString()})`;
  }
}
