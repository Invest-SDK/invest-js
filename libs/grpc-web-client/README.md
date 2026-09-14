# T-Tech Invest API grpc-web Typescript library

Provides browser modules with promise api grpc stubs

## Install using npm

```
npm install @ttech-pub/grpc-web-client --save
```

## Usage

```
import { TTechApiClient } from '@ttech-pub/grpc-web-client'

const client = new TTechApiClient({ token: 't.invest.secret-token', metadata : {'x-app-name':'node-ts-myapp'}})

async function allInstruments() {
    const shares = await client.instruments.shares({})
    const bonds = await client.instruments.bonds({})
    const etfs = await client.instruments.etfs({})
    return {shares, bonds, etfs}
}

allInstruments()
    .catch(console.log)

```

## ErrorHub

ErrorHub помогает разработчикам SDK находить и исправлять сбои stream-соединений. Диагностика
включена по умолчанию (`telemetry: "enabled"`); при `telemetry: "disabled"` она отключается
и библиотека ErrorHub не загружается.

## Примеры

Подробные примеры использования смотри в `./examples`.
