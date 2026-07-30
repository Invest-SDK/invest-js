/**
 * Trade - Торговая сделка
 *
 * Представляет пару ордеров (вход и выход) или открытую позицию.
 */

import { Decimal } from '@t-tech/invest-shared';
import { Order } from './order';

/**
 * Класс Trade представляет торговую сделку
 *
 * Сделка состоит из ордера на вход (entry) и опционально ордера на выход (exit).
 * Если выходной ордер не установлен, сделка считается открытой.
 */
export class Trade {
  private readonly _entry: Order;
  private readonly _exit: Order | null;
  private readonly _maxSize: number;

  /**
   * Создаёт новую сделку
   * @param entry Ордер на вход
   */
  constructor(entry: Order);
  /**
   * Создаёт закрытую сделку
   * @param entry Ордер на вход
   * @param exit Ордер на выход
   */
  constructor(entry: Order, exit: Order | null);
  constructor(entry: Order, exit: Order | null = null) {
    this._entry = entry;
    this._exit = exit;
    this._maxSize = 1000;
  }

  /**
   * Возвращает ордер на вход
   */
  getEntry(): Order {
    return this._entry;
  }

  /**
   * Возвращает ордер на выход
   */
  getExitOrder(): Order | null {
    return this._exit;
  }

  /**
   * Возвращает тип сделки (LONG или SHORT)
   */
  getType(): 'LONG' | 'SHORT' {
    if (this._entry.isBuy()) {
      return 'LONG';
    }
    return 'SHORT';
  }

  /**
   * Возвращает цену входа
   */
  getEntryPrice(): Decimal {
    return this._entry.getPrice();
  }

  /**
   * Возвращает цену выхода
   */
  getExitPrice(): Decimal | null {
    return this._exit ? this._exit.getPrice() : null;
  }

  /**
   * Возвращает объём сделки
   */
  getAmount(): Decimal {
    return this._entry.getAmount();
  }

  /**
   * Возвращает индекс бара входа
   */
  getEntryIndex(): number {
    return this._entry.getIndex();
  }

  /**
   * Возвращает индекс бара выхода
   */
  getExitIndex(): number | null {
    return this._exit ? this._exit.getIndex() : null;
  }

  /**
   * Возвращает время входа
   */
  getEntryTime(): Date {
    return this._entry.getTime();
  }

  /**
   * Возвращает время выхода
   */
  getExitTime(): Date | null {
    return this._exit ? this._exit.getTime() : null;
  }

  /**
   * Проверяет, является ли сделка длинной (LONG)
   */
  isLong(): boolean {
    return this._entry.isBuy();
  }

  /**
   * Проверяет, является ли сделка короткой (SHORT)
   */
  isShort(): boolean {
    return this._entry.isSell();
  }

  /**
   * Проверяет, что сделка закрыта
   */
  isClosed(): boolean {
    return this._exit !== null;
  }

  /**
   * Проверяет, что сделка открыта
   */
  isOpened(): boolean {
    return this._exit === null;
  }

  /**
   * Возвращает прибыль/убыток сделки
   */
  getProfit(): Decimal {
    if (!this._exit) {
      return new Decimal('0');
    }

    const entryPrice = this._entry.getPrice();
    const exitPrice = this._exit.getPrice();
    const amount = this._entry.getAmount();

    let profit: Decimal;

    if (this._entry.isBuy()) {
      // LONG: прибыль = (цена выхода - цена входа) × объём
      profit = exitPrice.subtract(entryPrice).multiply(amount);
    } else {
      // SHORT: прибыль = (цена входа - цена выхода) × объём
      profit = entryPrice.subtract(exitPrice).multiply(amount);
    }

    // Вычитаем комиссии
    const commission = this._entry.getCommission().add(this._exit.getCommission());

    return profit.subtract(commission);
  }

  /**
   * Возвращает прибыль/убыток в процентах
   */
  getProfitPercent(): Decimal {
    const profit = this.getProfit();
    const entryValue = this._entry.getPrice().multiply(this._entry.getAmount());

    if (entryValue.isZero()) {
      return new Decimal('0');
    }

    return profit.divide(entryValue).multiply(new Decimal('100'));
  }

  /**
   * Возвращает P&L в пунктах (price difference × amount)
   */
  getPoints(): Decimal {
    if (!this._exit) {
      return new Decimal('0');
    }

    const entryPrice = this._entry.getPrice();
    const exitPrice = this._exit.getPrice();

    if (this._entry.isBuy()) {
      return exitPrice.subtract(entryPrice);
    } else {
      return entryPrice.subtract(exitPrice);
    }
  }

  /**
   * Возвращает общую стоимость сделки
   */
  getTotalValue(): Decimal {
    const entryValue = this._entry.getPrice().multiply(this._entry.getAmount());
    if (!this._exit) {
      return entryValue;
    }
    const exitValue = this._exit.getPrice().multiply(this._exit.getAmount());
    return entryValue.add(exitValue);
  }

  /**
   * Возвращает продолжительность сделки в барах
   */
  getBarCount(): number {
    if (!this._exit) {
      return 0;
    }
    return this._exit.getIndex() - this._entry.getIndex();
  }

  /**
   * Возвращает продолжительность сделки в миллисекундах
   */
  getDuration(): number | null {
    if (!this._exit) {
      return null;
    }
    return this._exit.getTime().getTime() - this._entry.getTime().getTime();
  }

  /**
   * Возвращает строку с информацией о сделке
   */
  toString(): string {
    const entryStr = `${this._entry.isBuy() ? 'LONG' : 'SHORT'} entry: ${this._entry.toString()}`;

    if (this._exit) {
      const exitStr = `exit: ${this._exit.toString()}`;
      const profit = this.getProfit();
      const profitStr = `P&L: ${profit.toString()} (${this.getProfitPercent().toString()}%)`;
      return `${entryStr}, ${exitStr}, ${profitStr}`;
    }

    return `${entryStr}, position OPEN`;
  }
}
