import { Decimal } from '@ttech-pub/invest-core';

const NAN_BRAND = Symbol.for('engine-node.indicator.NaN');

class NaNDecimal extends Decimal {
  readonly [NAN_BRAND] = true;
  constructor() {
    super('0');
  }
  toString(): string {
    return 'NaN';
  }
}

/** Sentinel value returned by indicators when not enough data is available. */
export const NaNValue: Decimal = new NaNDecimal();

// Returns true when `value` is the NaN sentinel. Plain boolean — callers that need
// a narrowed type should cast explicitly after this check.
export function isNaNValue(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[NAN_BRAND] === true
  );
}
