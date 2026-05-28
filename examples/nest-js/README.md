# NestJS example

Минимальное NestJS-приложение с одним endpoint для проверки запуска Node.js
примера через Nx.

## Запуск

Требуется Node.js 22 или новее. Из корня репозитория выполните:

```bash
npm install
npx nx serve nest-js
```

Приложение запустится на `http://localhost:3000`.

Проверка endpoint:

```bash
curl http://localhost:3000/api
```

Ожидаемый ответ: `Hello API`.

## Сборка

```bash
npx nx build nest-js
```
