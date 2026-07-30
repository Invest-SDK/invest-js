/**
 * Trading Rules - Правила управления торговлей
 *
 * Правила стоп-лосса, тейк-профита и других торговых условий.
 */

import { Decimal } from '@t-tech/invest-shared';
import { BarSeries } from '../bar';
import { TradingRecord, PositionType } from '../trading';
import { AbstractRule } from './rule';
import { Indicator } from '../indicators';

/**
 * Правило стоп-лосса
 *
 * Условие выполняется, когда цена падает ниже указанного процента от цены входа
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
    const entryOrder = tradingRecord.currentOrder;
    if (entryOrder && entryOrder.getIndex() === index) {
      return false;
    }

    // Для длинной позиции: стоп срабатывает, когда цена падает
    // Для короткой позиции: стоп срабатывает, когда цена растёт
    const isLong = tradingRecord.positionType === PositionType.LONG;

    if (isLong) {
      const stopPrice = entryPrice.multiply(
        new Decimal('1').subtract(this._lossPercentage.divide(new Decimal('100')))
      );
      return bar.low.isLessThanOrEqual(stopPrice);
    } else {
      const stopPrice = entryPrice.multiply(
        new Decimal('1').add(this._lossPercentage.divide(new Decimal('100')))
      );
      return bar.high.isGreaterThanOrEqual(stopPrice);
    }
  }
}

/**
 * Правило тейк-профита
 *
 * Условие выполняется, когда цена растёт выше указанного процента от цены входа
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
    const entryOrder = tradingRecord.currentOrder;
    if (entryOrder && entryOrder.getIndex() === index) {
      return false;
    }

    const isLong = tradingRecord.positionType === PositionType.LONG;

    if (isLong) {
      const targetPrice = entryPrice.multiply(
        new Decimal('1').add(this._profitPercentage.divide(new Decimal('100')))
      );
      return bar.high.isGreaterThanOrEqual(targetPrice);
    } else {
      const targetPrice = entryPrice.multiply(
        new Decimal('1').subtract(this._profitPercentage.divide(new Decimal('100')))
      );
      return bar.low.isLessThanOrEqual(targetPrice);
    }
  }
}

/**
 * Trailing Stop Rule - Трейлинг-стоп
 *
 * Сдвигает стоп-лосс по мере движения цены в благоприятном направлении
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

    // Don't trigger trailing stop on entry bar
    const entryOrder = tradingRecord.currentOrder;
    if (entryOrder && entryOrder.getIndex() === index) {
      // Initialize tracking on entry
      this._entryIndex = index;
      this._highestPrice = bar.high;
      this._lowestPrice = bar.low;
      this._trailingPrice = null;
      return false;
    }

    const isLong = tradingRecord.positionType === PositionType.LONG;
    const trailAmount = entryPrice.multiply(this._trailPercentage.divide(new Decimal('100')));

    if (isLong) {
      // For long positions: track highest high and trailing stop below it
      if (bar.high.isGreaterThan(this._highestPrice || new Decimal('-Infinity'))) {
        this._highestPrice = bar.high;
        // Update trailing price - maintain distance below highest price
        this._trailingPrice = this._highestPrice.subtract(trailAmount);
      }

      // Check if current low breaches trailing stop
      if (this._trailingPrice && bar.low.isLessThanOrEqual(this._trailingPrice)) {
        return true;
      }
    } else {
      // For short positions: track lowest low and trailing stop above it
      if (bar.low.isLessThan(this._lowestPrice || new Decimal('Infinity'))) {
        this._lowestPrice = bar.low;
        // Update trailing price - maintain distance above lowest price
        this._trailingPrice = this._lowestPrice.add(trailAmount);
      }

      // Check if current high breaches trailing stop
      if (this._trailingPrice && bar.high.isGreaterThanOrEqual(this._trailingPrice)) {
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

    const lastTrade = tradingRecord.getLastTrade();
    if (!lastTrade) {
      return true;
    }

    const exitIndex = lastTrade.getExitIndex() ?? 0;
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

    // Check if there's a current trade (completed trade)
    const currentTrade = this._tradingRecord.currentTrade;
    if (currentTrade) {
      const entryIndex = currentTrade.getEntryIndex();
      return index === entryIndex + 1;
    }

    // Check if there's a current order (open position)
    const currentOrder = this._tradingRecord.currentOrder;
    if (currentOrder) {
      const entryIndex = currentOrder.getIndex();
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

    // Check if there's a current trade (completed trade)
    const currentTrade = this._tradingRecord.currentTrade;
    if (currentTrade) {
      const entryIndex = currentTrade.getEntryIndex();
      return index !== entryIndex + 1;
    }

    // Check if there's a current order (open position)
    const currentOrder = this._tradingRecord.currentOrder;
    if (currentOrder) {
      const entryIndex = currentOrder.getIndex();
      return index !== entryIndex + 1;
    }

    return true;
  }
}
