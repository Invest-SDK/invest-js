# T-Tech Invest SDK

Набор TypeScript-библиотек для работы с API T-Tech Invest: gRPC/REST-клиенты,
общие типы, стратегия и backtest engine для Node.js.

## Установка

Для Node.js-приложения установите SDK и его peer-зависимости:

```bash
npm install @ttech-pub/invest-sdk-node @ttech-pub/invest-core @ttech-pub/grpc-node-client
```

Для backtest и собственных стратегий добавьте engine:

```bash
npm install @ttech-pub/invest-engine-node
```

## Сертификат Минцифры для Node.js

Если Node.js-приложению нужен сертификат Минцифры, включите его загрузку при
создании SDK:

```ts
import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';

const sdk = await InvestNodeSDK.create({
  token: process.env.INVEST_API_TOKEN!,
  url: process.env.INVEST_API_HOST,
  useMincifryCertificate: true,
});
```

При включённом флаге SDK перед созданием gRPC-канала скачивает архив с
[Госуслуг](https://www.gosuslugi.ru/crt), извлекает сертификат и кеширует его в
памяти процесса. Повторные и параллельные создания SDK в том же процессе не
скачивают архив заново. URL архива:
`https://gu-st.ru/content/lending/russiantrustedca.zip`.

Для других Node.js-клиентов сертификат можно добавить через
`NODE_EXTRA_CA_CERTS`:

```bash
mkdir -p "$HOME/ca-certificates"
curl --fail --location \
  --output "$HOME/ca-certificates/russiantrustedca.zip" \
  https://gu-st.ru/content/lending/russiantrustedca.zip
unzip -p "$HOME/ca-certificates/russiantrustedca.zip" russiantrustedca.pem \
  > "$HOME/ca-certificates/russiantrustedca.pem"
test -s "$HOME/ca-certificates/russiantrustedca.pem"
export NODE_EXTRA_CA_CERTS="$HOME/ca-certificates/russiantrustedca.pem"
```

Перезапустите Node.js-приложение после изменения переменной окружения. Для
другого внутреннего PEM-файла замените путь в `NODE_EXTRA_CA_CERTS`. Не
отключайте проверку TLS через `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## ErrorHub

ErrorHub помогает разработчикам SDK находить и исправлять сбои stream-соединений. В Node.js и Web
диагностика включена по умолчанию (`telemetry: "enabled"`), чувствительные данные перед отправкой
маскируются. Чтобы отключить её, передайте `telemetry: "disabled"`; в Web при этом библиотека
ErrorHub не загружается.

## Конвертация цен облигаций и фьючерсов

`BondsPriceConverter` и `FuturesPriceConverter` есть и в
`@ttech-pub/invest-sdk-node`, и в `@ttech-pub/invest-sdk-web` — API одинаковый,
различается только пакет в импорте. Оба принимают либо отдельные коэффициенты
инструмента, либо целиком `BondResponse` / `FutureResponse`. Формулы описаны в
[справке Т-Банка](https://developer.tbank.ru/invest/intro/useful-info/points).

Цена облигации в пунктах — это процент от номинала:

```ts
import { BondsPriceConverter } from '@ttech-pub/invest-sdk-node';
import { Decimal } from '@ttech-pub/invest-core';
import type { MoneyValue } from '@ttech-pub/grpc-node-client';

const nominal: MoneyValue = { currency: 'rub', units: 1000, nano: 0 };

BondsPriceConverter.pointsToCurrency(new Decimal('95.5'), nominal).toString(); // '955'
BondsPriceConverter.currencyToPoints(new Decimal('955'), nominal).toString(); // '95.5'
```

Для фьючерса пересчёт идёт через `minPriceIncrement` и
`minPriceIncrementAmount`:

```ts
import { FuturesPriceConverter } from '@ttech-pub/invest-sdk-node';
import { Decimal } from '@ttech-pub/invest-core';
import type { FutureResponse } from '@ttech-pub/grpc-node-client';

declare const response: FutureResponse; // из GetFuturesCommand

FuturesPriceConverter.currencyToPoints(new Decimal('25'), response).toString();
FuturesPriceConverter.pointsToCurrency(new Decimal('125'), response).toString();
```

При передаче коэффициентов вручную проверяйте, что они заданы: на `undefined`
конвертеры бросают `TypeError`, на нулевом делителе —
`DivisionByZeroDecimalError`. Конвертацию валют, если валюта цены и валюта
номинала различаются, конвертеры не выполняют.

## Примеры

Каждый пример находится в отдельной директории с инструкцией запуска:

- [`engine-node`](./examples/engine-node/README.md) — RSI-бэктест;
- [`nest-js`](./examples/nest-js/README.md) — минимальное NestJS-приложение;
- [`nest-sdk`](./examples/nest-sdk/README.md) — SDK, backtest и live-бот;
- [`grpc-web-example`](./examples/grpc-web-example/README.md) — Vue 3 gRPC-Web UI.

Команды ниже выполняются из корня репозитория:

```bash
npm install

# Backtest на mock-данных — не требует токена
npx tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts --mock

# Backtest с историческими свечами из API
npx tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts
```

Параметры стратегии и пар инструментов находятся в
`examples/nest-sdk/src/backtest/config`.

## Запуск live-стратегии

Live-пример работает в sandbox и показывает полный цикл: свечной stream →
`LiveStrategyRunner` → две заявки для парной стратегии → обработка fills.
Денежные средства и заявки реального брокерского счёта не используются.

1. Создайте `examples/nest-sdk/.env`:

   ```dotenv
   INVEST_API_HOST=sandbox-invest-public-api.tbank.ru:443
   INVEST_API_TOKEN=<sandbox-token>
   # необязательно: иначе пример выберет или создаст sandbox-счёт
   INVEST_SANDBOX_ACCOUNT_ID=<account-id>
   ```

2. Запустите безопасный режим без заявок:

   ```bash
   npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts --dry-run --duration-sec 60
   ```

3. Для запуска заявок в sandbox используйте:

   ```bash
   npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts \
     --duration-sec 300 \
     --warmup-bars 60 \
     --max-orders 5
   ```

   Для проверки входа и выхода без ожидания сигнала можно добавить:

   ```bash
   npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts \
     --force-entry-after 5 \
     --force-exit-after 30 \
     --duration-sec 60
   ```

При остановке через `Ctrl+C` бот ждёт активную заявку, закрывает открытую
позицию в sandbox и печатает итог. Доступные флаги: `--duration-sec`,
`--warmup-bars`, `--dry-run`, `--force-entry-after`, `--force-exit-after` и
`--max-orders`.

## Продакшен-режим

Для переключения из sandbox в продакшен-режим замените хост и токен в `.env`:

```dotenv
# Продакшен API
INVEST_API_HOST=invest-public-api.tbank.ru:443
INVEST_API_TOKEN=<production-token>

# Уберите или закомментируйте INVEST_SANDBOX_ACCOUNT_ID
# INVEST_SANDBOX_ACCOUNT_ID=<account-id>
```

**Важно:**

- Sandbox-токен не работает с продакшен-API и наоборот
- Без `INVEST_SANDBOX_ACCOUNT_ID` SDK использует счёт по умолчанию из токена
- Все заявки в продакшене являются реальными и исполняются на бирже

## Сборка

```bash
npm run build:all
```

Публикуемые пакеты собираются из `libs/*`; версии и публикация выполняются
release pipeline.
