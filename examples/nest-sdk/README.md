# NestJS SDK example

Пример показывает использование Node.js SDK в NestJS, получение портфеля,
размещение sandbox-ордера, backtest парной стратегии и запуск live-бота.

## Подготовка

Требуется Node.js 22 или новее. Установите зависимости из корня репозитория:

```bash
npm install
```

Для команд, которые обращаются к API, создайте файл окружения:

```bash
cp examples/nest-sdk/.env.example examples/nest-sdk/.env
```

Заполните `INVEST_API_TOKEN` и при необходимости `INVEST_API_HOST`.

## NestJS-сервис

Запуск:

```bash
npx nx serve nest-sdk
```

Сервис использует `PORT` из окружения, а по умолчанию NestJS выбирает порт,
переданный приложению. Для явного порта запустите так:

```bash
PORT=4532 npx nx serve nest-sdk
```

Доступные endpoints:

```bash
curl http://localhost:4532/api/portfolio/accounts
curl http://localhost:4532/api/portfolio/accounts/<account-id>/positions
curl -N http://localhost:4532/api/order/stream-active-ids/<account-id>
```

Swagger доступен по адресу `http://localhost:4532/api/swagger`.

## Backtest

Прогон без сети и токена:

```bash
npx tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts --mock
```

Прогон по историческим данным API:

```bash
npx tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts
```

Параметрический sweep SBER/SBERP:

```bash
npx tsx examples/nest-sdk/src/backtest/sweep-sber-sberp.ts --hours 6
```

## Live-стратегия

Live-бот работает только в sandbox. Он загружает историю, строит z-score
стратегию, подписывается на часовые свечи и передаёт сигналы в две sandbox-заявки.

Сначала запустите безопасную проверку без размещения заявок:

```bash
npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts \
  --dry-run \
  --duration-sec 60
```

Запуск с заявками в sandbox:

```bash
npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts \
  --duration-sec 300 \
  --warmup-bars 60 \
  --max-orders 5
```

Для принудительной проверки входа и выхода:

```bash
npx tsx examples/nest-sdk/src/backtest/live/live-bot.ts \
  --force-entry-after 5 \
  --force-exit-after 30 \
  --duration-sec 60
```

Остановка через `Ctrl+C` закрывает открытую позицию в sandbox и печатает итог.

## Тесты

```bash
node --import tsx --test examples/nest-sdk/src/backtest/live/*.test.ts
```
