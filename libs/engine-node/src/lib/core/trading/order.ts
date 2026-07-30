/**
 * Order - Торговый ордер
 *
 * Представляет собой базовую единицу торговой операции.
 */

import { Decimal, ValidationError } from '@t-tech/invest-shared';

/**
 * Тип ордера
 */
export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Статус ордера
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

/**
 * Класс Order представляет торговый ордер
 *
 * Содержит информацию о цене, объёме, времени и типе ордера.
 */
export class Order {
  /** Константа для ордеров на покупку */
  static readonly ORDER_TYPE_BUY: OrderType = OrderType.BUY;
  /** Константа для ордеров на продажу */
  static readonly ORDER_TYPE_SELL: OrderType = OrderType.SELL;

  private readonly _index: number;
  private readonly _price: Decimal;
  private readonly _amount: Decimal;
  private readonly _type: OrderType;
  private readonly _time: Date;
  private readonly _status: OrderStatus;
  private readonly _commission: Decimal;

  constructor(
    index: number,
    price: Decimal,
    amount: Decimal,
    type: OrderType,
    time?: Date,
    status?: OrderStatus,
    commission?: Decimal
  ) {
    this._index = index;
    this._price = price instanceof Decimal ? price : new Decimal(price);
    this._amount = amount instanceof Decimal ? amount : new Decimal(amount);
    this._type = type;
    this._time = time || new Date();
    this._status = status || OrderStatus.FILLED;
    this._commission = commission instanceof Decimal ? commission : new Decimal(commission || '0');

    // Validation of input data
    if (this._price.isNegative() || this._price.isZero()) {
      throw new ValidationError('Price must be a positive number');
    }

    if (this._amount.isNegative() || this._amount.isZero()) {
      throw new ValidationError('Amount must be a positive number');
    }

    if (this._commission.isNegative()) {
      throw new ValidationError('Commission cannot be negative');
    }
  }

  /**
   * Возвращает индекс бара
   */
  getIndex(): number {
    return this._index;
  }

  /**
   * Возвращает цену
   */
  getPrice(): Decimal {
    return this._price;
  }

  /**
   * Возвращает объём
   */
  getAmount(): Decimal {
    return this._amount;
  }

  /**
   * Возвращает тип ордера
   */
  getType(): OrderType {
    return this._type;
  }

  /**
   * Возвращает время создания
   */
  getTime(): Date {
    return this._time;
  }

  /**
   * Возвращает статус ордера
   */
  getStatus(): OrderStatus {
    return this._status;
  }

  /**
   * Проверяет, является ли ордер ордером на покупку
   */
  isBuy(): boolean {
    return this._type === OrderType.BUY;
  }

  /**
   * Проверяет, является ли ордер ордером на продажу
   */
  isSell(): boolean {
    return this._type === OrderType.SELL;
  }

  /**
   * Проверяет, что ордер исполнен
   */
  isFilled(): boolean {
    return this._status === OrderStatus.FILLED;
  }

  /**
   * Проверяет, что ордер отменён
   */
  isCancelled(): boolean {
    return this._status === OrderStatus.CANCELLED;
  }

  /**
   * Проверяет, что ордер ожидает исполнения
   */
  isPending(): boolean {
    return this._status === OrderStatus.PENDING;
  }

  /**
   * Возвращает общую стоимость ордера (цена × объём)
   */
  getValue(): Decimal {
    return this._price.multiply(this._amount);
  }

  /**
   * Возвращает комиссию
   */
  getCommission(): Decimal {
    return this._commission;
  }

  /**
   * Создаёт копию ордера
   */
  copy(): Order {
    return new Order(
      this._index,
      this._price,
      this._amount,
      this._type,
      new Date(this._time),
      this._status,
      this._commission
    );
  }

  /**
   * Проверяет равенство с другим ордером
   */
  equals(other: Order): boolean {
    return (
      this._index === other._index &&
      this._price.isEqualTo(other._price) &&
      this._amount.isEqualTo(other._amount) &&
      this._type === other._type
    );
  }

  /**
   * Фабричный метод для создания ордера на покупку
   */
  static buy(
    index: number,
    price: Decimal,
    amount: Decimal,
    time?: Date,
    commission?: Decimal
  ): Order {
    return new Order(index, price, amount, OrderType.BUY, time, undefined, commission);
  }

  /**
   * Фабричный метод для создания ордера на продажу
   */
  static sell(
    index: number,
    price: Decimal,
    amount: Decimal,
    time?: Date,
    commission?: Decimal
  ): Order {
    return new Order(index, price, amount, OrderType.SELL, time, undefined, commission);
  }
}
