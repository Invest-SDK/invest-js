/**
 * BarSeriesManager - бэктест-исполнитель в стиле ta4j
 *
 * Прогоняет Strategy по BarSeries и возвращает TradingRecord.
 */

import { Decimal } from '@ttech-pub/invest-core';
import { BarSeries } from '../bar/bar-series';
import { TradingRecord, PositionType } from '../trading/trading-record';
import { CostModel, ZeroCostModel } from '../cost/cost-model';
import { SlippageModel, ZeroSlippageModel } from '../slippage/slippage-model';
import { FixedQuantitySizer, PositionSizer } from '../sizing/position-sizer';
import { Strategy } from './strategy';

export interface RunOptions {
  /** Тип позиции (default: LONG) */
  positionType?: PositionType;
  /**
   * Размер позиции в единицах (default: 1).
   *
   * @deprecated используйте {@link RunOptions.positionSizer}. Параметр
   *   игнорируется, если задан `positionSizer`. Сохранён для совместимости.
   */
  amount?: Decimal;
  /**
   * Сайзер позиции. Если задан, перекрывает `amount`.
   * Default — `FixedQuantitySizer(amount ?? 1)`.
   */
  positionSizer?: PositionSizer;
  /** Начальный капитал бэктеста (для %-сайзеров). Default = 0. */
  initialEquity?: Decimal;
  /** Начальный индекс итерации; доступная до него история учитывается в warm-up. */
  startIndex?: number;
  /** Конечный индекс итерации (default: series.endIndex) */
  endIndex?: number;
  /**
   * Комиссия на каждую сторону сделки (default: 0).
   *
   * @deprecated используйте {@link RunOptions.transactionCostModel}.
   *   Параметр сохранён для обратной совместимости и игнорируется, если задан
   *   `transactionCostModel`.
   */
  transactionCostPerTrade?: Decimal;
  /**
   * Модель транзакционных издержек (default: ZeroCostModel).
   * Применяется к каждой стороне сделки (entry и exit) отдельно.
   */
  transactionCostModel?: CostModel;
  /**
   * Модель проскальзывания (default: ZeroSlippageModel).
   * Применяется к цене close-бара до записи ордера.
   */
  slippageModel?: SlippageModel;
}

export class BarSeriesManager {
  private readonly _series: BarSeries;

  constructor(series: BarSeries) {
    this._series = series;
  }

  getSeries(): BarSeries {
    return this._series;
  }

  /**
   * Прогоняет стратегию по серии и возвращает торговую запись.
   *
   * Открытая позиция на конце серии остаётся незакрытой —
   * ta4j-совместимое поведение; вызывающий код сам решает, что с ней делать.
   */
  run(strategy: Strategy, options?: RunOptions): TradingRecord {
    const positionType = options?.positionType ?? PositionType.LONG;
    const amount = options?.amount ?? new Decimal('1');
    const sizer: PositionSizer = options?.positionSizer ?? new FixedQuantitySizer(amount);
    const initialEquity = options?.initialEquity ?? new Decimal('0');
    const startIndex = options?.startIndex ?? this._series.beginIndex;
    const endIndex = options?.endIndex ?? this._series.endIndex;
    const slippageModel: SlippageModel = options?.slippageModel ?? new ZeroSlippageModel();
    // Precedence: cost model > legacy flat fee > zero.
    const costModel: CostModel =
      options?.transactionCostModel ??
      (options?.transactionCostPerTrade
        ? new (class implements CostModel {
            private readonly _fee = options?.transactionCostPerTrade as Decimal;
            calculate(_price?: Decimal, _amount?: Decimal): Decimal {
              return this._fee;
            }
            getName(): string {
              return 'LegacyFlatFee';
            }
          })()
        : new ZeroCostModel());

    const record = new TradingRecord(positionType);
    const unstableUntil = Math.max(
      startIndex,
      this._series.beginIndex + strategy.getUnstableBars()
    );
    const isLong = positionType === PositionType.LONG;

    for (let i = startIndex; i <= endIndex; i++) {
      // Skip warm-up bars — indicators not yet reliable
      if (i < unstableUntil) {
        continue;
      }

      const bar = this._series.getBar(i);
      if (!bar) {
        continue;
      }

      const close = bar.close;

      if (strategy.shouldOperate(i, record)) {
        if (record.isOpened()) {
          // На выходе сторона противоположна входу.
          const side = isLong ? 'sell' : 'buy';
          const execPrice = slippageModel.apply(close, side, bar);
          const exitAmount = record.currentTrade?.getAmount() ?? new Decimal('0');
          if (exitAmount.isZero()) continue;
          const commission = costModel.calculate(execPrice, exitAmount);
          record.exit(i, execPrice, exitAmount, commission, bar.time);
        } else {
          const side = isLong ? 'buy' : 'sell';
          const execPrice = slippageModel.apply(close, side, bar);
          const qty = sizer.size({
            series: this._series,
            index: i,
            price: execPrice,
            record,
            initialEquity,
          });
          if (qty.isZero() || qty.isNegative()) continue;
          const commission = costModel.calculate(execPrice, qty);
          record.entry(i, execPrice, qty, commission, bar.time);
        }
      }
    }

    return record;
  }
}
