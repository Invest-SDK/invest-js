/**
 * End-to-end бэктест классической RSI(14)-стратегии на синтетических данных.
 *
 * Запуск:
 *   tsx examples/engine-node/rsi-bot-backtest.ts
 *
 * Что показывает:
 * 1. Конструирование BarSeries из массива OHLC.
 * 2. RSI(14) + правила входа/выхода по уровням 30/70.
 * 3. BarSeriesManager.run с PercentEquitySizer, FixedBpsSlippageModel,
 *    LinearTransactionCostModel.
 * 4. Расчёт всех критериев и печать сводки.
 *
 * Замена синтетики на реальные свечи: вызовите GetCandlesCommand из
 * @ttech-pub/invest-sdk-node и сконвертируйте MarketdataHistoricCandle → Bar.
 */

import { Decimal } from '@ttech-pub/invest-core';
import {
  Bar,
  BarSeries,
  BaseStrategy,
  BarSeriesManager,
  ClosePriceIndicator,
  RSIIndicator,
  UnderIndicatorRule,
  OverIndicatorRule,
  PercentEquitySizer,
  FixedBpsSlippageModel,
  LinearTransactionCostModel,
  ReturnCriterion,
  BuyAndHoldReturnCriterion,
  MaximumDrawdownCriterion,
  MaximumDrawdownByBarCriterion,
  ProfitFactorCriterion,
  SharpeRatioCriterion,
  NumberOfPositionsCriterion,
} from '../../libs/engine-node/src/lib/core';

function makeSyntheticSeries(): BarSeries {
  const bars: Bar[] = [];
  let price = 100;
  let seed = 42;
  const rand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 200; i++) {
    const drift = Math.sin(i / 15) * 0.6 + (rand() - 0.5) * 2;
    price = Math.max(1, price + drift);
    const open = price;
    const close = price + (rand() - 0.5);
    const high = Math.max(open, close) + rand();
    const low = Math.min(open, close) - rand();
    bars.push(
      new Bar({
        time: new Date(2024, 0, 1, 0, i),
        open: new Decimal(open.toFixed(2)),
        high: new Decimal(high.toFixed(2)),
        low: new Decimal(low.toFixed(2)),
        close: new Decimal(close.toFixed(2)),
        volume: new Decimal('100'),
      })
    );
  }
  return new BarSeries({ name: 'SYN' }, bars);
}

function main(): void {
  const series = makeSyntheticSeries();
  const close = new ClosePriceIndicator(series);
  const rsi = new RSIIndicator(close, 14);

  const entry = new UnderIndicatorRule(rsi, new Decimal('30'));
  const exit = new OverIndicatorRule(rsi, new Decimal('70'));
  const strategy = new BaseStrategy('RSI(14) 30/70', entry, exit, 14);

  const manager = new BarSeriesManager(series);
  const initialEquity = new Decimal('100000');

  const record = manager.run(strategy, {
    initialEquity,
    positionSizer: new PercentEquitySizer(new Decimal('0.2')),
    transactionCostModel: new LinearTransactionCostModel(new Decimal('0.0005')),
    slippageModel: new FixedBpsSlippageModel(new Decimal('5')),
  });

  const criteria = [
    new ReturnCriterion(),
    new BuyAndHoldReturnCriterion(),
    new MaximumDrawdownCriterion(),
    new MaximumDrawdownByBarCriterion(initialEquity),
    new ProfitFactorCriterion(),
    new SharpeRatioCriterion(),
    new NumberOfPositionsCriterion(),
  ];

  console.log(`Strategy: ${strategy.getName()}`);
  console.log(`Bars: ${series.barCount}`);
  console.log(`Closed positions: ${record.closedPositionCount}`);
  console.log(`Net P&L: ${record.getNetProfit().toString()}`);
  console.log('---');
  for (const c of criteria) {
    console.log(`${c.getName()}: ${c.calculate(series, record).toString()}`);
  }
}

main();
