# @ttech-pub/invest-engine-node

Движок стратегий и бэктеста для Node.js: свечные серии, индикаторы, правила
входа и выхода, прогон по истории и мост к live-торговле. Зависит только от
`@ttech-pub/invest-core` — сам в сеть не ходит и от gRPC-клиентов не зависит,
свечи подаёт вызывающий код.

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

```bash
npm install @ttech-pub/invest-engine-node @ttech-pub/invest-core
```

## Бэктест

`BarSeries` хранит историю, `BaseStrategy` связывает правила входа и выхода,
`BarSeriesManager.run` прогоняет стратегию и возвращает `TradingRecord`.

```ts
import {
  BarSeries,
  BaseStrategy,
  ClosePriceIndicator,
  RSIIndicator,
  OverboughtRSIRule,
  OversoldRSIRule,
  BarSeriesManager,
  ReturnCriterion,
} from '@ttech-pub/invest-engine-node';
import { Decimal } from '@ttech-pub/invest-core';

const series = new BarSeries({ name: 'SBER' }, []);
// series.addBar(...) — свечи из GetCandlesCommand

const close = new ClosePriceIndicator(series);
const rsi = new RSIIndicator(close, 14);

const strategy = new BaseStrategy(
  new OversoldRSIRule(rsi, new Decimal('30')),
  new OverboughtRSIRule(rsi, new Decimal('70'))
);

const record = new BarSeriesManager(series).run(strategy, {
  initialEquity: new Decimal('100000'),
});

new ReturnCriterion().calculate(series, record).toString();
```

### `RunOptions`

| Параметр               | Тип             | По умолчанию            | Значение                                            |
| ---------------------- | --------------- | ----------------------- | --------------------------------------------------- |
| `positionType`         | `PositionType`  | `LONG`                  | Направление позиций прогона                         |
| `positionSizer`        | `PositionSizer` | `FixedQuantitySizer(1)` | Расчёт объёма позиции                               |
| `initialEquity`        | `Decimal`       | `0`                     | Стартовый капитал; нужен процентным сайзерам        |
| `startIndex`           | `number`        | `series.beginIndex`     | Первый бар итерации; история до него идёт в warm-up |
| `endIndex`             | `number`        | `series.endIndex`       | Последний бар итерации                              |
| `transactionCostModel` | `CostModel`     | `ZeroCostModel`         | Издержки, применяются к входу и выходу отдельно     |
| `slippageModel`        | `SlippageModel` | `ZeroSlippageModel`     | Проскальзывание цены close до записи ордера         |

Открытая на конце серии позиция остаётся незакрытой — что с ней делать,
решает вызывающий код.

## Live-прогон

`LiveStrategyRunner` — мост «новый бар → решение → намерение ордера». Он не
отправляет заявки: `push` возвращает `OrderIntent` либо `null`, а маппинг в
реальную заявку и вызов `recordFill` после подтверждения брокером остаются на
стороне приложения.

```ts
import { LiveStrategyRunner, PositionType } from '@ttech-pub/invest-engine-node';

const runner = new LiveStrategyRunner(series, strategy, { positionType: PositionType.LONG });

const intent = runner.push(bar);
if (intent) {
  // intent: { side, quantity, referencePrice, type, index, time }
}
```

### `LiveStrategyRunnerOptions`

| Параметр        | Тип                   | По умолчанию                      | Значение                                                                               |
| --------------- | --------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `positionType`  | `PositionType`        | `record?.positionType` или `LONG` | Направление позиций. При конфликте с `record.positionType` конструктор бросает ошибку  |
| `positionSizer` | `PositionSizer`       | `FixedQuantitySizer(1)`           | Расчёт объёма позиции                                                                  |
| `initialEquity` | `Decimal`             | `0`                               | Стартовый капитал для процентных сайзеров                                              |
| `orderType`     | `'market' \| 'limit'` | `'market'`                        | Тип эмитируемых намерений                                                              |
| `record`        | `TradingRecord`       | новая запись                      | Внешняя торговая запись — если состояние ведётся совместно с реконсилиацией от брокера |

`push` возвращает `null`, пока не пройден warm-up стратегии
(`getUnstableBars`), а также если сайзер дал нулевой или отрицательный объём.

## Подключаемые модели

| Назначение                        | Реализации                                                                  |
| --------------------------------- | --------------------------------------------------------------------------- |
| Объём позиции (`PositionSizer`)   | `FixedQuantitySizer`, `PercentEquitySizer`, `ATRBasedSizer`                 |
| Издержки (`CostModel`)            | `ZeroCostModel`, `LinearTransactionCostModel`, `FixedTransactionCostModel`  |
| Проскальзывание (`SlippageModel`) | `ZeroSlippageModel`, `FixedBpsSlippageModel`, `SpreadFractionSlippageModel` |

## Индикаторы, правила и метрики

Индикаторы (67 классов) сгруппированы по директориям
`indicators/{moving-averages,momentum,volatility,trend,volume,statistics,candles,helpers}`
— скользящие средние, RSI, MACD, стохастик, ATR, полосы Боллинджера и прочие.

Правила комбинируются булевой логикой: `AndRule`, `OrRule`, `NotRule`,
`XorRule`, `NandRule`, `NorRule`, `combineAnd`, `combineOr`. Готовые торговые
правила — `StopLossRule`, `TakeProfitRule`, `TrailingStopRule`, `WaitRule`,
`CrossedUpIndicatorRule` и другие из `rules/`.

Метрики результата: `ReturnCriterion`, `BuyAndHoldReturnCriterion`,
`ProfitFactorCriterion`, `SharpeRatioCriterion`, `MaximumDrawdownCriterion`,
`MaximumDrawdownByBarCriterion`, `NumberOfBarsCriterion`,
`NumberOfPositionsCriterion`.

Агрегация свечей в другой таймфрейм — `DurationBarAggregator`,
`OhlcvBarAggregator`, `aggregateBarSeries`; Heikin-Ashi — `toHeikinAshiBars`,
`toHeikinAshiSeries`.

## Пример

Готовый RSI-бэктест:
[`examples/engine-node`](https://opensource.tbank.ru/invest/invest-js/-/tree/main/examples/engine-node).
