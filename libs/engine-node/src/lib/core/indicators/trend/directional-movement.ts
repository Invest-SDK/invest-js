import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue, isNaNValue } from '../nan';
import { MMAIndicator } from '../helpers';
import { TrueRangeIndicator } from '../volatility/true-range-indicator';

/**
 * Welles Wilder Directional Movement (+DM / -DM) per bar.
 *
 * +DM = move = high - prevHigh, если move > prevLow - low и move > 0; иначе 0.
 * -DM = move' = prevLow - low, если move' > high - prevHigh и move' > 0; иначе 0.
 * На beginIndex обе компоненты = 0 (нет предыдущего бара).
 */
class PlusDMIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, '+DM');
  }

  protected calculate(index: number): Decimal {
    if (index === this.getSeries().beginIndex) {
      return new Decimal('0');
    }
    const high = this.getHighPrice(index);
    const low = this.getLowPrice(index);
    const prevHigh = this.getHighPrice(index - 1);
    const prevLow = this.getLowPrice(index - 1);
    const up = high.subtract(prevHigh);
    const down = prevLow.subtract(low);
    if (up.isGreaterThan(down) && up.isPositive()) {
      return up;
    }
    return new Decimal('0');
  }
}

class MinusDMIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, '-DM');
  }

  protected calculate(index: number): Decimal {
    if (index === this.getSeries().beginIndex) {
      return new Decimal('0');
    }
    const high = this.getHighPrice(index);
    const low = this.getLowPrice(index);
    const prevHigh = this.getHighPrice(index - 1);
    const prevLow = this.getLowPrice(index - 1);
    const up = high.subtract(prevHigh);
    const down = prevLow.subtract(low);
    if (down.isGreaterThan(up) && down.isPositive()) {
      return down;
    }
    return new Decimal('0');
  }
}

/**
 * PlusDIIndicator — +DI: 100 * MMA(+DM) / MMA(TR).
 */
export class PlusDIIndicator extends AbstractIndicator<Decimal> {
  private readonly _mmaPlusDM: MMAIndicator;
  private readonly _mmaTR: MMAIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `+DI(${barCount})`);
    this._mmaPlusDM = new MMAIndicator(new PlusDMIndicator(series), barCount);
    this._mmaTR = new MMAIndicator(new TrueRangeIndicator(series), barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._mmaPlusDM.isReady(index) || !this._mmaTR.isReady(index)) return NaNValue;
    const tr = this._mmaTR.getValue(index);
    if (tr.isZero()) return new Decimal('0');
    return this._mmaPlusDM.getValue(index).divide(tr).multiply(new Decimal('100'));
  }
}

/**
 * MinusDIIndicator — -DI: 100 * MMA(-DM) / MMA(TR).
 */
export class MinusDIIndicator extends AbstractIndicator<Decimal> {
  private readonly _mmaMinusDM: MMAIndicator;
  private readonly _mmaTR: MMAIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `-DI(${barCount})`);
    this._mmaMinusDM = new MMAIndicator(new MinusDMIndicator(series), barCount);
    this._mmaTR = new MMAIndicator(new TrueRangeIndicator(series), barCount);
  }

  protected calculate(index: number): Decimal {
    if (!this._mmaMinusDM.isReady(index) || !this._mmaTR.isReady(index)) return NaNValue;
    const tr = this._mmaTR.getValue(index);
    if (tr.isZero()) return new Decimal('0');
    return this._mmaMinusDM.getValue(index).divide(tr).multiply(new Decimal('100'));
  }
}

/**
 * ADXIndicator — Average Directional Index.
 *
 * DX = 100 * |+DI - -DI| / (+DI + -DI).
 * ADX = Wilder's MMA seeded from `barCount` ready DX values; warm-up NaNs are
 * never included in the seed.
 */
export class ADXIndicator extends AbstractIndicator<Decimal> {
  private readonly _mmaDX: MMAIndicator;

  constructor(series: BarSeries, barCount: number) {
    super(series, `ADX(${barCount})`);
    const plusDI = new PlusDIIndicator(series, barCount);
    const minusDI = new MinusDIIndicator(series, barCount);
    const dx = new DXIndicator(plusDI, minusDI);
    this._mmaDX = new MMAIndicator(dx, barCount, barCount - 1);
  }

  protected calculate(index: number): Decimal {
    if (!this._mmaDX.isReady(index)) return NaNValue;
    const v = this._mmaDX.getValue(index);
    return isNaNValue(v) ? NaNValue : v;
  }
}

class DXIndicator extends AbstractIndicator<Decimal> {
  constructor(
    private readonly _plus: PlusDIIndicator,
    private readonly _minus: MinusDIIndicator
  ) {
    super(_plus.getSeries(), 'DX');
  }

  protected calculate(index: number): Decimal {
    if (!this._plus.isReady(index) || !this._minus.isReady(index)) {
      return NaNValue;
    }
    const p = this._plus.getValue(index);
    const m = this._minus.getValue(index);
    if (isNaNValue(p) || isNaNValue(m)) return NaNValue;
    const sum = p.add(m);
    if (sum.isZero()) return new Decimal('0');
    return p.subtract(m).abs().divide(sum).multiply(new Decimal('100'));
  }
}
