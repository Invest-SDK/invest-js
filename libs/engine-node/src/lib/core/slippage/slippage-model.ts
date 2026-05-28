/**
 * SlippageModel — модель проскальзывания цены исполнения относительно close-бара.
 *
 * Backtest гипотеза «исполнение по close» оптимистична. SlippageModel смещает
 * фактическую цену в худшую сторону для трейдера: вверх при покупке, вниз при
 * продаже. Применяется в {@link BarSeriesManager.run} перед записью ордера.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { Bar } from '../bar/bar';

export type OrderSide = 'buy' | 'sell';

export interface SlippageModel {
  apply(price: Decimal, side: OrderSide, bar?: Bar): Decimal;
  getName(): string;
}

/** ZeroSlippageModel — поведение по умолчанию (price as-is). */
export class ZeroSlippageModel implements SlippageModel {
  apply(price: Decimal, _side: OrderSide, _bar?: Bar): Decimal {
    return price;
  }
  getName(): string {
    return 'ZeroSlippageModel';
  }
}

/**
 * FixedBpsSlippageModel — фиксированный сдвиг в базисных пунктах (1 bps = 0.01%).
 *
 * exec = close * (1 + bps/10000)  для buy
 * exec = close * (1 - bps/10000)  для sell
 */
export class FixedBpsSlippageModel implements SlippageModel {
  private readonly _factor: Decimal;

  constructor(bps: Decimal) {
    if (bps.isNegative()) throw new Error('bps must be >= 0');
    this._factor = bps.divide(new Decimal('10000'));
  }

  apply(price: Decimal, side: OrderSide): Decimal {
    const adj = price.multiply(this._factor);
    return side === 'buy' ? price.add(adj) : price.subtract(adj);
  }

  getName(): string {
    return `FixedBpsSlippageModel(${this._factor.multiply(new Decimal('10000')).toString()})`;
  }
}

/**
 * SpreadFractionSlippageModel — проскальзывание как доля диапазона бара.
 *
 * exec = close + fraction * (high - close)  для buy
 * exec = close - fraction * (close - low)   для sell
 *
 * Это более «честная» модель: при низковолатильном баре slippage маленький,
 * на широком — пропорционально больше. `fraction` ∈ [0, 1].
 */
export class SpreadFractionSlippageModel implements SlippageModel {
  constructor(private readonly _fraction: Decimal) {
    if (_fraction.isNegative()) throw new Error('fraction must be >= 0');
    if (_fraction.isGreaterThan(new Decimal('1'))) throw new Error('fraction must be <= 1');
  }

  apply(price: Decimal, side: OrderSide, bar?: Bar): Decimal {
    if (!bar) return price;
    if (side === 'buy') {
      const headroom = bar.high.subtract(price);
      return headroom.isNegative() ? price : price.add(headroom.multiply(this._fraction));
    }
    const headroom = price.subtract(bar.low);
    return headroom.isNegative() ? price : price.subtract(headroom.multiply(this._fraction));
  }

  getName(): string {
    return `SpreadFractionSlippageModel(${this._fraction.toString()})`;
  }
}
