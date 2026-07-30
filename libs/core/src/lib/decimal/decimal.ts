import Big from 'big.js';
import {
  CannotConvertToPrimitivesDecimalError,
  DivisionByZeroDecimalError,
  InputParamsNotValidDecimalError,
  UnknownDecimalError,
} from './decimal.errors';

export type DecimalPrimitives = {
  units: number;
  nano: number;
};

export type DecimalInput = DecimalPrimitives | string;

export class Decimal {
  private readonly _value: Big;

  /**
   * Creates an instance of Decimal.
   *
   * @param {DecimalInput} input - The input value to create a Decimal instance.
   *        It can be either a string representation of a number or an object
   *        with `units` and `nano` string properties.
   *
   * @throws {InputParamsNotValidDecimalError} If the input is empty or invalid.
   * @throws {UnknownDecimalError} If an error occurs during the conversion process.
   */
  constructor(input: DecimalInput) {
    if (
      (typeof input === 'string' && input.trim() !== '') ||
      (typeof input === 'object' &&
        input !== null &&
        typeof input.units === 'number' &&
        typeof input.nano === 'number')
    ) {
      this._value = Decimal.toBig(input);
      return;
    }
    throw new InputParamsNotValidDecimalError('Input params is empty');
  }

  private static toBig(input: DecimalInput): Big {
    try {
      if (typeof input === 'string') {
        return new Big(input);
      }
      return new Big(input.units).plus(new Big(`${input.nano}e-9`));
    } catch (error) {
      throw new UnknownDecimalError('Error while creating number', error);
    }
  }

  /**
   * Adds a Decimal value to this Decimal instance.
   *
   * @param {Decimal} inputValue - The Decimal value to add.
   * @returns {Decimal} A new Decimal instance representing the sum.
   * @throws {InputParamsNotValidDecimalError} If the input is not a valid Decimal instance.
   * @throws {UnknownDecimalError} If an error occurs during the addition operation.
   */
  public add(inputValue: Decimal): Decimal {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    try {
      const mappedInputValue = Decimal.toBig(inputValue.toString());

      const newValue: Big = this._value.add(mappedInputValue);

      return new Decimal(newValue.toString());
    } catch (error) {
      throw new UnknownDecimalError('Error while adding number', error);
    }
  }

  /**
   * Multiplies this Decimal instance by the given Decimal value.
   *
   * @param {Decimal} inputValue - The Decimal value to multiply with.
   * @returns {Decimal} A new Decimal instance representing the product.
   * @throws {InputParamsNotValidDecimalError} If the input is not a valid Decimal instance.
   * @throws {UnknownDecimalError} If an error occurs during the multiplication operation.
   */
  public multiply(inputValue: Decimal): Decimal {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    try {
      const mappedInputValue = Decimal.toBig(inputValue.toString());

      const newValue: Big = this._value.mul(mappedInputValue);

      return new Decimal(newValue.toString());
    } catch (error) {
      throw new UnknownDecimalError('Error while multiplying number', error);
    }
  }

  /**
   * Divides this Decimal instance by the given Decimal value.
   *
   * @param {Decimal} inputValue - The Decimal divisor.
   * @returns {Decimal} A new Decimal instance representing the quotient.
   * @throws {InputParamsNotValidDecimalError} If the input is not a valid Decimal instance.
   * @throws {DivisionByZeroDecimalError} If the divisor is zero.
   * @throws {UnknownDecimalError} If an error occurs during the division operation.
   */
  public divide(inputValue: Decimal): Decimal {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    if (inputValue.toString() === '0') {
      throw new DivisionByZeroDecimalError('Division by zero');
    }

    try {
      const mappedInputValue = Decimal.toBig(inputValue.toString());

      const newValue: Big = this._value.div(mappedInputValue);

      return new Decimal(newValue.toString());
    } catch (error) {
      throw new UnknownDecimalError('Error while dividing number', error);
    }
  }

  /**
   * Subtracts the given Decimal value from this Decimal instance.
   *
   * @param {Decimal} inputValue - The Decimal value to subtract.
   * @returns {Decimal} A new Decimal instance representing the difference.
   * @throws {InputParamsNotValidDecimalError} If the input is not a valid Decimal instance.
   * @throws {UnknownDecimalError} If an error occurs during the subtraction operation.
   */
  public subtract(inputValue: Decimal): Decimal {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    try {
      const mappedInputValue = Decimal.toBig(inputValue.toString());

      const newValue: Big = this._value.sub(mappedInputValue);

      return new Decimal(newValue.toString());
    } catch (error) {
      throw new UnknownDecimalError('Error while subtracting number', error);
    }
  }

  /**
   * Checks if the Decimal value is zero.
   *
   * @returns {boolean} True if the value is zero, false otherwise.
   */
  public isZero(): boolean {
    return this._value.eq(0);
  }

  /**
   * Checks if the Decimal value is greater than the given value.
   *
   * @param {Decimal} inputValue - The Decimal value to compare with.
   * @returns {boolean} True if the value is greater than the given value, false otherwise.
   */
  public isGreaterThan(inputValue: Decimal): boolean {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    const mappedInputValue = Decimal.toBig(inputValue.toString());
    return this._value.gt(mappedInputValue);
  }

  /**
   * Checks if the Decimal value is less than the given value.
   *
   * @param {Decimal} inputValue - The Decimal value to compare with.
   * @returns {boolean} True if the value is less than the given value, false otherwise.
   */
  public isLessThan(inputValue: Decimal): boolean {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    const mappedInputValue = Decimal.toBig(inputValue.toString());
    return this._value.lt(mappedInputValue);
  }

  /**
   * Returns the absolute value of this Decimal instance.
   *
   * @returns {Decimal} A new Decimal instance representing the absolute value.
   * @throws {UnknownDecimalError} If an error occurs during the operation.
   */
  public abs(): Decimal {
    try {
      const newValue: Big = this._value.abs();
      return new Decimal(newValue.toString());
    } catch (error) {
      throw new UnknownDecimalError('Error while calculating absolute value', error);
    }
  }

  /**
   * Checks if the Decimal value is equal to the given value.
   *
   * @param {Decimal} inputValue - The Decimal value to compare with.
   * @returns {boolean} True if the value is equal to the given value, false otherwise.
   * @throws {InputParamsNotValidDecimalError} If the input is not a valid Decimal instance.
   */
  public isEqualTo(inputValue: Decimal): boolean {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    const mappedInputValue = Decimal.toBig(inputValue.toString());
    return this._value.eq(mappedInputValue);
  }

  /**
   * Checks if the Decimal value is greater than or equal to the given value.
   *
   * @param {Decimal} inputValue - The Decimal value to compare with.
   * @returns {boolean} True if the value is greater than or equal to the given value, false otherwise.
   */
  public isGreaterThanOrEqual(inputValue: Decimal): boolean {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    const mappedInputValue = Decimal.toBig(inputValue.toString());
    return this._value.gte(mappedInputValue);
  }

  /**
   * Checks if the Decimal value is less than or equal to the given value.
   *
   * @param {Decimal} inputValue - The Decimal value to compare with.
   * @returns {boolean} True if the value is less than or equal to the given value, false otherwise.
   */
  public isLessThanOrEqual(inputValue: Decimal): boolean {
    if (!(inputValue instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    const mappedInputValue = Decimal.toBig(inputValue.toString());
    return this._value.lte(mappedInputValue);
  }

  /**
   * Checks if the Decimal value is positive.
   *
   * @returns {boolean} True if the value is positive (> 0), false otherwise.
   */
  public isPositive(): boolean {
    return this._value.gt(0);
  }

  /**
   * Checks if the Decimal value is negative.
   *
   * @returns {boolean} True if the value is negative (< 0), false otherwise.
   */
  public isNegative(): boolean {
    return this._value.lt(0);
  }

  /**
   * Returns the smaller of the two given Decimal values.
   *
   * @param {Decimal} a - The first Decimal value.
   * @param {Decimal} b - The second Decimal value.
   * @returns {Decimal} The smaller of the two Decimal values.
   * @throws {InputParamsNotValidDecimalError} If either input is not a valid Decimal instance.
   */
  public static min(a: Decimal, b: Decimal): Decimal {
    if (!(a instanceof Decimal) || !(b instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    return a.isLessThan(b) ? a : b;
  }

  /**
   * Returns the larger of the two given Decimal values.
   *
   * @param {Decimal} a - The first Decimal value.
   * @param {Decimal} b - The second Decimal value.
   * @returns {Decimal} The larger of the two Decimal values.
   * @throws {InputParamsNotValidDecimalError} If either input is not a valid Decimal instance.
   */
  public static max(a: Decimal, b: Decimal): Decimal {
    if (!(a instanceof Decimal) || !(b instanceof Decimal)) {
      throw new InputParamsNotValidDecimalError('Input params is not Decimal');
    }
    return a.isGreaterThan(b) ? a : b;
  }

  /**
   * Converts the Decimal value to its string representation.
   *
   * @returns {string} The string representation of the Decimal value.
   */
  public toString(): string {
    return this._value.toString();
  }

  /**
   * Converts the Decimal instance to its primitive representation.
   *
   * @returns {DecimalPrimitives} An object with `units` and `nano` properties.
   * @throws {CannotConvertToPrimitivesDecimalError} If the value cannot be converted to primitives,
   * for example, if the fractional part does not end with zero.
   */
  public toPrimitives(): DecimalPrimitives {
    // converts to string with rounding up to 10 digits after the decimal point
    // Why round up? Because we need to check if the fractional part ends with zero and it is nano
    const stringRepresentation = this._value.toFixed(10, 3);

    const integerPart = stringRepresentation.split('.')[0];
    const fractionalPart = stringRepresentation.split('.')[1];

    if (fractionalPart[fractionalPart.length - 1] !== '0') {
      throw new CannotConvertToPrimitivesDecimalError('Cannot convert to primitives');
    }

    return {
      units: Number(integerPart),
      nano: Number(fractionalPart.slice(0, -1)),
    };
  }
}
