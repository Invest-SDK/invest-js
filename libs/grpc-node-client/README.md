# @ttech-pub/grpc-node-client

Низкоуровневый gRPC-клиент T-Invest API для Node.js: сгенерированные из
[контрактов](https://opensource.tbank.ru/invest/invest-contracts) типы и стабы
сервисов. Авторизация, кеш инструментов и диагностика подключены как
middleware.

Если нужен не сырой gRPC, а команды и RxJS-потоки, берите
[`@ttech-pub/invest-sdk-node`](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node).

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

`nice-grpc` — peer-зависимость, её ставят отдельно:

```bash
npm install @ttech-pub/grpc-node-client @ttech-pub/invest-core nice-grpc
```

## Использование

```ts
import { NodeApiClient, InstrumentStatus } from '@ttech-pub/grpc-node-client';

const client = new NodeApiClient({ token: process.env.INVEST_API_TOKEN! });

const { instruments } = await client.instruments.shares({
  instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE,
});
```

`NodeApiClient.create()` — асинхронная форма конструктора. Она обязательна при
`useMincifryCertificate: true`, потому что сертификат нужно скачать до создания
канала; синхронный конструктор в этом случае бросает ошибку.

```ts
const client = await NodeApiClient.create({
  token: process.env.INVEST_API_TOKEN!,
  useMincifryCertificate: true,
});
```

### `TTechAPIClientOptions`

| Параметр                 | Тип                       | По умолчанию                         | Значение                                                                                                         |
| ------------------------ | ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `token`                  | `string`                  | —                                    | Токен T-Invest API                                                                                               |
| `url`                    | `string`                  | `https://invest-public-api.tbank.ru` | Адрес API; для песочницы `https://sandbox-invest-public-api.tbank.ru:443`                                        |
| `cache.instruments`      | `boolean`                 | `true`                               | Кеш точечных запросов инструментов. Отключается только явным `false`                                             |
| `useMincifryCertificate` | `boolean`                 | `false`                              | Скачать сертификат УЦ Минцифры и использовать его как корневой для gRPC-канала. Требует `NodeApiClient.create()` |
| `telemetry`              | `'enabled' \| 'disabled'` | `'enabled'`                          | Диагностика stream-соединений. Любое другое значение — `TypeError`                                               |
| `metadata`               | `Record<string, string>`  | —                                    | Добавляются к каждому вызову; per-call метаданные их перекрывают                                                 |

Клиент всегда проставляет `Authorization: Bearer <token>` и
`x-app-name: t-invest-js-node-sdk`, перезаписывая одноимённые ключи.

## Сервисы

`instruments`, `marketdata`, `marketdataStream`, `operations`,
`operationsStream`, `orders`, `ordersStream`, `stopOrders`, `users`, `sandbox`.

## Кеш инструментов

Кешируются только точечные запросы: `GetInstrumentBy`, `BondBy`, `CurrencyBy`,
`EtfBy`, `FutureBy`, `OptionBy`, `ShareBy`, `StructuredNoteBy`, `DfaBy` — и
только при поиске по `figi`, `ticker`, `uid`, `position_uid` или `id`. TTL —
30 минут, хранилище in-memory (`LocalTTLCacheProvider` из
`@ttech-pub/invest-core`). Списочные запросы вроде `shares` не кешируются.

## ErrorHub

Диагностика сбоев stream-соединений включена по умолчанию
(`telemetry: "enabled"`), чувствительные данные перед отправкой маскируются.

Для своих HTTPS-запросов ErrorHub догружает сертификат УЦ Минцифры через тот же
кеш, что и `useMincifryCertificate`, и добавляет его к стандартным доверенным
УЦ Node.js — сертификаты Let's Encrypt продолжают работать, глобальные
настройки TLS не меняются. Отправка диагностики ждёт загрузки до 5 секунд, при
ошибке используются стандартные УЦ. Создание клиента и запросы к Invest API
этой загрузки не ждут.

## Сертификат Минцифры

Установка сертификата и альтернатива через `NODE_EXTRA_CA_CERTS` описаны в
[README проекта](https://opensource.tbank.ru/invest/invest-js).
