import type { ClientMiddleware, ClientMiddlewareCall, CallOptions } from 'nice-grpc-web';
import { LocalTTLCacheProvider } from '@ttech-pub/invest-core';
import { InstrumentIdType } from '../compiled/instruments';

const servicePath = '/tinkoff.public.invest.api.contract.v1.InstrumentsService';
const instrumentsCacheTtlMs = 30 * 60 * 1000;
const rpcPaths = {
  GetInstrumentBy: `${servicePath}/GetInstrumentBy`,
  BondBy: `${servicePath}/BondBy`,
  CurrencyBy: `${servicePath}/CurrencyBy`,
  EtfBy: `${servicePath}/EtfBy`,
  FutureBy: `${servicePath}/FutureBy`,
  OptionBy: `${servicePath}/OptionBy`,
  ShareBy: `${servicePath}/ShareBy`,
  StructuredNoteBy: `${servicePath}/StructuredNoteBy`,
  DfaBy: `${servicePath}/DfaBy`,
} as const;
const cacheablePaths = new Set<string>(Object.values(rpcPaths));
const cacheableIdTypes = new Set([
  InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
  InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER,
  InstrumentIdType.INSTRUMENT_ID_TYPE_UID,
  InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID,
  InstrumentIdType.INSTRUMENT_ID_TYPE_ID,
]);

type Request = {
  idType?: unknown;
  id?: unknown;
  classCode?: unknown;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function encodeKey(
  path: string,
  idType: InstrumentIdType,
  id: string,
  classCode: string | null
): string {
  return JSON.stringify([path, idType, id, classCode]);
}

function requestKey(path: string, request: unknown): string | undefined {
  if (!isRecord(request)) {
    return undefined;
  }

  const { idType, id, classCode } = request as Request;
  if (
    typeof idType !== 'number' ||
    !cacheableIdTypes.has(idType) ||
    typeof id !== 'string' ||
    id.length === 0
  ) {
    return undefined;
  }

  if (idType === InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER) {
    return typeof classCode === 'string' && classCode.length > 0
      ? encodeKey(path, idType, id, classCode)
      : undefined;
  }

  return encodeKey(path, idType, id, null);
}

function responseInstrument(path: string, response: unknown): RecordValue | undefined {
  if (path === rpcPaths.DfaBy) {
    return isRecord(response) ? response : undefined;
  }

  if (!isRecord(response) || !isRecord(response['instrument'])) {
    return undefined;
  }

  return response['instrument'];
}

function responseKeys(path: string, instrument: RecordValue): string[] {
  const keys: string[] = [];

  const figi = nonEmptyString(instrument['figi']);
  if (figi && path !== rpcPaths.OptionBy && path !== rpcPaths.DfaBy) {
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI, figi, null));
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_ID, figi, null));
  }

  const uid = nonEmptyString(instrument['uid']);
  if (uid) {
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_UID, uid, null));
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_ID, uid, null));
  }

  const positionUid = nonEmptyString(instrument['positionUid']);
  if (positionUid) {
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_POSITION_UID, positionUid, null));
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_ID, positionUid, null));
  }

  const ticker = nonEmptyString(instrument['ticker']);
  const classCode = nonEmptyString(instrument['classCode']);
  if (ticker && classCode && path !== rpcPaths.DfaBy) {
    keys.push(encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER, ticker, classCode));
    keys.push(
      encodeKey(path, InstrumentIdType.INSTRUMENT_ID_TYPE_ID, `${ticker}_${classCode}`, null)
    );
  }

  return keys;
}

export function createResponseCacheMiddleware(ttl = instrumentsCacheTtlMs): ClientMiddleware {
  const cache = new LocalTTLCacheProvider({ defaultTtl: ttl });

  return async function* <RequestType, ResponseType>(
    call: ClientMiddlewareCall<RequestType, ResponseType>,
    options: CallOptions
  ) {
    const path = call.method.path;
    const key =
      cacheablePaths.has(path) && !call.requestStream && !call.responseStream
        ? requestKey(path, call.request)
        : undefined;

    if (!key) {
      return yield* call.next(call.request, options);
    }

    const cached = await cache.get<ResponseType>(key);
    if (cached !== undefined) {
      return cached;
    }

    const response = yield* call.next(call.request, options);
    const instrument = responseInstrument(path, response);
    if (!instrument) {
      return response;
    }

    const keys = responseKeys(path, instrument);
    if (keys.length === 0) {
      return response;
    }

    await cache.set(key, response);
    await Promise.all(keys.map((alias) => cache.set(alias, response)));

    return response;
  };
}
