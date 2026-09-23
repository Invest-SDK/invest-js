# @ttech-pub/invest-sdk-node

SDK T-Invest API для Node.js. Оборачивает gRPC-клиент в команды с типизированным
входом и выходом, отдаёт stream-подписки как RxJS-`Observable`, приводит цены к
`Decimal` и добавляет песочницу.

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

`@ttech-pub/grpc-node-client` и `@ttech-pub/invest-core` — peer-зависимости:

```bash
npm install @ttech-pub/invest-sdk-node @ttech-pub/invest-core @ttech-pub/grpc-node-client
```

## Использование

```ts
import { InvestNodeSDK, GetSharesCommand } from '@ttech-pub/invest-sdk-node';
import { InstrumentStatus } from '@ttech-pub/grpc-node-client';

const sdk = await InvestNodeSDK.create({ token: process.env.INVEST_API_TOKEN! });

const { instruments } = await sdk.send(
  new GetSharesCommand({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE })
);
```

Единственный метод экземпляра — `send(command)`. Он возвращает то, что
объявила команда: `Promise` для унарных вызовов и `Promise<Observable<...>>`
для stream-команд.

`InvestNodeSDK.create()` — асинхронная форма. Она обязательна при
`useMincifryCertificate: true`; синхронный `new InvestNodeSDK(options)` в этом
случае бросает ошибку. Пустой токен — `EmptyTokenError`.

### `InvestNodeSDKOptions`

Расширяет `TTechAPIClientOptions` из `@ttech-pub/grpc-node-client` без
изменений:

| Параметр                 | Тип                       | По умолчанию                         | Значение                                                                                                       |
| ------------------------ | ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `token`                  | `string`                  | —                                    | Токен T-Invest API. Пустой или отсутствующий — `EmptyTokenError`                                               |
| `url`                    | `string`                  | `https://invest-public-api.tbank.ru` | Адрес API; для песочницы `https://sandbox-invest-public-api.tbank.ru:443`                                      |
| `cache.instruments`      | `boolean`                 | `true`                               | Кеш точечных запросов инструментов, TTL 30 минут. Отключается только явным `false`                             |
| `useMincifryCertificate` | `boolean`                 | `false`                              | Скачать сертификат УЦ Минцифры и использовать как корневой для gRPC-канала. Требует `InvestNodeSDK.create()`   |
| `telemetry`              | `'enabled' \| 'disabled'` | `'enabled'`                          | Диагностика stream-соединений. Любое другое значение — `TypeError`                                             |
| `metadata`               | `Record<string, string>`  | —                                    | Добавляются к каждому вызову; per-call метаданные их перекрывают. `Authorization` и `x-app-name` задаёт клиент |

## Потоки

Stream-команды отдают `Observable`, поэтому подписку закрывает RxJS:

```ts
import { GetMarketdataStreamCommand } from '@ttech-pub/invest-sdk-node';
import { SubscriptionAction, SubscriptionInterval } from '@ttech-pub/grpc-node-client';

const stream$ = await sdk.send(
  new GetMarketdataStreamCommand({
    subscribeCandlesRequest: {
      subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
      instruments: [
        {
          figi: share.figi,
          instrumentId: share.uid,
          interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE,
        },
      ],
      waitingClose: true,
    },
    subscribeOrderBookRequest: undefined,
    subscribeTradesRequest: undefined,
    subscribeInfoRequest: undefined,
    subscribeLastPriceRequest: undefined,
    pingSettings: undefined,
  })
);

const subscription = stream$.subscribe((item) => console.log(item));
// subscription.unsubscribe();
```

Незаданные подписки нужно передавать явным `undefined` — поля запроса
обязательные.

## Свои команды

`send` принимает любой наследник `BaseCommand<T, S>`: `T` — тип опций,
`S` — тип результата. В `call` приходит `APIService` — набор gRPC-сервисов
клиента.

```ts
import { BaseCommand, APIService } from '@ttech-pub/invest-sdk-node';
import type { GetAccountsResponse } from '@ttech-pub/grpc-node-client';

class GetAccountsRawCommand extends BaseCommand<
  Record<string, never>,
  Promise<GetAccountsResponse>
> {
  call(client: APIService): Promise<GetAccountsResponse> {
    return client.users.getAccounts(this.options);
  }
}
```

## Команды

| Группа          | Команды                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Инструменты     | `GetSharesCommand`, `GetBondsCommand`, `GetETFsCommand`, `GetFuturesCommand`, `GetOptionsCommand`, `GetCurrenciesCommand`, `GetIndicativesCommand`, `GetAssetsCommand`, `GetAllMainInstrumentsCommand`, `GetAssetFundamentalsCommand`, `GetConsensusForecastsCommand`, `GetBondCouponsCommand`, `GetDividendsCommand`, `GetRiskRatesCommand`, `GetTradingSchedulesCommand` |
| Рыночные данные | `GetCandlesCommand`, `GetOrderBookCommand`, `GetLastTradesCommand`, `GetLastPricesCommand`, `GetClosePricesCommand`, `GetTradingStatusesCommand`, `GetTechAnalysisIndicatorsCommand`, `GetMarketdataStreamCommand`                                                                                                                                                         |
| Заявки          | `CreateOrderCommand`, `CreateAsyncOrderCommand`, `GetActiveOrdersCommand`, `GetActiveOrdersStreamCommand`, `GetSuccessOrdersStreamCommand`                                                                                                                                                                                                                                 |
| Портфель        | `GetAccountsCommand`, `GetPositionsCommand`, `GetOperationsCommand`                                                                                                                                                                                                                                                                                                        |
| Песочница       | `OpenSandboxAccountCommand`, `CloseSandboxAccountCommand`, `GetSandboxAccountsCommand`, `GetSandboxPortfolioCommand`, `GetSandboxPositionsCommand`, `SandboxPayInCommand`, `PostSandboxOrderCommand`                                                                                                                                                                       |

Группа «Песочница» есть только в этом пакете — в `@ttech-pub/invest-sdk-web`
её нет.

## Конвертация цен

`BondsPriceConverter` и `FuturesPriceConverter` переводят цены между пунктами
и валютой. Примеры — в
[README проекта](https://opensource.tbank.ru/invest/invest-js).

## Сертификат Минцифры и ErrorHub

Установка сертификата УЦ Минцифры и управление телеметрией описаны в
[README проекта](https://opensource.tbank.ru/invest/invest-js).

## Примеры

Бэктест, live-бот и NestJS-приложение:
[`examples/nest-sdk`](https://opensource.tbank.ru/invest/invest-js/-/tree/main/examples/nest-sdk).
