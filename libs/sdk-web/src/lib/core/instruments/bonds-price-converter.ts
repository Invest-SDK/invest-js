import { Decimal } from '@ttech-pub/invest-core';
import type { BondResponse, MoneyValue } from '@ttech-pub/grpc-web-client';

export class BondsPriceConverter {
  /**
   * Converts a bond currency price to price points.
   *
   * Formula: `price * 100 / nominal`.
   * See https://developer.tbank.ru/invest/intro/useful-info/points for the
   * definition of bond price points.
   *
   * Overloads:
   * - `(Decimal, MoneyValue)` uses a manual nominal.
   * - `(Decimal, BondResponse)` reads the nominal from `response.instrument`.
   *
   * @param {Decimal} price The currency price.
   * @param {MoneyValue|BondResponse} nominalOrResponse A manual nominal or a
   *   response containing the bond metadata.
   * @returns A `Decimal` result. No implicit rounding or truncation is applied;
   *   precision follows the existing `Decimal` context.
   * @throws {TypeError} If response metadata or the manual nominal is missing.
   * @throws {Error} If the nominal is malformed and cannot become a `Decimal`.
   * @throws {DivisionByZeroDecimalError} If the nominal is zero.
   *
   * Missing or malformed inputs are rejected; arithmetic remains in `Decimal`
   * throughout, so this method does not round through JavaScript numbers.
   */
  public static currencyToPoints(price: Decimal, nominal: MoneyValue): Decimal;
  public static currencyToPoints(price: Decimal, response: BondResponse): Decimal;
  public static currencyToPoints(
    price: Decimal,
    nominalOrResponse: MoneyValue | BondResponse
  ): Decimal {
    return price.multiply(new Decimal('100')).divide(this.resolveNominal(nominalOrResponse));
  }

  /**
   * Converts bond price points to a currency price.
   *
   * Formula: `price / 100 * nominal`.
   * See https://developer.tbank.ru/invest/intro/useful-info/points for the
   * definition of bond price points.
   *
   * Overloads:
   * - `(Decimal, MoneyValue)` uses a manual nominal.
   * - `(Decimal, BondResponse)` reads the nominal from `response.instrument`.
   *
   * @param {Decimal} price The price in points.
   * @param {MoneyValue|BondResponse} nominalOrResponse A manual nominal or a
   *   response containing the bond metadata.
   * @returns A `Decimal` result. No implicit rounding or truncation is applied;
   *   precision follows the existing `Decimal` context.
   * @throws {TypeError} If response metadata or the manual nominal is missing.
   * @throws {Error} If the nominal is malformed and cannot become a `Decimal`.
   *
   * Missing or malformed inputs are rejected; arithmetic remains in `Decimal`
   * throughout, so this method does not round through JavaScript numbers.
   */
  public static pointsToCurrency(price: Decimal, nominal: MoneyValue): Decimal;
  public static pointsToCurrency(price: Decimal, response: BondResponse): Decimal;
  public static pointsToCurrency(
    price: Decimal,
    nominalOrResponse: MoneyValue | BondResponse
  ): Decimal {
    return price.divide(new Decimal('100')).multiply(this.resolveNominal(nominalOrResponse));
  }

  private static resolveNominal(nominalOrResponse: MoneyValue | BondResponse): Decimal {
    if (!nominalOrResponse) {
      throw new TypeError('Bond nominal or response is required');
    }

    const value = nominalOrResponse as MoneyValue & Partial<BondResponse>;
    const isResponse = 'instrument' in value || Object.keys(value).length === 0;

    if (isResponse) {
      const instrument = (value as BondResponse).instrument;

      if (!instrument) {
        throw new TypeError('Bond response instrument is required');
      }
      if (!instrument.nominal) {
        throw new TypeError('Bond nominal is required');
      }

      return new Decimal({
        units: instrument.nominal.units,
        nano: instrument.nominal.nano,
      });
    }

    const nominal = value as MoneyValue;
    return new Decimal({ units: nominal.units, nano: nominal.nano });
  }
}
