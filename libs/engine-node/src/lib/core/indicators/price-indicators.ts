/**
 * ClosePriceIndicator - Индикатор цены закрытия
 *
 * Простейший индикатор, возвращающий цену закрытия каждого бара.
 * Используется как базовый строительный блок для других индикаторов.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar';
import { AbstractIndicator } from './indicator';

/**
 * Класс ClosePriceIndicator возвращает цену закрытия бара
 *
 * Этот индикатор является основой для большинства других индикаторов,
 * которые строятся на основе цен закрытия.
 *
 * @example
 * ```typescript
 * const series = new BarSeries('AAPL');
 * const closeIndicator = new ClosePriceIndicator(series);
 *
 * // Получить цену закрытия последнего бара
 * const lastClose = closeIndicator.getValue(series.endIndex);
 * console.log(lastClose.toString());
 * ```
 */
export class ClosePriceIndicator extends AbstractIndicator<Decimal> {
  /**
   * Создаёт ClosePriceIndicator
   * @param series Серия баров
   */
  constructor(series: BarSeries) {
    super(series, 'ClosePrice');
  }

  /**
   * @inheritDoc
   */
  protected calculate(index: number): Decimal {
    return this.getClosePrice(index);
  }
}

/**
 * OpenPriceIndicator - Индикатор цены открытия
 */
export class OpenPriceIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'OpenPrice');
  }

  protected calculate(index: number): Decimal {
    return this.getOpenPrice(index);
  }
}

/**
 * HighPriceIndicator - Индикатор максимальной цены
 */
export class HighPriceIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'HighPrice');
  }

  protected calculate(index: number): Decimal {
    return this.getHighPrice(index);
  }
}

/**
 * LowPriceIndicator - Индикатор минимальной цены
 */
export class LowPriceIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'LowPrice');
  }

  protected calculate(index: number): Decimal {
    return this.getLowPrice(index);
  }
}

/**
 * TypicalPriceIndicator - Индикатор типичной цены
 *
 * Типичная цена = (High + Low + Close) / 3
 */
export class TypicalPriceIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'TypicalPrice');
  }

  protected calculate(index: number): Decimal {
    return this.getTypicalPrice(index);
  }
}

/**
 * MedianPriceIndicator - Индикатор медианной цены
 *
 * Медианная цена = (High + Low) / 2
 */
export class MedianPriceIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'MedianPrice');
  }

  protected calculate(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) {
      throw new Error(`Bar not found at index ${index}`);
    }
    return bar.medianPrice;
  }
}

/**
 * VolumeIndicator - Индикатор объёма
 */
export class VolumeIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'Volume');
  }

  protected calculate(index: number): Decimal {
    return this.getVolume(index);
  }
}

/**
 * PriceIndicator - Универсальный индикатор цены
 *
 * Позволяет выбрать тип цены: open, high, low, close, typical, median
 */
export class PriceIndicator extends AbstractIndicator<Decimal> {
  private readonly _priceType: 'open' | 'high' | 'low' | 'close' | 'typical' | 'median';

  constructor(
    series: BarSeries,
    priceType: 'open' | 'high' | 'low' | 'close' | 'typical' | 'median' = 'close'
  ) {
    super(series, `PriceIndicator(${priceType})`);
    this._priceType = priceType;
  }

  protected calculate(index: number): Decimal {
    return this.getPriceByType(index, this._priceType);
  }

  getPriceType(): string {
    return this._priceType;
  }
}
