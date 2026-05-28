import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { Position } from '../trading/position';
import { TradingRecord } from '../trading/trading-record';
import { AbstractAnalysisCriterion } from './criterion';
import { ReturnCriterion } from './return-criterion';

/**
 * SharpeRatioCriterion — простой Sharpe ratio по серии per-position returns.
 *
 * Формула: (mean(returns) - riskFreeRate) / stddev(returns).
 * Returns берутся как (perPositionReturn - 1), т.е. логарифм НЕ применяется
 * (ta4j-совместимое поведение). Risk-free rate по умолчанию 0.
 */
export class SharpeRatioCriterion extends AbstractAnalysisCriterion {
  private readonly _riskFreeRate: Decimal;
  private readonly _returnCriterion: ReturnCriterion;

  constructor(riskFreeRate: Decimal = new Decimal('0')) {
    super(`SharpeRatio(${riskFreeRate.toString()})`);
    this._riskFreeRate = riskFreeRate;
    this._returnCriterion = new ReturnCriterion();
  }

  calculatePosition(series: BarSeries, position: Position): Decimal {
    // Sharpe на одной позиции не определён — возвращаем (return - 1).
    return this._returnCriterion.calculatePosition(series, position).subtract(new Decimal('1'));
  }

  calculate(series: BarSeries, record: TradingRecord): Decimal {
    const closed = record.getClosedPositions();
    if (closed.length < 2) {
      return new Decimal('0');
    }

    const returns = closed.map((p) =>
      this._returnCriterion.calculatePosition(series, p).subtract(new Decimal('1'))
    );

    const n = new Decimal(returns.length.toString());
    let sum = new Decimal('0');
    for (const r of returns) sum = sum.add(r);
    const mean = sum.divide(n);

    let varSum = new Decimal('0');
    for (const r of returns) {
      const diff = r.subtract(mean);
      varSum = varSum.add(diff.multiply(diff));
    }
    const variance = varSum.divide(n);
    if (variance.isZero()) {
      return new Decimal('0');
    }
    const stddev = sqrtDecimal(variance);
    return mean.subtract(this._riskFreeRate).divide(stddev);
  }
}

function sqrtDecimal(n: Decimal): Decimal {
  if (n.isZero()) return new Decimal('0');
  const epsilon = new Decimal('0.0000000001');
  let x = new Decimal(Math.sqrt(parseFloat(n.toString())).toString());
  for (let i = 0; i < 30; i++) {
    const next = x.add(n.divide(x)).divide(new Decimal('2'));
    if (next.subtract(x).abs().isLessThan(epsilon)) {
      return next;
    }
    x = next;
  }
  return x;
}
