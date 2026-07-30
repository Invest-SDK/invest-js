import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from '../decimal';

test('Decimal class - constructor with string input', () => {
  const d = new Decimal('123.456');
  assert.strictEqual(d.toString(), '123.456');
});

test('Decimal class - constructor with units and nano', () => {
  const d = new Decimal({ units: 123, nano: 456000000 });
  assert.strictEqual(d.toString(), '123.456');
});

test('Decimal class - add method', () => {
  const d1 = new Decimal('1.5');
  const d2 = new Decimal('2.5');
  const result = d1.add(d2);
  assert.strictEqual(result.toString(), '4');
});

test('Decimal class - multiply method', () => {
  const d = new Decimal('2.5');
  const d2 = new Decimal('3');
  const result = d.multiply(d2);
  assert.strictEqual(result.toString(), '7.5');
});

test('Decimal class - divide method', () => {
  const d = new Decimal('10');
  const d2 = new Decimal('2');
  const result = d.divide(d2);
  assert.strictEqual(result.toString(), '5');
});

test('Decimal class - subtract method', () => {
  const d = new Decimal('5.5');
  const d2 = new Decimal('2.5');
  const result = d.subtract(d2);
  assert.strictEqual(result.toString(), '3');
});

test('Decimal class - chain operations', () => {
  const d = new Decimal('10');
  const d2 = new Decimal('2');
  const result = d.subtract(d2).multiply(d2).divide(d).add(d2);
  assert.strictEqual(result.toString(), '3.6');
});

test('Decimal class - large numbers', () => {
  const d = new Decimal('1000000000000');
  const result = d.multiply(new Decimal('1000000000000'));
  assert.strictEqual(result.toString(), '1e+24');
});

test('Decimal class - precision with nano', () => {
  const d = new Decimal({ units: 0, nano: 123456789 });
  assert.strictEqual(d.toString(), '0.123456789');
});

test('Decimal class - very small numbers', () => {
  const d1 = new Decimal('0.000000001');
  const d2 = new Decimal('0.000000002');
  const result = d1.add(d2);
  assert.strictEqual(result.toString(), '3e-9');
});

test('Decimal class - edge case - zero', () => {
  const d1 = new Decimal('0');
  const d2 = new Decimal('5');
  const result = d1.subtract(d2);
  assert.strictEqual(result.toString(), '-5');
});

test('Decimal class - edge case - negative numbers', () => {
  const d1 = new Decimal('-10');
  const d2 = new Decimal('-5');
  const result = d1.add(d2);
  assert.strictEqual(result.toString(), '-15');
});

test('Decimal class - precision in division', () => {
  const d = new Decimal('10');
  const d2 = new Decimal('3');
  const result = d.divide(d2);
  assert.strictEqual(result.toString(), '3.33333333333333333333');
});

test('Decimal - constructor: empty string input should throw InputParamsNotValidDecimalError', () => {
  assert.throws(
    () => {
      new Decimal('');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is empty',
    }
  );
});

test('Decimal - constructor: undefined input should throw InputParamsNotValidDecimalError', () => {
  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      new Decimal(undefined);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is empty',
    }
  );
});

test('Decimal - constructor: null input should throw InputParamsNotValidDecimalError', () => {
  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      new Decimal(null);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is empty',
    }
  );
});

test('Decimal - constructor: invalid string input should throw UnknownDecimalError', () => {
  assert.throws(
    () => {
      new Decimal('invalid');
    },
    {
      name: 'UnknownDecimalError',
      message: 'Error while creating number',
    }
  );
});

test('Decimal - add: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('1.5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.add('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - add: invalid Decimal instance should throw UnknownDecimalError', () => {
  const d1 = new Decimal('1.5');
  const mockDecimal = {
    toString: () => {
      throw new Error('Mock error');
    },
  };

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.add(mockDecimal);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - multiply: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('2.5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.multiply('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - multiply: invalid Decimal instance should throw UnknownDecimalError', () => {
  const d1 = new Decimal('2.5');
  const mockDecimal = {
    toString: () => {
      throw new Error('Mock error');
    },
  };

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.multiply(mockDecimal);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - divide: division by zero should throw DivisionByZeroDecimalError', () => {
  const d1 = new Decimal('10');
  const d2 = new Decimal('0');

  assert.throws(
    () => {
      d1.divide(d2);
    },
    {
      name: 'DivisionByZeroDecimalError',
      message: 'Division by zero',
    }
  );
});

test('Decimal - divide: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('10');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.divide('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - divide: invalid Decimal instance should throw UnknownDecimalError', () => {
  const d1 = new Decimal('10');
  const mockDecimal = {
    toString: () => {
      throw new Error('Mock error');
    },
  };

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.divide(mockDecimal);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - subtract: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('5.5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.subtract('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - subtract: invalid Decimal instance should throw UnknownDecimalError', () => {
  const d1 = new Decimal('5.5');
  const mockDecimal = {
    toString: () => {
      throw new Error('Mock error');
    },
  };

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.subtract(mockDecimal);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - toPrimitives: valid decimal should return correct units and nano', () => {
  const d = new Decimal('123.456789000');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: 123,
    nano: 456789000,
  });
});

test('Decimal - toPrimitives: decimal with trailing zeros should convert successfully', () => {
  const d = new Decimal('0.123456789');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: 0,
    nano: 123456789,
  });
});

test('Decimal - toPrimitives: zero fractional part should be handled correctly', () => {
  const d = new Decimal('456.000000000');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: 456,
    nano: 0,
  });
});

test('Decimal - toPrimitives: decimal with non-zero ending should throw CannotConvertToPrimitivesDecimalError', () => {
  assert.throws(
    () => {
      const d = new Decimal('0.1234567891');
      d.toPrimitives();
    },
    {
      name: 'CannotConvertToPrimitivesDecimalError',
      message: 'Cannot convert to primitives',
    }
  );
});

test('Decimal - toPrimitives: decimal with trailing non-zero should throw CannotConvertToPrimitivesDecimalError', () => {
  assert.throws(
    () => {
      const d = new Decimal('123.45678900001');
      d.toPrimitives();
    },
    {
      name: 'CannotConvertToPrimitivesDecimalError',
      message: 'Cannot convert to primitives',
    }
  );
});

test('Decimal - toPrimitives: negative decimal should convert correctly', () => {
  const d = new Decimal('-123.456789000');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: -123,
    nano: 456789000,
  });
});

test('Decimal - toPrimitives: very small decimal should convert correctly', () => {
  const d = new Decimal('0.000000001');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: 0,
    nano: 1,
  });
});

test('Decimal - toPrimitives: large decimal should convert correctly', () => {
  const d = new Decimal('1234567890.123456789');
  const primitives = d.toPrimitives();

  assert.deepStrictEqual(primitives, {
    units: 1234567890,
    nano: 123456789,
  });
});

test('Decimal - isZero: zero value should return true', () => {
  const d = new Decimal('0');
  assert.strictEqual(d.isZero(), true);
});

test('Decimal - isZero: non-zero value should return false', () => {
  const d = new Decimal('1.5');
  assert.strictEqual(d.isZero(), false);
});

test('Decimal - isZero: negative zero value should return true', () => {
  const d = new Decimal('-0');
  assert.strictEqual(d.isZero(), true);
});

test('Decimal - isGreaterThan: greater value should return true', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('3');
  assert.strictEqual(d1.isGreaterThan(d2), true);
});

test('Decimal - isGreaterThan: lesser value should return false', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isGreaterThan(d2), false);
});

test('Decimal - isGreaterThan: equal values should return false', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isGreaterThan(d2), false);
});

test('Decimal - isGreaterThan: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.isGreaterThan('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - isLessThan: lesser value should return true', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isLessThan(d2), true);
});

test('Decimal - isLessThan: greater value should return false', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('3');
  assert.strictEqual(d1.isLessThan(d2), false);
});

test('Decimal - isLessThan: equal values should return false', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isLessThan(d2), false);
});

test('Decimal - isLessThan: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('3');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.isLessThan('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - abs: positive value should return same value', () => {
  const d = new Decimal('5.5');
  const result = d.abs();
  assert.strictEqual(result.toString(), '5.5');
});

test('Decimal - abs: negative value should return positive value', () => {
  const d = new Decimal('-5.5');
  const result = d.abs();
  assert.strictEqual(result.toString(), '5.5');
});

test('Decimal - abs: zero value should return zero', () => {
  const d = new Decimal('0');
  const result = d.abs();
  assert.strictEqual(result.toString(), '0');
});

test('Decimal - abs: operation should not modify original value', () => {
  const d = new Decimal('-5.5');
  const originalValue = d.toString();
  d.abs();
  assert.strictEqual(d.toString(), originalValue);
});

test('Decimal - isEqualTo: equal values should return true', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isEqualTo(d2), true);
});

test('Decimal - isEqualTo: different values should return false', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('3');
  assert.strictEqual(d1.isEqualTo(d2), false);
});

test('Decimal - isEqualTo: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.isEqualTo('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - isGreaterThanOrEqual: greater value should return true', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('3');
  assert.strictEqual(d1.isGreaterThanOrEqual(d2), true);
});

test('Decimal - isGreaterThanOrEqual: equal values should return true', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isGreaterThanOrEqual(d2), true);
});

test('Decimal - isGreaterThanOrEqual: lesser value should return false', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isGreaterThanOrEqual(d2), false);
});

test('Decimal - isGreaterThanOrEqual: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.isGreaterThanOrEqual('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - isLessThanOrEqual: lesser value should return true', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isLessThanOrEqual(d2), true);
});

test('Decimal - isLessThanOrEqual: equal values should return true', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  assert.strictEqual(d1.isLessThanOrEqual(d2), true);
});

test('Decimal - isLessThanOrEqual: greater value should return false', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('3');
  assert.strictEqual(d1.isLessThanOrEqual(d2), false);
});

test('Decimal - isLessThanOrEqual: non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('3');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      d1.isLessThanOrEqual('not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - isPositive: positive value should return true', () => {
  const d = new Decimal('5.5');
  assert.strictEqual(d.isPositive(), true);
});

test('Decimal - isPositive: negative value should return false', () => {
  const d = new Decimal('-5.5');
  assert.strictEqual(d.isPositive(), false);
});

test('Decimal - isPositive: zero value should return false', () => {
  const d = new Decimal('0');
  assert.strictEqual(d.isPositive(), false);
});

test('Decimal - isNegative: negative value should return true', () => {
  const d = new Decimal('-5.5');
  assert.strictEqual(d.isNegative(), true);
});

test('Decimal - isNegative: positive value should return false', () => {
  const d = new Decimal('5.5');
  assert.strictEqual(d.isNegative(), false);
});

test('Decimal - isNegative: zero value should return false', () => {
  const d = new Decimal('0');
  assert.strictEqual(d.isNegative(), false);
});

test('Decimal - min: should return the smaller value', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  const result = Decimal.min(d1, d2);
  assert.strictEqual(result.toString(), '3');
});

test('Decimal - min: should return the smaller negative value', () => {
  const d1 = new Decimal('-5');
  const d2 = new Decimal('-3');
  const result = Decimal.min(d1, d2);
  assert.strictEqual(result.toString(), '-5');
});

test('Decimal - min: equal values should return either value', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  const result = Decimal.min(d1, d2);
  assert.strictEqual(result.toString(), '5');
});

test('Decimal - min: first non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d2 = new Decimal('5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      Decimal.min('not-a-decimal', d2);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - min: second non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('3');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      Decimal.min(d1, 'not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - max: should return the larger value', () => {
  const d1 = new Decimal('3');
  const d2 = new Decimal('5');
  const result = Decimal.max(d1, d2);
  assert.strictEqual(result.toString(), '5');
});

test('Decimal - max: should return the larger negative value', () => {
  const d1 = new Decimal('-5');
  const d2 = new Decimal('-3');
  const result = Decimal.max(d1, d2);
  assert.strictEqual(result.toString(), '-3');
});

test('Decimal - max: equal values should return either value', () => {
  const d1 = new Decimal('5');
  const d2 = new Decimal('5');
  const result = Decimal.max(d1, d2);
  assert.strictEqual(result.toString(), '5');
});

test('Decimal - max: first non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d2 = new Decimal('5');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      Decimal.max('not-a-decimal', d2);
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - max: second non-Decimal input should throw InputParamsNotValidDecimalError', () => {
  const d1 = new Decimal('3');

  assert.throws(
    () => {
      // @ts-expect-error Testing invalid input
      Decimal.max(d1, 'not-a-decimal');
    },
    {
      name: 'InputParamsNotValidDecimalError',
      message: 'Input params is not Decimal',
    }
  );
});

test('Decimal - toString: should return correct string representation', () => {
  const d = new Decimal('123.456');
  assert.strictEqual(d.toString(), '123.456');
});

test('Decimal - toString: should return correct string representation for negative values', () => {
  const d = new Decimal('-123.456');
  assert.strictEqual(d.toString(), '-123.456');
});

test('Decimal - toString: should return correct string representation for scientific notation', () => {
  const d = new Decimal('1e+24');
  assert.strictEqual(d.toString(), '1e+24');
});
