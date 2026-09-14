# sdk-web

Эта библиотека создана с помощью [Nx](https://nx.dev).

## Сборка

Чтобы собрать библиотеку, выполните `nx build sdk-web`.

## ErrorHub

ErrorHub помогает разработчикам SDK находить и исправлять сбои stream-соединений. Диагностика
включена по умолчанию (`telemetry: "enabled"`); при `telemetry: "disabled"` она отключается
и библиотека ErrorHub не загружается.

## Конвертация цены фьючерса

`FuturesPriceConverter` поддерживает как отдельные коэффициенты из `Future`,
так и объект `FutureResponse`. Формулы описаны в [справке Т-Банка о стоимости
шага цены фьючерса](https://developer.tbank.ru/invest/intro/useful-info/points).
Ниже приведены примеры с фиксированными значениями. Замените их значениями из
ответа API и перед ручной передачей коэффициентов проверяйте, что они заданы.

```ts
import { FuturesPriceConverter } from '@ttech-pub/invest-sdk-web';
import { Decimal } from '@ttech-pub/invest-core';
import type { Future, FutureResponse, Quotation } from '@ttech-pub/grpc-web-client';

const quotation = (units: number, nano = 0): Quotation => ({ units, nano });

const futureFixture = (minPriceIncrement: Quotation, minPriceIncrementAmount: Quotation): Future =>
  ({ minPriceIncrement, minPriceIncrementAmount } as Future);
```

Перевод валюты в пункты с отдельными коэффициентами (`25 * 0.5 / 2.5 = 5`):

```ts
const future = futureFixture(quotation(0, 500000000), quotation(2, 500000000));

if (!future.minPriceIncrement || !future.minPriceIncrementAmount) {
  throw new Error('Не заданы коэффициенты фьючерса');
}

FuturesPriceConverter.currencyToPoints(
  new Decimal('25'),
  future.minPriceIncrement,
  future.minPriceIncrementAmount,
).toString(); // '5'
```

Перевод валюты в пункты с типизированным `FutureResponse`:

```ts
const response: FutureResponse = {
  instrument: futureFixture(quotation(0, 500000000), quotation(2, 500000000)),
};

FuturesPriceConverter.currencyToPoints(new Decimal('25'), response).toString(); // '5'
```

Перевод пунктов в валюту с отдельными коэффициентами (`125 * 12.5 / 10 = 156.25`):

```ts
const future = futureFixture(quotation(10), quotation(12, 500000000));

if (!future.minPriceIncrement || !future.minPriceIncrementAmount) {
  throw new Error('Не заданы коэффициенты фьючерса');
}

FuturesPriceConverter.pointsToCurrency(
  new Decimal('125'),
  future.minPriceIncrement,
  future.minPriceIncrementAmount,
).toString(); // '156.25'
```

Перевод пунктов в валюту с типизированным `FutureResponse`:

```ts
const response: FutureResponse = {
  instrument: futureFixture(quotation(10), quotation(12, 500000000)),
};

FuturesPriceConverter.pointsToCurrency(new Decimal('125'), response).toString(); // '156.25'
```

## Конвертация цены облигации

Пункты цены облигации — это процент от номинала. Формулы:

- цена в пунктах = цена в валюте × 100 / номинал;
- цена в валюте = цена в пунктах / 100 × номинал.

Описание цен облигаций и фьючерсов приведено в [справке Т-Банка о ценах облигаций и фьючерсов](https://developer.tbank.ru/invest/intro/useful-info/points).
Помощник не выполняет конвертацию валют, если валюта цены и валюта номинала различаются; такой пересчёт выполняется отдельно.

```ts
import { BondsPriceConverter } from '@ttech-pub/invest-sdk-web';
import { Decimal } from '@ttech-pub/invest-core';
import type { Bond, BondResponse, MoneyValue } from '@ttech-pub/grpc-web-client';

const nominal: MoneyValue = { currency: 'rub', units: 1000, nano: 0 };
const bond: Bond = { nominal } as Bond;
const response: BondResponse = { instrument: bond };
```

Перевод пунктов в валюту с ручным `MoneyValue` (`95.5 / 100 × 1000 = 955`):

```ts
BondsPriceConverter.pointsToCurrency(new Decimal('95.5'), nominal).toString(); // '955'
```

Перевод пунктов в валюту с типизированным `BondResponse`:

```ts
BondsPriceConverter.pointsToCurrency(new Decimal('95.5'), response).toString(); // '955'
```

Перевод валюты в пункты с ручным `MoneyValue` (`955 × 100 / 1000 = 95.5`):

```ts
BondsPriceConverter.currencyToPoints(new Decimal('955'), nominal).toString(); // '95.5'
```

Перевод валюты в пункты с типизированным `BondResponse`:

```ts
BondsPriceConverter.currencyToPoints(new Decimal('955'), response).toString(); // '95.5'
```

## Порядок тестирования

Запускайте команды по порядку:

```bash
npx nx test sdk-web
npx nx build sdk-web
npx nx lint sdk-web
```

## Тест-кейсы

- Ручной `MoneyValue`: перевод пунктов в валюту (`95.5 → 955`) и валюты в пункты (`955 → 95.5`).
- Типизированный `BondResponse`: те же оба направления.
- Номинал с `nano`: точный обратный перевод без потери точности.
- Отсутствуют `instrument`, `nominal` или ручной номинал: `TypeError`.
- Некорректный номинал: выбрасывается `Error` при создании `Decimal`.
- Нулевой номинал: `currencyToPoints` выбрасывает `DivisionByZeroDecimalError`, `pointsToCurrency` возвращает `0`.
- Ручные `Quotation`: перевод валюты в пункты (`25 → 5`) и пунктов в валюту (`125 → 156.25`).
- Типизированный `FutureResponse`: те же оба направления.
- Коэффициенты с `nano`: точная конвертация без округления и потери точности.
- Отсутствуют `instrument`, `minPriceIncrement` или `minPriceIncrementAmount`, а также ручные коэффициенты: `TypeError`.
- Некорректные ручные коэффициенты: выбрасывается `Error` при создании `Decimal`.
- Нулевой `minPriceIncrementAmount` в `currencyToPoints` и нулевой `minPriceIncrement` в `pointsToCurrency`: `DivisionByZeroDecimalError`.
