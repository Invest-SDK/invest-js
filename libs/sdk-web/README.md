# @ttech-pub/invest-sdk-web

SDK T-Invest API для браузера. Оборачивает gRPC-Web-клиент в команды с
типизированным входом и выходом, отдаёт stream-подписки как
RxJS-`Observable` и приводит цены к `Decimal`.

Node.js-версия — [`@ttech-pub/invest-sdk-node`](https://www.npmjs.com/package/@ttech-pub/invest-sdk-node):
там же песочница и сертификат УЦ Минцифры, которых в браузерном пакете нет.

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

`@ttech-pub/grpc-web-client` и `@ttech-pub/invest-core` — peer-зависимости:

```bash
npm install @ttech-pub/invest-sdk-web @ttech-pub/invest-core @ttech-pub/grpc-web-client
```

## Использование

```ts
import { InvestWebSDK, GetSharesCommand } from '@ttech-pub/invest-sdk-web';
import { InstrumentStatus } from '@ttech-pub/grpc-web-client';

const sdk = new InvestWebSDK({ token: 't.invest.secret-token' });

const { instruments } = await sdk.send(
  new GetSharesCommand({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE })
);
```

Конструктор синхронный. Пустой токен — `EmptyTokenError`.

Токен попадает в бандл и виден пользователю — используйте токен только для
чтения или проксируйте запросы через свой бэкенд.

Единственный метод экземпляра — `send(command)`. Он возвращает то, что
объявила команда: `Promise` для унарных вызовов и `Promise<Observable<...>>`
для stream-команд.

### `InvestWebSDKOptions`

Расширяет `TTechAPIClientOptions` из `@ttech-pub/grpc-web-client` без
изменений:

| Параметр            | Тип                       | По умолчанию                         | Значение                                                                                                                 |
| ------------------- | ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `token`             | `string`                  | —                                    | Токен T-Invest API. Пустой или отсутствующий — `EmptyTokenError`                                                         |
| `url`               | `string`                  | `https://invest-public-api.tbank.ru` | Адрес API; для песочницы `https://sandbox-invest-public-api.tbank.ru:443`                                                |
| `cache.instruments` | `boolean`                 | `true`                               | Кеш точечных запросов инструментов, TTL 30 минут. Отключается только явным `false`                                       |
| `telemetry`         | `'enabled' \| 'disabled'` | `'enabled'`                          | Диагностика stream-соединений. При `'disabled'` библиотека ErrorHub не подгружается. Любое другое значение — `TypeError` |
| `metadata`          | `Record<string, string>`  | —                                    | Добавляются к каждому вызову; per-call метаданные их перекрывают. `Authorization` и `x-app-name` задаёт клиент           |

## Потоки

Stream-команды отдают `Observable`, поэтому подписку закрывает RxJS:

```ts
import { GetMarketdataStreamCommand } from '@ttech-pub/invest-sdk-web';
import { SubscriptionAction, SubscriptionInterval } from '@ttech-pub/grpc-web-client';

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
import { BaseCommand, APIService } from '@ttech-pub/invest-sdk-web';
import type { GetAccountsResponse } from '@ttech-pub/grpc-web-client';

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

## Конвертация цен

`BondsPriceConverter` и `FuturesPriceConverter` переводят цены между пунктами
и валютой. Примеры — в
[README проекта](https://opensource.tbank.ru/invest/invest-js) (в импортах
замените `@ttech-pub/invest-sdk-node` на `@ttech-pub/invest-sdk-web`).

## ErrorHub

Управление телеметрией описано в
[README проекта](https://opensource.tbank.ru/invest/invest-js).

## Пример

Vue 3 UI поверх gRPC-Web:
[`examples/grpc-web-example`](https://opensource.tbank.ru/invest/invest-js/-/tree/main/examples/grpc-web-example).
