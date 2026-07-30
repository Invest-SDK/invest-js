/**
 * Bar - OHLCV (Open, High, Low, Close, Volume) свеча
 *
 * Базовый строительный блок для технического анализа.
 * Представляет собой одну торговую свечу с временным периодом.
 */
import { Decimal, ValidationError } from '@t-tech/invest-shared';

/**
 * Интерфейс входных данных для создания Bar
 */
export interface BarInput {
  time: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  amount?: Decimal;
}

/**
 * Класс Bar представляет одну торговую свечу (OHLCV данные)
 *
 * Каждый Bar содержит информацию о торговой активности за определённый период:
 * - open: цена открытия
 * - high: максимальная цена
 * - low: минимальная цена
 * - close: цена закрытия
 * - volume: объём торгов
 * - amount: сумма сделок (опционально)
 */
export class Bar {
  private readonly _time: Date;
  private readonly _open: Decimal;
  private readonly _high: Decimal;
  private readonly _low: Decimal;
  private readonly _close: Decimal;
  private readonly _volume: Decimal;
  private readonly _amount: Decimal;

  /**
   * Создаёт новый экземпляр Bar
   * @param data Данные свечи
   */
  constructor(data: BarInput);
  /**
   * Создаёт Bar из отдельных параметров
   */

  constructor(input: BarInput) {
    this._time = input.time instanceof Date ? input.time : new Date(input.time);
    this._open = input.open;
    this._high = input.high;
    this._low = input.low;
    this._close = input.close;
    this._volume = input.volume;
    this._amount = input.amount !== undefined ? input.amount : new Decimal('0');

    // Validation of input data - first check for negative values
    if (this._open.isNegative()) {
      throw new ValidationError('Open price cannot be negative');
    }

    if (this._high.isNegative()) {
      throw new ValidationError('High price cannot be negative');
    }

    if (this._low.isNegative()) {
      throw new ValidationError('Low price cannot be negative');
    }

    if (this._close.isNegative()) {
      throw new ValidationError('Close price cannot be negative');
    }

    if (this._volume.isNegative()) {
      throw new ValidationError('Volume cannot be negative');
    }

    if (this._amount.isNegative()) {
      throw new ValidationError('Amount cannot be negative');
    }

    // Then check relationships between prices
    if (this._high.isLessThan(this._low)) {
      throw new ValidationError('High price must be greater than or equal to low price');
    }

    if (this._high.isLessThan(Decimal.max(this._open, this._close))) {
      throw new ValidationError(
        'High price must be greater than or equal to open and close prices'
      );
    }

    if (this._low.isGreaterThan(Decimal.min(this._open, this._close))) {
      throw new ValidationError('Low price must be less than or equal to open and close prices');
    }
  }

  /**
   * Время начала периода свечи
   */
  get time(): Date {
    return this._time;
  }

  /**
   * Цена открытия
   */
  get open(): Decimal {
    return this._open;
  }

  /**
   * Максимальная цена за период
   */
  get high(): Decimal {
    return this._high;
  }

  /**
   * Минимальная цена за период
   */
  get low(): Decimal {
    return this._low;
  }

  /**
   * Цена закрытия
   */
  get close(): Decimal {
    return this._close;
  }

  /**
   * Объём торгов
   */
  get volume(): Decimal {
    return this._volume;
  }

  /**
   * Сумма сделок (опционально)
   */
  get amount(): Decimal {
    return this._amount;
  }

  /**
   * Возвращает типичную цену (Typical Price) = (High + Low + Close) / 3
   */
  get typicalPrice(): Decimal {
    return this._high.add(this._low).add(this._close).divide(new Decimal('3'));
  }

  /**
   * Возвращает медианную цену (Median Price) = (High + Low) / 2
   */
  get medianPrice(): Decimal {
    return this._high.add(this._low).divide(new Decimal('2'));
  }

  /**
   * Возвращает ценовой диапазон (High - Low)
   */
  get priceRange(): Decimal {
    return this._high.subtract(this._low);
  }

  /**
   * Возвращает изменение цены (Close - Open)
   */
  get priceChange(): Decimal {
    return this._close.subtract(this._open);
  }

  /**
   * Возвращает изменение цены в процентах
   */
  get priceChangePercent(): Decimal {
    if (this._open.isZero()) {
      return new Decimal('0');
    }
    return this._close.subtract(this._open).divide(this._open).multiply(new Decimal('100'));
  }

  /**
   * Проверяет, является ли свеча бычьей (цена выросла)
   */
  isBullish(): boolean {
    return this._close.isGreaterThan(this._open);
  }

  /**
   * Проверяет, является ли свеча медвежьей (цена упала)
   */
  isBearish(): boolean {
    return this._close.isLessThan(this._open);
  }

  /**
   * Проверяет, является ли свеча доджи (маленькое тело)
   */
  isDoji(): boolean {
    const bodySize = this._close.subtract(this._open).abs();
    const range = this._high.subtract(this._low);
    // Доджи если тело меньше 10% от диапазона
    return bodySize.divide(range).isLessThan(new Decimal('0.1'));
  }

  /**
   * Проверяет, является ли свеча молотом (маленькое тело, длинная нижняя тень)
   */
  isHammer(): boolean {
    const bodySize = this._close.subtract(this._open).abs();
    const upperWick = this._high.subtract(Decimal.max(this._open, this._close));
    const lowerWick = Decimal.min(this._open, this._close).subtract(this._low);
    const range = this._high.subtract(this._low);

    const hasSmallBody = bodySize.divide(range).isLessThan(new Decimal('0.3'));
    const hasLongLowerWick = lowerWick.divide(bodySize).isGreaterThan(new Decimal('2'));
    const hasSmallUpperWick = upperWick.divide(bodySize).isLessThan(new Decimal('1'));

    return this.isBullish() && hasSmallBody && hasLongLowerWick && hasSmallUpperWick;
  }

  /**
   * Преобразует Bar в простой объект
   */
  toJSON(): Record<string, string | number> {
    return {
      time: this._time.toISOString(),
      open: this._open.toString(),
      high: this._high.toString(),
      low: this._low.toString(),
      close: this._close.toString(),
      volume: this._volume.toString(),
      amount: this._amount.toString(),
    };
  }

  /**
   * Создаёт Bar из JSON объекта
   */
  static fromJSON(json: Record<string, string | number>): Bar {
    return new Bar({
      time: new Date(json.time as string),
      open: new Decimal(json.open.toString()),
      high: new Decimal(json.high.toString()),
      low: new Decimal(json.low.toString()),
      close: new Decimal(json.close.toString()),
      volume: new Decimal(json.volume.toString()),
      amount: new Decimal(json.amount.toString()),
    });
  }

  /**
   * Проверяет, что Bar заполнен данными (не пустой)
   */
  isFilled(): boolean {
    return (
      !this._open.isZero() || !this._high.isZero() || !this._low.isZero() || !this._close.isZero()
    );
  }
}
