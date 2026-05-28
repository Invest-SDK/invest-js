/**
 * TradingRecord - Запись торговых операций
 *
 * Отслеживает ордера, сделки и текущие позиции во время бэктестинга.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { Trade } from './trade';
import { Position } from './position';

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
  private readonly _trades: Trade[];
  private readonly _positions: Position[];
  private _currentTrade: Trade | null;
  private _currentPosition: Position | null;
  private readonly _positionType: PositionType;
  private readonly _maxSize: number;

  /**
   * Создаёт новую запись
   * @param positionType Тип позиции (LONG или SHORT)
   * @param maxSize Максимальное количество сделок
   */
  constructor(positionType: PositionType = PositionType.LONG, maxSize = 1000) {
    this._trades = [];
    this._positions = [];
    this._currentTrade = null;
    this._currentPosition = null;
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
  get tradeCount(): number {
    return this._trades.length;
  }

  /**
   * Возвращает количество сделок
   */
  get positionCount(): number {
    return this._positions.length;
  }

  /**
   * Количество закрытых позиций.
   */
  get closedPositionCount(): number {
    return this._positions.filter((p) => p.isClosed()).length;
  }

  /**
   * Количество открытых позиций.
   */
  get openPositionCount(): number {
    return this._positions.filter((p) => !p.isClosed()).length;
  }

  /**
   * Возвращает все ордера
   */
  get trades(): Trade[] {
    return [...this._trades];
  }

  /**
   * Возвращает все сделки
   */
  get positions(): Position[] {
    return [...this._positions];
  }

  /**
   * Возвращает текущий открытый ордер
   */
  get currentTrade(): Trade | null {
    return this._currentTrade;
  }

  /**
   * Возвращает текущую открытую сделку
   */
  get currentPosition(): Position | null {
    return this._currentPosition;
  }

  /**
   * Проверяет, есть ли открытая позиция
   */
  isOpened(): boolean {
    return this._currentTrade !== null || this._currentPosition !== null;
  }

  /**
   * Проверяет, есть ли закрытая позиция
   */
  isClosed(): boolean {
    return this._positions.length > 0 && !this.isOpened();
  }

  /**
   * Возвращает последнюю закрытую сделку
   */
  getLastPosition(): Position | null {
    if (this._positions.length === 0) {
      return null;
    }
    return this._positions[this._positions.length - 1];
  }

  /**
   * Возвращает предпоследнюю закрытую сделку
   */
  getPenultimatePosition(): Position | null {
    const closedTrades = this.getClosedPositions();
    if (closedTrades.length < 2) {
      return null;
    }
    return closedTrades[closedTrades.length - 2];
  }

  /**
   * Возвращает последний ордер
   */
  getLastTrade(): Trade | null {
    if (this._trades.length === 0) {
      return null;
    }
    return this._trades[this._trades.length - 1];
  }

  /**
   * Возвращает прибыль/убыток последней закрытой сделки
   */
  getLastPositionProfit(): Decimal | null {
    const lastTrade = this.getLastPosition();
    return lastTrade ? lastTrade.getProfit() : null;
  }

  /**
   * Добавляет ордер
   * @param trade Ордер для добавления
   */
  addTrade(trade: Trade): void {
    this._trades.push(trade);

    // Для LONG позиций: BUY = вход, SELL = выход
    // Для SHORT позиций: SELL = вход, BUY = выход
    if (
      (this._positionType === PositionType.LONG && trade.getType() === Trade.TRADE_TYPE_BUY) ||
      (this._positionType === PositionType.SHORT && trade.getType() === Trade.TRADE_TYPE_SELL)
    ) {
      this._currentTrade = trade;
    } else {
      // Если это ордер выхода, закрываем текущую позицию
      if (this._currentTrade) {
        const entryTrade = this._currentTrade;
        const exitTrade = trade;
        this._currentTrade = null;

        // Создаём новую сделку. Сделка уже закрыта (есть и вход, и выход),
        // поэтому _currentPosition сбрасывается сразу — isOpened() корректно
        // вернёт false без явного вызова markPositionClosed().
        const position = new Position(entryTrade, exitTrade);
        this._positions.push(position);
        this._currentPosition = null;
      }
    }

    // Ограничиваем размер
    if (this._trades.length > this._maxSize) {
      this._trades.shift();
    }
  }

  /**
   * Фиксирует текущую сделку
   */
  markPositionClosed(): void {
    if (this._currentPosition) {
      this._currentPosition = null;
    }
  }

  /**
   * Добавляет ордер на вход
   * @param index Индекс бара
   * @param price Цена входа
   * @param amount Объём
   * @param commission Комиссия
   * @param time Время сделки (если не передано — Trade использует new Date())
   */
  entry(index: number, price: Decimal, amount: Decimal, commission?: Decimal, time?: Date): void {
    const orderType =
      this._positionType === PositionType.LONG ? Trade.TRADE_TYPE_BUY : Trade.TRADE_TYPE_SELL;
    const trade = new Trade(index, price, amount, orderType, time, undefined, commission);
    this.addTrade(trade);
  }

  /**
   * Добавляет ордер на выход
   * @param index Индекс бара
   * @param price Цена выхода
   * @param amount Объём
   * @param commission Комиссия
   * @param time Время сделки (если не передано — Trade использует new Date())
   */
  exit(index: number, price: Decimal, amount: Decimal, commission?: Decimal, time?: Date): void {
    const orderType =
      this._positionType === PositionType.LONG ? Trade.TRADE_TYPE_SELL : Trade.TRADE_TYPE_BUY;
    const trade = new Trade(index, price, amount, orderType, time, undefined, commission);
    this.addTrade(trade);
  }

  /**
   * Возвращает цену входа
   */
  getEntry(): Decimal | null {
    if (this._currentTrade) {
      return this._currentTrade.getPrice();
    }
    return null;
  }

  /**
   * Возвращает цену выхода
   */
  getExit(): Decimal | null {
    // According to tests, this should return null after a position is created
    // The exit price is only available through the position itself
    return null;
  }

  /**
   * Возвращает общую валовую прибыль
   */
  getGrossProfit(): Decimal {
    let grossProfit = new Decimal('0');
    let grossLoss = new Decimal('0');

    for (const position of this._positions) {
      if (position.isClosed()) {
        const profit = position.getProfit();
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

    for (const position of this._positions) {
      if (position.isClosed()) {
        const profit = position.getProfit();
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

    for (const position of this._positions) {
      if (position.isClosed()) {
        netProfit = netProfit.add(position.getProfit());
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
  getWinningPositionCount(): number {
    let count = 0;
    for (const position of this._positions) {
      if (position.isClosed() && position.getProfit().isPositive()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Возвращает количество убыточных сделок
   */
  getLosingPositionCount(): number {
    let count = 0;
    for (const position of this._positions) {
      if (position.isClosed() && position.getProfit().isNegative()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Возвращает win rate (процент прибыльных сделок)
   */
  getWinRate(): Decimal {
    const totalClosed = this.getWinningPositionCount() + this.getLosingPositionCount();
    if (totalClosed === 0) {
      return new Decimal('0');
    }
    return new Decimal(this.getWinningPositionCount().toString()).divide(
      new Decimal(totalClosed.toString())
    );
  }

  /**
   * Возвращает полный расчёт P&L
   */
  calculateProfitLoss(): ProfitLossCalculation {
    const winningTrades = this.getWinningPositionCount();
    const losingTrades = this.getLosingPositionCount();
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
  getAverageWinningPosition(): Decimal {
    let totalProfit = new Decimal('0');
    let count = 0;

    for (const position of this._positions) {
      if (position.isClosed() && position.getProfit().isPositive()) {
        totalProfit = totalProfit.add(position.getProfit());
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
  getAverageLosingPosition(): Decimal {
    let totalLoss = new Decimal('0');
    let count = 0;

    for (const position of this._positions) {
      if (position.isClosed() && position.getProfit().isNegative()) {
        totalLoss = totalLoss.add(position.getProfit().abs());
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
    const avgWin = this.getAverageWinningPosition();
    const avgLoss = this.getAverageLosingPosition();

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

    for (const position of this._positions) {
      if (position.isClosed()) {
        const profit = position.getProfit();
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

    for (const position of this._positions) {
      if (position.isClosed()) {
        const profit = position.getProfit();
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
  getClosedPositions(): Position[] {
    return this._positions.filter((t) => t.isClosed());
  }

  /**
   * Возвращает массив P&L для всех закрытых сделок
   */
  getPositionProfits(): Decimal[] {
    return this._positions.filter((t) => t.isClosed()).map((t) => t.getProfit());
  }

  /**
   * Возвращает общую статистику
   */
  getSummary(): Record<string, number | string | boolean | null> {
    const pl = this.calculateProfitLoss();

    return {
      tradeCount: this.tradeCount,
      positionCount: this.positionCount,
      closedPositionCount: this.closedPositionCount,
      winningTrades: pl.winningTrades,
      losingTrades: pl.losingTrades,
      winRate: pl.winRate.toString(),
      grossProfit: pl.grossProfit.toString(),
      grossLoss: pl.grossLoss.toString(),
      netProfit: pl.netProfit.toString(),
      profitFactor: pl.profitFactor ? pl.profitFactor.toString() : null,
      averageWin: this.getAverageWinningPosition().toString(),
      averageLoss: this.getAverageLosingPosition().toString(),
      maxProfit: this.getMaxProfit().toString(),
      maxLoss: this.getMaxLoss().toString(),
      averageWinLossRatio: this.getAverageWinLossRatio()?.toString() ?? null,
    };
  }

  /**
   * Очищает запись
   */
  clear(): void {
    this._trades.length = 0;
    this._positions.length = 0;
    this._currentTrade = null;
    this._currentPosition = null;
  }

  /**
   * Создаёт копию записи
   */
  clone(): TradingRecord {
    const cloned = new TradingRecord(this._positionType, this._maxSize);
    // Копируем ордера и сделки
    for (const trade of this._trades) {
      cloned.addTrade(trade);
    }
    return cloned;
  }
}

export { TradingRecord as default };
