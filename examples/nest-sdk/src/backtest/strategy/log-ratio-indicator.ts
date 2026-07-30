/**
 * LogRatioIndicator — возвращает lnRatio из close-цены синтетической свечи,
 * учитывая постоянный offset, применённый в build-spread-series.
 *
 * Все остальные индикаторы (SMA, StdDev, z-score) могут работать прямо на
 * close-индикаторе, потому что offset = const и сокращается во всех
 * производных. Отдельный класс существует только для семантики (чтобы в логе
 * было «lnRatio», а не «ClosePrice»).
 */

import { Decimal } from '@ttech-pub/invest-core';
import { AbstractIndicator, BarSeries } from '@t-tech/engine-node';
import { SPREAD_OFFSET } from './build-spread-series';

export class LogRatioIndicator extends AbstractIndicator<Decimal> {
  constructor(series: BarSeries) {
    super(series, 'lnRatio');
  }

  protected calculate(index: number): Decimal {
    const bar = this.getBar(index);
    if (!bar) return new Decimal('0');
    return bar.close.subtract(SPREAD_OFFSET);
  }
}
