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

Пример создания SDK:

```ts
import { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';

const sdk = new InvestNodeSDK({
  token: process.env.INVEST_API_TOKEN!,
  url: process.env.INVEST_API_HOST,
});
```

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
   INVEST_API_HOST=sandbox-invest-public-api.tinkoff.ru:443
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

## Сборка

```bash
npm run build:all
```

Публикуемые пакеты собираются из `libs/*`; версии и публикация выполняются
release pipeline.
