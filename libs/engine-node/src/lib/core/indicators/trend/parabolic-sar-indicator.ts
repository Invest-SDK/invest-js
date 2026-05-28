import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator } from '../indicator';
import { BarSeries } from '../../bar';
import { NaNValue } from '../nan';

/**
 * ParabolicSARIndicator — Wilder's Parabolic Stop And Reverse.
 *
 * Состояние индикатора зависит от истории, поэтому значение последовательно
 * пересчитывается с beginIndex и кэшируется базовым классом.
 *
 * Параметры по умолчанию: accelerationStart=0.02, accelerationStep=0.02,
 * accelerationMax=0.2.
 */
export class ParabolicSARIndicator extends AbstractIndicator<Decimal> {
  private readonly _accStart: Decimal;
  private readonly _accStep: Decimal;
  private readonly _accMax: Decimal;

  // Состояние: пересчитывается лениво и кэшируется по индексам.
  // Хранится отдельно от значения SAR, потому что Bar нужен лишь
  // в момент вычисления.
  private readonly _state: Map<number, { isUp: boolean; ep: Decimal; af: Decimal }> = new Map();

  constructor(series: BarSeries, accStart = 0.02, accStep = 0.02, accMax = 0.2) {
    super(series, `ParabolicSAR(${accStart},${accStep},${accMax})`);
    this._accStart = new Decimal(accStart.toString());
    this._accStep = new Decimal(accStep.toString());
    this._accMax = new Decimal(accMax.toString());
  }

  protected calculate(index: number): Decimal {
    const series = this.getSeries();
    if (index === series.beginIndex) {
      // Недостаточно данных для определения направления — отдаём low.
      const bar = this.getBar(index);
      if (!bar) return NaNValue;
      this._state.set(index, { isUp: true, ep: bar.high, af: this._accStart });
      return bar.low;
    }

    const prev = this.getValue(index - 1);
    const prevState = this._state.get(index - 1);
    if (!prevState) return NaNValue;
    const curBar = this.getBar(index);
    const prevBar = this.getBar(index - 1);
    if (!curBar || !prevBar) return NaNValue;

    let { isUp, ep, af } = prevState;
    let sar = prev.add(af.multiply(ep.subtract(prev)));

    if (isUp) {
      // Ограничение SAR двумя минимумами предыдущих баров.
      const prev2Bar = this.getBar(index - 2);
      const cap = prev2Bar ? Decimal.min(prevBar.low, prev2Bar.low) : prevBar.low;
      if (sar.isGreaterThan(cap)) sar = cap;

      if (curBar.low.isLessThan(sar)) {
        // Разворот вниз.
        isUp = false;
        sar = ep;
        ep = curBar.low;
        af = this._accStart;
      } else if (curBar.high.isGreaterThan(ep)) {
        ep = curBar.high;
        af = Decimal.min(af.add(this._accStep), this._accMax);
      }
    } else {
      const prev2Bar = this.getBar(index - 2);
      const cap = prev2Bar ? Decimal.max(prevBar.high, prev2Bar.high) : prevBar.high;
      if (sar.isLessThan(cap)) sar = cap;

      if (curBar.high.isGreaterThan(sar)) {
        isUp = true;
        sar = ep;
        ep = curBar.high;
        af = this._accStart;
      } else if (curBar.low.isLessThan(ep)) {
        ep = curBar.low;
        af = Decimal.min(af.add(this._accStep), this._accMax);
      }
    }

    this._state.set(index, { isUp, ep, af });
    return sar;
  }
}
