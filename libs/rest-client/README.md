# @ttech-pub/invest-rest-client

REST-клиент T-Invest API (HTTP JSON). Методы и типы сгенерированы из OpenAPI-
спецификации [контрактов](https://opensource.tbank.ru/invest/invest-contracts)
через [Platformatic client](https://docs.platformatic.dev/docs/client/frontend).

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

```bash
npm install @ttech-pub/invest-rest-client @ttech-pub/invest-core
```

## Использование

```ts
import { InvestAPIClient } from '@ttech-pub/invest-rest-client';

const client = new InvestAPIClient({
  url: 'https://invest-public-api.tbank.ru/rest',
  token: process.env.TOKEN,
});

const response = await client.restClient.instrumentsServiceShares({
  instrumentStatus: 'INSTRUMENT_STATUS_BASE',
});
```

| Параметр  | Тип                      | По умолчанию | Значение                                                |
| --------- | ------------------------ | ------------ | ------------------------------------------------------- |
| `url`     | `string`                 | —            | Базовый адрес REST API. Пустая строка — `EmptyURLError` |
| `token`   | `string`                 | —            | Токен для заголовка `Authorization: Bearer <token>`     |
| `headers` | `Record<string, string>` | `{}`         | Дополнительные заголовки; перекрывают `token`           |

Заголовки принадлежат экземпляру: два клиента с разными токенами не мешают
друг другу.

`restClient` — сгенерированный набор методов сервисов, по одному на RPC
контракта (`instrumentsServiceShares`, `marketDataServiceGetCandles` и так
далее). Каждый метод принимает только тело запроса и возвращает union из
успешного ответа и ответа с ошибкой, поэтому результат нужно сузить перед
использованием. На HTTP-ответ не-2xx метод бросает `Error` с текстом тела.

Служебные `setBaseUrl`, `setDefaultHeaders` и `setDefaultFetchParams` из
`restClient` исключены: адрес и заголовки задаются только конструктором.

Пакет покрывает голый REST. Кеш инструментов, стримы и работу с `Decimal` даёт
[`@ttech-pub/invest-sdk-node`](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node).

## Ошибки

На пустой `url` конструктор бросает `EmptyURLError` (`code: 'EmptyURL'`,
наследник `BaseError` из `@ttech-pub/invest-core`).
