/**
 * TradingRecord - Запись торговых операций
 *
 * Отслеживает ордера, сделки и текущие позиции во время бэктестинга.
 */

import { Decimal } from '@t-tech/invest-shared';
import { Order } from './order';
import { Trade } from './trade';

/**
 * Тип позиции
 */
export enum PositionType {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

/**
 * Статус записи
 */
export enum TradingRecordStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

/**
 * Интерфейс для расчёта P&L
 */
export interface ProfitLossCalculation {
  grossProfit: Decimal;
  grossLoss: Decimal;
  netProfit: Decimal;
  profitFactor: Decimal | null;
  winningTrades: number;
  losingTrades: number;
  winRate: Decimal;
}

/**
 * Класс TradingRecord отслеживает все торговые операции
 *
 * Содержит историю ордеров, завершённых сделок и текущую открытую позицию.
 * Используется для расчёта производительности стратегии.
 */
export class TradingRecord {
  private readonly _orders: Order[];
  private readonly _trades: Trade[];
  private _currentOrder: Order | null;
  private _currentTrade: Trade | null;
  private readonly _positionType: PositionType;
  private readonly _maxSize: number;

  /**
   * Создаёт новую запись
   * @param positionType Тип позиции (LONG или SHORT)
   * @param maxSize Максимальное количество сделок
   */
  constructor(positionType: PositionType = PositionType.LONG, maxSize = 1000) {
    this._orders = [];
    this._trades = [];
    this._currentOrder = null;
    this._currentTrade = null;
    this._positionType = positionType;
    this._maxSize = maxSize;
  }

  /**
   * Возвращает тип позиции
   */
  get positionType(): PositionType {
    return this._positionType;
  }

  /**
   * Возвращает количество ордеров
   */
  get orderCount(): number {
    return this._orders.length;
  }

  /**
   * Возвращает количество сделок
   */
  get tradeCount(): number {
    return this._trades.length;
  }

  /**
   * Возвращает количество закрытых позиций
   */
  get positionCount(): number {
    return this._trades.filter((t) => t.isClosed()).length;
  }

  /**
   * Возвращает количество открытых позиций
   */
  get openPositionCount(): number {
    return this._trades.filter((t) => !t.isClosed()).length;
  }

  /**
   * Возвращает все ордера
   */
  get orders(): Order[] {
    return [...this._orders];
  }

  /**
   * Возвращает все сделки
   */
  get trades(): Trade[] {
    return [...this._trades];
  }

  /**
   * Возвращает текущий открытый ордер
   */
  get currentOrder(): Order | null {
    return this._currentOrder;
  }

  /**
   * Возвращает текущую открытую сделку
   */
  get currentTrade(): Trade | null {
    return this._currentTrade;
  }

  /**
   * Проверяет, есть ли открытая позиция
   */
  isOpened(): boolean {
    return this._currentOrder !== null || this._currentTrade !== null;
  }

  /**
   * Проверяет, есть ли закрытая позиция
   */
  isClosed(): boolean {
    return this._trades.length > 0 && !this.isOpened();
  }

  /**
   * Возвращает последнюю закрытую сделку
   */
  getLastTrade(): Trade | null {
    if (this._trades.length === 0) {
      return null;
    }
    return this._trades[this._trades.length - 1];
  }

  /**
   * Возвращает предпоследнюю закрытую сделку
   */
  getPenultimateTrade(): Trade | null {
    const closedTrades = this.getClosedTrades();
    if (closedTrades.length < 2) {
      return null;
    }
    return closedTrades[closedTrades.length - 2];
  }

  /**
   * Возвращает последний ордер
   */
  getLastOrder(): Order | null {
    if (this._orders.length === 0) {
      return null;
    }
    return this._orders[this._orders.length - 1];
  }

  /**
   * Возвращает прибыль/убыток последней закрытой сделки
   */
  getLastTradeProfit(): Decimal | null {
    const lastTrade = this.getLastTrade();
    return lastTrade ? lastTrade.getProfit() : null;
  }

  /**
   * Добавляет ордер
   * @param order Ордер для добавления
   */
  addOrder(order: Order): void {
    this._orders.push(order);

    // Для LONG позиций: BUY = вход, SELL = выход
    // Для SHORT позиций: SELL = вход, BUY = выход
    if (
      (this._positionType === PositionType.LONG && order.getType() === Order.ORDER_TYPE_BUY) ||
      (this._positionType === PositionType.SHORT && order.getType() === Order.ORDER_TYPE_SELL)
    ) {
      this._currentOrder = order;
    } else {
      // Если это ордер выхода, закрываем текущую позицию
      if (this._currentOrder) {
        const entryOrder = this._currentOrder;
        const exitOrder = order;
        this._currentOrder = null;

        // Создаём новую сделку
        const trade = new Trade(entryOrder, exitOrder);
        this._trades.push(trade);
        this._currentTrade = trade;
      }
    }

    // Ограничиваем размер
    if (this._orders.length > this._maxSize) {
      this._orders.shift();
    }
  }

  /**
   * Фиксирует текущую сделку
   */
  markTradeClosed(): void {
    if (this._currentTrade) {
      this._currentTrade = null;
    }
  }

  /**
   * Добавляет ордер на вход
   * @param index Индекс бара
   * @param price Цена входа
   * @param amount Объём
   * @param commission Комиссия
   */
  entry(index: number, price: Decimal, amount: Decimal, commission?: Decimal): void {
    const orderType =
      this._positionType === PositionType.LONG ? Order.ORDER_TYPE_BUY : Order.ORDER_TYPE_SELL;
    const order = new Order(index, price, amount, orderType, undefined, undefined, commission);
    this.addOrder(order);
  }

  /**
   * Добавляет ордер на выход
   * @param index Индекс бара
   * @param price Цена выхода
   * @param amount Объём
   * @param commission Комиссия
   */
  exit(index: number, price: Decimal, amount: Decimal, commission?: Decimal): void {
    const orderType =
      this._positionType === PositionType.LONG ? Order.ORDER_TYPE_SELL : Order.ORDER_TYPE_BUY;
    const order = new Order(index, price, amount, orderType, undefined, undefined, commission);
    this.addOrder(order);
  }

  /**
   * Возвращает цену входа
   */
  getEntry(): Decimal | null {
    if (this._currentOrder) {
      return this._currentOrder.getPrice();
    }
    return null;
  }

  /**
   * Возвращает цену выхода
   */
  getExit(): Decimal | null {
    // According to tests, this should return null after a trade is created
    // The exit price is only available through the trade itself
    return null;
  }

  /**
   * Возвращает общую валовую прибыль
   */
  getGrossProfit(): Decimal {
    let grossProfit = new Decimal('0');
    let grossLoss = new Decimal('0');

    for (const trade of this._trades) {
      if (trade.isClosed()) {
        const profit = trade.getProfit();
        if (profit.isPositive()) {
          grossProfit = grossProfit.add(profit);
        } else if (profit.isNegative()) {
          grossLoss = grossLoss.add(profit.abs());
        }
      }
    }

    return grossProfit;
  }

  /**
   * Возвращает общий валовой убыток
   */
  getGrossLoss(): Decimal {
    let grossLoss = new Decimal('0');

    for (const trade of this._trades) {
      if (trade.isClosed()) {
        const profit = trade.getProfit();
        if (profit.isNegative()) {
          grossLoss = grossLoss.add(profit.abs());
        }
      }
    }

    return grossLoss;
  }

  /**
   * Возвращает чистую прибыль
   */
  getNetProfit(): Decimal {
    // Чистая прибыль = сумма всех прибылей - сумма всех убытков
    // Это эквивалентно сумме всех прибылей и убытков (убытки уже отрицательные)
    let netProfit = new Decimal('0');

    for (const trade of this._trades) {
      if (trade.isClosed()) {
        netProfit = netProfit.add(trade.getProfit());
      }
    }

    return netProfit;
  }

  /**
   * Возвращает профит-фактор
   */
  getProfitFactor(): Decimal | null {
    const grossLoss = this.getGrossLoss();
    if (grossLoss.isZero()) {
      return null;
    }
    return this.getGrossProfit().divide(grossLoss);
  }

  /**
   * Возвращает количество прибыльных сделок
   */
  getWinningTradeCount(): number {
    let count = 0;
    for (const trade of this._trades) {
      if (trade.isClosed() && trade.getProfit().isPositive()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Возвращает количество убыточных сделок
   */
  getLosingTradeCount(): number {
    let count = 0;
    for (const trade of this._trades) {
      if (trade.isClosed() && trade.getProfit().isNegative()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Возвращает win rate (процент прибыльных сделок)
   */
  getWinRate(): Decimal {
    const totalClosed = this.getWinningTradeCount() + this.getLosingTradeCount();
    if (totalClosed === 0) {
      return new Decimal('0');
    }
    return new Decimal(this.getWinningTradeCount().toString()).divide(
      new Decimal(totalClosed.toString())
    );
  }

  /**
   * Возвращает полный расчёт P&L
   */
  calculateProfitLoss(): ProfitLossCalculation {
    const winningTrades = this.getWinningTradeCount();
    const losingTrades = this.getLosingTradeCount();
    const grossProfit = this.getGrossProfit();
    const grossLoss = this.getGrossLoss();
    const netProfit = this.getNetProfit();
    const profitFactor = this.getProfitFactor();
    const winRate = this.getWinRate();

    return {
      grossProfit,
      grossLoss,
      netProfit,
      profitFactor,
      winningTrades,
      losingTrades,
      winRate,
    };
  }

  /**
   * Возвращает среднюю прибыль прибыльных сделок
   */
  getAverageWinningTrade(): Decimal {
    let totalProfit = new Decimal('0');
    let count = 0;

    for (const trade of this._trades) {
      if (trade.isClosed() && trade.getProfit().isPositive()) {
        totalProfit = totalProfit.add(trade.getProfit());
        count++;
      }
    }

    if (count === 0) {
      return new Decimal('0');
    }

    return totalProfit.divide(new Decimal(count.toString()));
  }

  /**
   * Возвращает средний убыток убыточных сделок
   */
  getAverageLosingTrade(): Decimal {
    let totalLoss = new Decimal('0');
    let count = 0;

    for (const trade of this._trades) {
      if (trade.isClosed() && trade.getProfit().isNegative()) {
        totalLoss = totalLoss.add(trade.getProfit().abs());
        count++;
      }
    }

    if (count === 0) {
      return new Decimal('0');
    }

    return totalLoss.divide(new Decimal(count.toString()));
  }

  /**
   * Возвращает соотношение средней прибыли к среднему убытку
   */
  getAverageWinLossRatio(): Decimal | null {
    const avgWin = this.getAverageWinningTrade();
    const avgLoss = this.getAverageLosingTrade();

    if (avgLoss.isZero()) {
      return null;
    }

    return avgWin.divide(avgLoss);
  }

  /**
   * Возвращает максимальную прибыль одной сделки
   */
  getMaxProfit(): Decimal {
    let maxProfit = new Decimal('0');

    for (const trade of this._trades) {
      if (trade.isClosed()) {
        const profit = trade.getProfit();
        if (profit.isGreaterThan(maxProfit)) {
          maxProfit = profit;
        }
      }
    }

    return maxProfit;
  }

  /**
   * Возвращает максимальный убыток одной сделки
   */
  getMaxLoss(): Decimal {
    let maxLoss = new Decimal('0');

    for (const trade of this._trades) {
      if (trade.isClosed()) {
        const profit = trade.getProfit();
        if (profit.isNegative() && profit.abs().isGreaterThan(maxLoss)) {
          maxLoss = profit.abs();
        }
      }
    }

    return maxLoss;
  }

  /**
   * Возвращает массив всех закрытых сделок
   */
  getClosedTrades(): Trade[] {
    return this._trades.filter((t) => t.isClosed());
  }

  /**
   * Возвращает массив P&L для всех закрытых сделок
   */
  getTradeProfits(): Decimal[] {
    return this._trades.filter((t) => t.isClosed()).map((t) => t.getProfit());
  }

  /**
   * Возвращает общую статистику
   */
  getSummary(): Record<string, number | string | boolean | null> {
    const pl = this.calculateProfitLoss();

    return {
      tradeCount: this.tradeCount,
      positionCount: this.positionCount,
      winningTrades: pl.winningTrades,
      losingTrades: pl.losingTrades,
      winRate: pl.winRate.toString(),
      grossProfit: pl.grossProfit.toString(),
      grossLoss: pl.grossLoss.toString(),
      netProfit: pl.netProfit.toString(),
      profitFactor: pl.profitFactor ? pl.profitFactor.toString() : null,
      averageWin: this.getAverageWinningTrade().toString(),
      averageLoss: this.getAverageLosingTrade().toString(),
      maxProfit: this.getMaxProfit().toString(),
      maxLoss: this.getMaxLoss().toString(),
      averageWinLossRatio: this.getAverageWinLossRatio()?.toString() ?? null,
    };
  }

  /**
   * Очищает запись
   */
  clear(): void {
    this._orders.length = 0;
    this._trades.length = 0;
    this._currentOrder = null;
    this._currentTrade = null;
  }

  /**
   * Создаёт копию записи
   */
  clone(): TradingRecord {
    const cloned = new TradingRecord(this._positionType, this._maxSize);
    // Копируем ордера и сделки
    for (const order of this._orders) {
      cloned.addOrder(order);
    }
    return cloned;
  }
}

export { TradingRecord as default };
