import { Decimal } from '@ttech-pub/invest-core';
import type { FutureResponse, Quotation } from '@ttech-pub/grpc-node-client';

export class FuturesPriceConverter {
  /**
   * Converts a futures currency price to price points.
   *
   * Formula: `price * minPriceIncrement / minPriceIncrementAmount`.
   * See https://developer.tbank.ru/invest/intro/useful-info/points for the
   * definition of futures price points.
   *
   * Overloads:
   * - `(Decimal, Quotation, Quotation)` uses manual coefficients.
   * - `(Decimal, FutureResponse)` reads both coefficients from
   *   `response.instrument`.
   *
   * @param {Decimal} price The currency price.
   * @param {Quotation|FutureResponse} minPriceIncrementOrResponse A manual
   *   increment or a response containing the instrument metadata.
   * @param {Quotation} minPriceIncrementAmount The manual currency amount of
   *   one minimum price increment.
   * @returns A `Decimal` result. No implicit rounding or truncation is applied.
   * @throws {TypeError} If response metadata or manual coefficients are missing.
   * @throws {Error} If a coefficient is malformed and cannot become a `Decimal`.
   * @throws {DivisionByZeroDecimalError} If the minimum price increment amount
   *   is zero.
   *
   * Missing or malformed inputs are rejected; arithmetic remains in `Decimal`
   * throughout, so this method does not round through JavaScript numbers.
   */
  public static currencyToPoints(
    price: Decimal,
    minPriceIncrement: Quotation,
    minPriceIncrementAmount: Quotation
  ): Decimal;
  public static currencyToPoints(price: Decimal, response: FutureResponse): Decimal;
  public static currencyToPoints(
    price: Decimal,
    minPriceIncrementOrResponse: Quotation | FutureResponse,
    minPriceIncrementAmount?: Quotation
  ): Decimal {
    const { minPriceIncrement, minPriceIncrementAmount: stepCost } = this.resolveCoefficients(
      minPriceIncrementOrResponse,
      minPriceIncrementAmount
    );

    return price.multiply(minPriceIncrement).divide(stepCost);
  }

  /**
   * Converts futures price points to a currency price.
   *
   * Formula: `price * minPriceIncrementAmount / minPriceIncrement`.
   * See https://developer.tbank.ru/invest/intro/useful-info/points for the
   * definition of futures price points.
   *
   * Overloads:
   * - `(Decimal, Quotation, Quotation)` uses manual coefficients.
   * - `(Decimal, FutureResponse)` reads both coefficients from
   *   `response.instrument`.
   *
   * @param {Decimal} price The price in points.
   * @param {Quotation|FutureResponse} minPriceIncrementOrResponse A manual
   *   increment or a response containing the instrument metadata.
   * @param {Quotation} minPriceIncrementAmount The manual currency amount of
   *   one minimum price increment.
   * @returns A `Decimal` result. No implicit rounding or truncation is applied.
   * @throws {TypeError} If response metadata or manual coefficients are missing.
   * @throws {Error} If a coefficient is malformed and cannot become a `Decimal`.
   * @throws {DivisionByZeroDecimalError} If the minimum price increment is zero.
   *
   * Missing or malformed inputs are rejected; arithmetic remains in `Decimal`
   * throughout, so this method does not round through JavaScript numbers.
   */
  public static pointsToCurrency(
    price: Decimal,
    minPriceIncrement: Quotation,
    minPriceIncrementAmount: Quotation
  ): Decimal;
  public static pointsToCurrency(price: Decimal, response: FutureResponse): Decimal;
  public static pointsToCurrency(
    price: Decimal,
    minPriceIncrementOrResponse: Quotation | FutureResponse,
    minPriceIncrementAmount?: Quotation
  ): Decimal {
    const { minPriceIncrement, minPriceIncrementAmount: stepCost } = this.resolveCoefficients(
      minPriceIncrementOrResponse,
      minPriceIncrementAmount
    );

    return price.multiply(stepCost).divide(minPriceIncrement);
  }

  private static resolveCoefficients(
    minPriceIncrementOrResponse: Quotation | FutureResponse,
    minPriceIncrementAmount?: Quotation
  ): { minPriceIncrement: Decimal; minPriceIncrementAmount: Decimal } {
    if (minPriceIncrementAmount === undefined) {
      const response = minPriceIncrementOrResponse as FutureResponse | undefined;
      const instrument = response?.instrument;

      if (!instrument) {
        throw new TypeError('Future response instrument is required');
      }
      if (!instrument.minPriceIncrement) {
        throw new TypeError('Future min price increment is required');
      }
      if (!instrument.minPriceIncrementAmount) {
        throw new TypeError('Future min price increment amount is required');
      }

      return {
        minPriceIncrement: new Decimal({
          units: instrument.minPriceIncrement.units,
          nano: instrument.minPriceIncrement.nano,
        }),
        minPriceIncrementAmount: new Decimal({
          units: instrument.minPriceIncrementAmount.units,
          nano: instrument.minPriceIncrementAmount.nano,
        }),
      };
    }

    if (!minPriceIncrementOrResponse || !minPriceIncrementAmount) {
      throw new TypeError('Future price coefficients are required');
    }

    const quotation = minPriceIncrementOrResponse as Quotation;

    return {
      minPriceIncrement: new Decimal({
        units: quotation.units,
        nano: quotation.nano,
      }),
      minPriceIncrementAmount: new Decimal({
        units: minPriceIncrementAmount.units,
        nano: minPriceIncrementAmount.nano,
      }),
    };
  }
}
