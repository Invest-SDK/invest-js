/**
 * Trade - Торговый ордер
 *
 * Представляет собой базовую единицу торговой операции.
 */

import { Decimal, ValidationError } from '@ttech-pub/invest-core';

/**
 * Тип ордера
 */
export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Статус ордера
 */
export enum TradeStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

/**
 * Класс Trade представляет торговый ордер
 *
 * Содержит информацию о цене, объёме, времени и типе ордера.
 */
export class Trade {
  /** Константа для ордеров на покупку */
  static readonly TRADE_TYPE_BUY: TradeType = TradeType.BUY;
  /** Константа для ордеров на продажу */
  static readonly TRADE_TYPE_SELL: TradeType = TradeType.SELL;

  private readonly _index: number;
  private readonly _price: Decimal;
  private readonly _amount: Decimal;
  private readonly _type: TradeType;
  private readonly _time: Date;
  private readonly _status: TradeStatus;
  private readonly _commission: Decimal;

  constructor(
    index: number,
    price: Decimal,
    amount: Decimal,
    type: TradeType,
    time?: Date,
    status?: TradeStatus,
    commission?: Decimal
  ) {
    this._index = index;
    this._price = price instanceof Decimal ? price : new Decimal(price);
    this._amount = amount instanceof Decimal ? amount : new Decimal(amount);
    this._type = type;
    this._time = time || new Date();
    this._status = status || TradeStatus.FILLED;
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
  getType(): TradeType {
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
  getStatus(): TradeStatus {
    return this._status;
  }

  /**
   * Проверяет, является ли ордер ордером на покупку
   */
  isBuy(): boolean {
    return this._type === TradeType.BUY;
  }

  /**
   * Проверяет, является ли ордер ордером на продажу
   */
  isSell(): boolean {
    return this._type === TradeType.SELL;
  }

  /**
   * Проверяет, что ордер исполнен
   */
  isFilled(): boolean {
    return this._status === TradeStatus.FILLED;
  }

  /**
   * Проверяет, что ордер отменён
   */
  isCancelled(): boolean {
    return this._status === TradeStatus.CANCELLED;
  }

  /**
   * Проверяет, что ордер ожидает исполнения
   */
  isPending(): boolean {
    return this._status === TradeStatus.PENDING;
  }

  /**
   * Возвращает валовую стоимость ордера (цена × объём).
   *
   * Без знака и без учёта комиссии — это оборот, а не реальное движение денег.
   * Для денежного потока используйте {@link getSignedCashflow}.
   */
  getValue(): Decimal {
    return this._price.multiply(this._amount);
  }

  /**
   * Возвращает знаковый денежный поток ордера с учётом комиссии.
   *
   * - BUY:  -(цена × объём) - комиссия (деньги уходят со счёта)
   * - SELL: +(цена × объём) - комиссия (деньги приходят на счёт)
   */
  getSignedCashflow(): Decimal {
    const notional = this._price.multiply(this._amount);
    if (this._type === TradeType.BUY) {
      return new Decimal('0').subtract(notional).subtract(this._commission);
    }
    return notional.subtract(this._commission);
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
  copy(): Trade {
    return new Trade(
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
  equals(other: Trade): boolean {
    return (
      this._index === other._index &&
      this._price.isEqualTo(other._price) &&
      this._amount.isEqualTo(other._amount) &&
      this._type === other._type &&
      this._commission.isEqualTo(other._commission)
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
  ): Trade {
    return new Trade(index, price, amount, TradeType.BUY, time, undefined, commission);
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
  ): Trade {
    return new Trade(index, price, amount, TradeType.SELL, time, undefined, commission);
  }
}
