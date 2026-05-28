/**
 * PositionSizer — стратегия определения размера позиции на момент входа.
 */
import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Indicator } from '../indicators/indicator';
import { isNaNValue } from '../indicators/nan';
import { TradingRecord } from '../trading/trading-record';

export interface PositionSizingContext {
  /** Серия, на которой работает стратегия. */
  series: BarSeries;
  /** Индекс бара входа. */
  index: number;
  /** Цена предполагаемого входа (close бара). */
  price: Decimal;
  /** Текущая запись (cumulative P&L доступен через record.getNetProfit()). */
  record: TradingRecord;
  /** Начальный капитал бэктеста (для %-сайзеров). */
  initialEquity: Decimal;
}

export interface PositionSizer {
  size(context: PositionSizingContext): Decimal;
  getName(): string;
}

/** Фиксированное количество единиц — поведение P0–P3. */
export class FixedQuantitySizer implements PositionSizer {
  constructor(private readonly _amount: Decimal) {
    if (_amount.isNegative() || _amount.isZero()) {
      throw new Error('amount must be positive');
    }
  }

  size(_ctx: PositionSizingContext): Decimal {
    return this._amount;
  }

  getName(): string {
    return `FixedQuantitySizer(${this._amount.toString()})`;
  }
}

/**
 * Процент текущего капитала: `quantity = floor(equity * percent / price)`.
 *
 * `percent` — доля капитала на сделку, ∈ (0, 1]. equity = initialEquity + netProfit.
 * Округление вниз нужно, потому что для целочисленных инструментов (акции/фьючи)
 * половина лота не существует; для крипты можно использовать `floorDigits > 0`.
 */
export class PercentEquitySizer implements PositionSizer {
  constructor(
    private readonly _percent: Decimal,
    private readonly _floorDigits = 0
  ) {
    if (_percent.isNegative() || _percent.isZero()) {
      throw new Error('percent must be positive');
    }
    if (_percent.isGreaterThan(new Decimal('1'))) {
      throw new Error('percent must be <= 1');
    }
  }

  size(ctx: PositionSizingContext): Decimal {
    const equity = ctx.initialEquity.add(ctx.record.getNetProfit());
    if (equity.isNegative() || equity.isZero() || ctx.price.isZero()) {
      return new Decimal('0');
    }
    const raw = equity.multiply(this._percent).divide(ctx.price);
    return floor(raw, this._floorDigits);
  }

  getName(): string {
    return `PercentEquitySizer(${this._percent.toString()})`;
  }
}

/**
 * Van Tharp ATR sizing: размер позиции пропорционален допустимому риску,
 * нормированному на «1R» = `atr * atrMultiplier`.
 *
 * `quantity = floor((equity * riskFraction) / (atr * multiplier))`.
 *
 * Если ATR ещё не готов или равен нулю — возвращает 0 (входа не будет).
 */
export class ATRBasedSizer implements PositionSizer {
  constructor(
    private readonly _riskFraction: Decimal,
    private readonly _atr: Indicator<Decimal>,
    private readonly _atrMultiplier: Decimal = new Decimal('1'),
    private readonly _floorDigits = 0
  ) {
    if (_riskFraction.isNegative() || _riskFraction.isZero()) {
      throw new Error('riskFraction must be positive');
    }
  }

  size(ctx: PositionSizingContext): Decimal {
    if (!this._atr.isReady(ctx.index)) return new Decimal('0');
    const atr = this._atr.getValue(ctx.index);
    if (isNaNValue(atr) || atr.isZero()) return new Decimal('0');

    const equity = ctx.initialEquity.add(ctx.record.getNetProfit());
    if (equity.isNegative() || equity.isZero()) return new Decimal('0');

    const riskCapital = equity.multiply(this._riskFraction);
    const onePerUnit = atr.multiply(this._atrMultiplier);
    if (onePerUnit.isZero()) return new Decimal('0');

    const raw = riskCapital.divide(onePerUnit);
    return floor(raw, this._floorDigits);
  }

  getName(): string {
    return `ATRBasedSizer(${this._riskFraction.toString()})`;
  }
}

/** Округление Decimal вниз до `digits` знаков после запятой. */
function floor(value: Decimal, digits: number): Decimal {
  if (digits < 0) throw new Error('digits must be >= 0');
  const factor = new Decimal(Math.pow(10, digits).toString());
  const scaled = value.multiply(factor);
  // Decimal не имеет floor(); используем parseInt от строки до точки.
  const str = scaled.toString();
  const dot = str.indexOf('.');
  const intPart = dot === -1 ? str : str.slice(0, dot);
  // Отрицательные значения округляем «к нулю», т.к. отрицательная позиция
  // здесь не имеет смысла (sizer возвращает только положительные размеры).
  if (intPart === '-0' || intPart === '') return new Decimal('0');
  return new Decimal(intPart).divide(factor);
}
