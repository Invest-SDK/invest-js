# @ttech-pub/grpc-web-client

Низкоуровневый gRPC-Web-клиент T-Invest API для браузера: сгенерированные из
[контрактов](https://opensource.tbank.ru/invest/invest-contracts) типы и стабы
сервисов с promise-API. Авторизация, кеш инструментов и диагностика подключены
как middleware.

Если нужен не сырой gRPC-Web, а команды и RxJS-потоки, берите
[`@ttech-pub/invest-sdk-web`](https://www.npmjs.com/package/@ttech-pub/invest-sdk-web).

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

`nice-grpc-web` — peer-зависимость, её ставят отдельно:

```bash
npm install @ttech-pub/grpc-web-client @ttech-pub/invest-core nice-grpc-web
```

## Использование

```ts
import { WebApiClient, InstrumentStatus } from '@ttech-pub/grpc-web-client';

const client = new WebApiClient({ token: 't.invest.secret-token' });

const shares = await client.instruments.shares({
  instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE,
});
```

Токен попадает в бандл и виден пользователю — в браузере используйте токен
только для чтения или проксируйте запросы через свой бэкенд.

### `TTechAPIClientOptions`

| Параметр            | Тип                       | По умолчанию                         | Значение                                                                  |
| ------------------- | ------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `token`             | `string`                  | —                                    | Токен T-Invest API                                                        |
| `url`               | `string`                  | `https://invest-public-api.tbank.ru` | Адрес API; для песочницы `https://sandbox-invest-public-api.tbank.ru:443` |
| `cache.instruments` | `boolean`                 | `true`                               | Кеш точечных запросов инструментов. Отключается только явным `false`      |
| `telemetry`         | `'enabled' \| 'disabled'` | `'enabled'`                          | Диагностика stream-соединений. Любое другое значение — `TypeError`        |
| `metadata`          | `Record<string, string>`  | —                                    | Добавляются к каждому вызову; per-call метаданные их перекрывают          |

Клиент всегда проставляет `Authorization: Bearer <token>` и
`x-app-name: t-invest-js-web-sdk`, перезаписывая одноимённые ключи.

## Сервисы

`instruments`, `marketdata`, `marketdataStream`, `operations`,
`operationsStream`, `orders`, `ordersStream`, `stopOrders`, `users`, `sandbox`.

## Кеш инструментов

Кешируются только точечные запросы (`GetInstrumentBy`, `ShareBy`, `BondBy` и
подобные) при поиске по `figi`, `ticker`, `uid`, `position_uid` или `id`. TTL —
30 минут, хранилище in-memory. Списочные запросы вроде `shares` не кешируются.

## ErrorHub

Диагностика сбоев stream-соединений включена по умолчанию
(`telemetry: "enabled"`). При `telemetry: "disabled"` она отключается, и
библиотека ErrorHub в бандл не подгружается.

## Пример

Vue 3 UI на gRPC-Web:
[`examples/grpc-web-example`](https://opensource.tbank.ru/invest/invest-js/-/tree/main/examples/grpc-web-example).
