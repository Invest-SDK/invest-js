/**
 * Trading Rules - Правила управления торговлей
 *
 * Правила стоп-лосса, тейк-профита и других торговых условий.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar';
import { TradingRecord, PositionType } from '../trading';
import { AbstractRule } from './rule';
import { Indicator } from '../indicators';

/**
 * Правило стоп-лосса
 *
 * Условие подтверждается ценой закрытия бара, когда она достигает заданного
 * процента убытка от цены входа.
 */
export class StopLossRule extends AbstractRule {
  private readonly _barSeries: BarSeries;
  private readonly _lossPercentage: Decimal;

  constructor(barSeries: BarSeries, lossPercentage: Decimal) {
    super(`StopLossRule(${lossPercentage.toString()}%)`);
    this._barSeries = barSeries;
    this._lossPercentage = lossPercentage;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!tradingRecord || !tradingRecord.isOpened()) {
      return false;
    }

    const entryPrice = tradingRecord.getEntry();
    if (!entryPrice) {
      return false;
    }

    const bar = this._barSeries.getBar(index);
    if (!bar) {
      return false;
    }

    // Don't trigger stop loss on entry bar
    const entryTrade = tradingRecord.currentTrade;
    if (entryTrade && entryTrade.getIndex() === index) {
      return false;
    }

    // Для длинной позиции: стоп срабатывает, когда цена падает
    // Для короткой позиции: стоп срабатывает, когда цена растёт
    const isLong = tradingRecord.positionType === PositionType.LONG;

    if (isLong) {
      const stopPrice = entryPrice.multiply(
        new Decimal('1').subtract(this._lossPercentage.divide(new Decimal('100')))
      );
      return bar.close.isLessThanOrEqual(stopPrice);
    } else {
      const stopPrice = entryPrice.multiply(
        new Decimal('1').add(this._lossPercentage.divide(new Decimal('100')))
      );
      return bar.close.isGreaterThanOrEqual(stopPrice);
    }
  }
}

/**
 * Правило тейк-профита
 *
 * Условие подтверждается ценой закрытия бара, когда она достигает заданного
 * процента прибыли от цены входа.
 */
export class TakeProfitRule extends AbstractRule {
  private readonly _barSeries: BarSeries;
  private readonly _profitPercentage: Decimal;

  constructor(barSeries: BarSeries, profitPercentage: Decimal) {
    const percentage =
      profitPercentage instanceof Decimal ? profitPercentage : new Decimal(profitPercentage);
    super(`TakeProfitRule(${percentage.toString()}%)`);
    this._barSeries = barSeries;
    this._profitPercentage = percentage;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!tradingRecord || !tradingRecord.isOpened()) {
      return false;
    }

    const entryPrice = tradingRecord.getEntry();
    if (!entryPrice) {
      return false;
    }

    const bar = this._barSeries.getBar(index);
    if (!bar) {
      return false;
    }

    // Don't trigger take profit on entry bar
    const entryTrade = tradingRecord.currentTrade;
    if (entryTrade && entryTrade.getIndex() === index) {
      return false;
    }

    const isLong = tradingRecord.positionType === PositionType.LONG;

    if (isLong) {
      const targetPrice = entryPrice.multiply(
        new Decimal('1').add(this._profitPercentage.divide(new Decimal('100')))
      );
      return bar.close.isGreaterThanOrEqual(targetPrice);
    } else {
      const targetPrice = entryPrice.multiply(
        new Decimal('1').subtract(this._profitPercentage.divide(new Decimal('100')))
      );
      return bar.close.isLessThanOrEqual(targetPrice);
    }
  }
}

/**
 * Trailing Stop Rule - Трейлинг-стоп
 *
 * Сдвигает стоп на заданный процент от последнего благоприятного high/low.
 * Пробой подтверждается ценой закрытия бара.
 */
export class TrailingStopRule extends AbstractRule {
  private readonly _barSeries: BarSeries;
  private readonly _trailPercentage: Decimal;
  private _highestPrice: Decimal | null = null;
  private _lowestPrice: Decimal | null = null;
  private _trailingPrice: Decimal | null = null;
  private _entryIndex: number | null = null;

  constructor(barSeries: BarSeries, trailPercentage: Decimal) {
    const percentage =
      trailPercentage instanceof Decimal ? trailPercentage : new Decimal(trailPercentage);
    super(`TrailingStopRule(${percentage.toString()}%)`);
    this._barSeries = barSeries;
    this._trailPercentage = percentage;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!tradingRecord || !tradingRecord.isOpened()) {
      // Reset tracking when position is closed
      this._highestPrice = null;
      this._lowestPrice = null;
      this._trailingPrice = null;
      this._entryIndex = null;
      return false;
    }

    const entryPrice = tradingRecord.getEntry();
    if (!entryPrice) {
      return false;
    }

    const bar = this._barSeries.getBar(index);
    if (!bar) {
      return false;
    }

    const isLong = tradingRecord.positionType === PositionType.LONG;
    const trailRatio = this._trailPercentage.divide(new Decimal('100'));
    const one = new Decimal('1');

    // Don't trigger trailing stop on entry bar — но именно на entry-баре
    // инициализируем _trailingPrice, иначе при монотонном падении после
    // входа стоп никогда не сработает.
    const entryTrade = tradingRecord.currentTrade;
    if (entryTrade && entryTrade.getIndex() === index) {
      this._entryIndex = index;
      this._highestPrice = bar.high;
      this._lowestPrice = bar.low;
      this._trailingPrice = isLong
        ? bar.high.multiply(one.subtract(trailRatio))
        : bar.low.multiply(one.add(trailRatio));
      return false;
    }

    // Сбрасываем накопленное состояние, если переключились на новую сделку
    // (тот же rule-инстанс используется для нескольких записей).
    if (entryTrade && this._entryIndex !== entryTrade.getIndex()) {
      this._entryIndex = entryTrade.getIndex();
      const entryBar = this._barSeries.getBar(this._entryIndex);
      const initialWatermark = isLong
        ? (entryBar?.high ?? entryPrice)
        : (entryBar?.low ?? entryPrice);
      this._highestPrice = isLong ? initialWatermark : null;
      this._lowestPrice = isLong ? null : initialWatermark;
      this._trailingPrice = initialWatermark.multiply(
        isLong ? one.subtract(trailRatio) : one.add(trailRatio)
      );
    }

    if (isLong) {
      // For long positions: track highest high and trailing stop below it
      if (bar.high.isGreaterThan(this._highestPrice || new Decimal('-Infinity'))) {
        this._highestPrice = bar.high;
        this._trailingPrice = this._highestPrice.multiply(one.subtract(trailRatio));
      }

      if (this._trailingPrice && bar.close.isLessThanOrEqual(this._trailingPrice)) {
        return true;
      }
    } else {
      // For short positions: track lowest low and trailing stop above it
      if (bar.low.isLessThan(this._lowestPrice || new Decimal('Infinity'))) {
        this._lowestPrice = bar.low;
        this._trailingPrice = this._lowestPrice.multiply(one.add(trailRatio));
      }

      if (this._trailingPrice && bar.close.isGreaterThanOrEqual(this._trailingPrice)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Правило ожидания (не входить в сделку в течение N баров)
 */
export class WaitRule extends AbstractRule {
  private readonly _barSeries: BarSeries;
  private readonly _barCount: number;

  constructor(barSeries: BarSeries, barCount: number) {
    super(`WaitRule(${barCount} bars)`);
    this._barSeries = barSeries;
    this._barCount = barCount;
  }

  isSatisfied(index: number, tradingRecord?: TradingRecord): boolean {
    if (!tradingRecord) {
      return true;
    }

    const lastTrade = tradingRecord.getLastPosition();
    if (!lastTrade) {
      return true;
    }

    const exitIndex = lastTrade.getExitIndex();
    if (exitIndex === null) {
      // Последняя сделка ещё открыта — правило ожидания не должно срабатывать.
      return false;
    }
    return index - exitIndex >= this._barCount;
  }
}

/**
 * Правило "цена выше скользящей средней"
 */
export class PriceOverSMARule extends AbstractRule {
  private readonly _closeIndicator: Indicator<Decimal>;
  private readonly _smaIndicator: Indicator<Decimal>;

  constructor(closeIndicator: Indicator<Decimal>, smaIndicator: Indicator<Decimal>) {
    super(`PriceOverSMARule(${smaIndicator.getName()})`);
    this._closeIndicator = closeIndicator;
    this._smaIndicator = smaIndicator;
  }

  isSatisfied(index: number): boolean {
    if (!this._closeIndicator.isReady(index) || !this._smaIndicator.isReady(index)) {
      return false;
    }
    return this._closeIndicator.getValue(index).isGreaterThan(this._smaIndicator.getValue(index));
  }
}

/**
 * Правило "цена ниже скользящей средней"
 */
export class PriceUnderSMARule extends AbstractRule {
  private readonly _closeIndicator: Indicator<Decimal>;
  private readonly _smaIndicator: Indicator<Decimal>;

  constructor(closeIndicator: Indicator<Decimal>, smaIndicator: Indicator<Decimal>) {
    super(`PriceUnderSMARule(${smaIndicator.getName()})`);
    this._closeIndicator = closeIndicator;
    this._smaIndicator = smaIndicator;
  }

  isSatisfied(index: number): boolean {
    if (!this._closeIndicator.isReady(index) || !this._smaIndicator.isReady(index)) {
      return false;
    }
    return this._closeIndicator.getValue(index).isLessThan(this._smaIndicator.getValue(index));
  }
}

/**
 * Правило RSI перекупленности
 */
export class OverboughtRSIRule extends AbstractRule {
  private readonly _rsiIndicator: Indicator<Decimal>;
  private readonly _threshold: Decimal;

  constructor(rsiIndicator: Indicator<Decimal>, threshold: Decimal = new Decimal('70')) {
    super(`OverboughtRSIRule(${threshold.toString()})`);
    this._rsiIndicator = rsiIndicator;
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._rsiIndicator.isReady(index)) {
      return false;
    }
    return this._rsiIndicator.getValue(index).isGreaterThanOrEqual(this._threshold);
  }
}

/**
 * Правило RSI перепроданности
 */
export class OversoldRSIRule extends AbstractRule {
  private readonly _rsiIndicator: Indicator<Decimal>;
  private readonly _threshold: Decimal;

  constructor(rsiIndicator: Indicator<Decimal>, threshold: Decimal = new Decimal('30')) {
    super(`OversoldRSIRule(${threshold.toString()})`);
    this._rsiIndicator = rsiIndicator;
    this._threshold = threshold;
  }

  isSatisfied(index: number): boolean {
    if (!this._rsiIndicator.isReady(index)) {
      return false;
    }
    return this._rsiIndicator.getValue(index).isLessThanOrEqual(this._threshold);
  }
}

/**
 * Правило "первый бар после входа"
 */
export class FirstBarRule extends AbstractRule {
  private readonly _tradingRecord: TradingRecord;

  constructor(tradingRecord: TradingRecord) {
    super('FirstBarRule');
    this._tradingRecord = tradingRecord;
  }

  isSatisfied(index: number): boolean {
    if (!this._tradingRecord.isOpened()) {
      return false;
    }

    // Check if there's a current position (completed position)
    const currentPosition = this._tradingRecord.currentPosition;
    if (currentPosition) {
      const entryIndex = currentPosition.getEntryIndex();
      return index === entryIndex + 1;
    }

    // Check if there's a current trade (open position)
    const currentTrade = this._tradingRecord.currentTrade;
    if (currentTrade) {
      const entryIndex = currentTrade.getIndex();
      return index === entryIndex + 1;
    }

    return false;
  }
}

/**
 * Правило "не первая бар после входа"
 */
export class NotFirstBarRule extends AbstractRule {
  private readonly _tradingRecord: TradingRecord;

  constructor(tradingRecord: TradingRecord) {
    super('NotFirstBarRule');
    this._tradingRecord = tradingRecord;
  }

  isSatisfied(index: number): boolean {
    if (!this._tradingRecord.isOpened()) {
      return true;
    }

    // Check if there's a current position (completed position)
    const currentPosition = this._tradingRecord.currentPosition;
    if (currentPosition) {
      const entryIndex = currentPosition.getEntryIndex();
      return index !== entryIndex + 1;
    }

    // Check if there's a current trade (open position)
    const currentTrade = this._tradingRecord.currentTrade;
    if (currentTrade) {
      const entryIndex = currentTrade.getIndex();
      return index !== entryIndex + 1;
    }

    return true;
  }
}
