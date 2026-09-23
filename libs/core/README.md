# @ttech-pub/invest-core

Общие примитивы SDK: десятичная арифметика, базовые ошибки, кеш и утилиты
ErrorHub. Пакет не ходит в сеть и не содержит клиентов API — его подтягивают
остальные пакеты набора.

Документация проекта: <https://opensource.tbank.ru/invest/invest-js>

## Установка

```bash
npm install @ttech-pub/invest-core
```

## Decimal

Денежные величины T-Invest API приходят как пара `units`/`nano`. `Decimal`
принимает их напрямую или строкой и считает без потерь на `big.js`.

```ts
import { Decimal } from '@ttech-pub/invest-core';

const price = new Decimal({ units: 250, nano: 500000000 }); // 250.5
const qty = new Decimal('4');

price.multiply(qty).toString(); // '1002'
price.toPrimitives(); // { units: 250, nano: 500000000 }
```

Арифметика: `add`, `subtract`, `multiply`, `divide`, `abs`.
Сравнение: `isZero`, `isPositive`, `isNegative`, `isEqualTo`, `isGreaterThan`,
`isLessThan`, `isGreaterThanOrEqual`, `isLessThanOrEqual`.
Статические: `Decimal.min`, `Decimal.max`.
Вывод: `toString`, `toPrimitives`.

Ошибки: `InputParamsNotValidDecimalError` (пустой или некорректный вход),
`DivisionByZeroDecimalError`, `CannotConvertToPrimitivesDecimalError`,
`UnknownDecimalError`.

## Ошибки

`BaseError` — абстрактный базовый класс всех ошибок SDK: обязательное поле
`code`, необязательные `cause`, `metadata`, `correlationId` и `toJSON()` для
сериализации в логи. `ValidationError` — готовая реализация для невалидного
ввода.

## Кеш

`LocalTTLCacheProvider` — реализация `CacheProvider` поверх `@isaacs/ttlcache`.
Именно её использует кеш инструментов в gRPC-клиентах.

```ts
import { LocalTTLCacheProvider } from '@ttech-pub/invest-core';

const cache = new LocalTTLCacheProvider({ defaultTtl: 30 * 60 * 1000, keyPrefix: 'instruments' });

await cache.set('BBG004730N88', share);
await cache.get('BBG004730N88');
cache.getStats(); // { hits, misses, size, hitRate }
```

`CacheOptions`:

| Параметр     | Тип      | По умолчанию | Значение                                              |
| ------------ | -------- | ------------ | ----------------------------------------------------- |
| `defaultTtl` | `number` | `60000`      | Время жизни записи, мс                                |
| `maxSize`    | `number` | `1000`       | Максимум записей; при переполнении вытесняются старые |
| `keyPrefix`  | `string` | `''`         | Префикс ключа, отделяется двоеточием                  |

`LocalTTLCacheOptions` дополнительно пробрасывает в `@isaacs/ttlcache` поля
`updateAgeOnGet`, `checkAgeOnGet` (по умолчанию `true`), `updateAgeOnHas`,
`checkAgeOnHas` (по умолчанию `true`), `noUpdateTTL`, `noDisposeOnSet` и
`dispose`.

Интерфейс `CacheProvider`: `get`, `set`, `has`, `delete`, `clear`, `cleanup`,
`getStats`.

## ErrorHub

Вспомогательные функции диагностики stream-соединений: маскирование
чувствительных данных и сбор контекста. Их вызывают gRPC-клиенты — напрямую
из приложения они обычно не нужны. Как включать и отключать диагностику,
описано в [README проекта](https://opensource.tbank.ru/invest/invest-js).
