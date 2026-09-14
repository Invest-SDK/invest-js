import {
  CIRCULAR_VALUE,
  FILTERED_VALUE,
  isBinary,
  isErrorHubErrorReportable,
  isSensitiveKey,
  scrubErrorHubValue,
  scrubString,
} from './sanitizer';
import {
  MAX_METRIC_ATTRIBUTE_STRING_LENGTH,
  STREAM_COUNT_METRIC,
  STREAM_DURATION_METRIC,
  STREAM_ERROR_METRIC,
} from './constants';

export interface ErrorHubMetadata {
  getAll?(key: string): unknown[];
  get?(key: string): unknown;
}

const MAX_STREAM_SNAPSHOT_DEPTH = 3;
const MAX_STREAM_SNAPSHOT_ENTRIES = 50;
const MAX_STREAM_SNAPSHOT_STRING_LENGTH = 2_048;
const MAX_STREAM_SNAPSHOT_NODES = 200;
const MAX_STREAM_TRACE_IDS = 20;
export const STREAM_RATE_LIMIT_METRICS = {
  limit: 'invest.sdk.stream.ratelimit.limit',
  remaining: 'invest.sdk.stream.ratelimit.remaining',
  reset: 'invest.sdk.stream.ratelimit.reset',
} as const;
export const STREAM_TRUNCATED_VALUE = '[Truncated]';
const STREAM_MAX_DEPTH_VALUE = '[MaxDepth]';

export type StreamContext = {
  startedAt: string;
  startTime: number;
  lastMessage?: unknown;
  traceIds: string[];
  traceIdSet: Set<string>;
  rateLimits: Partial<Record<keyof typeof STREAM_RATE_LIMIT_METRICS, number>>;
  finalized: boolean;
};

export type BoundedSnapshot = {
  value: unknown;
  traceIds: string[];
};

export type StreamDisconnectReason =
  | 'grpc_error'
  | 'error'
  | 'aborted'
  | 'completed'
  | 'consumer_close';

export type StreamTermination = {
  reason: StreamDisconnectReason;
  endedAt: string;
  code?: number;
  durationSeconds: number;
  hadError: boolean;
  reportableError: boolean;
};

export type StreamMetric = {
  name: string;
  type: 'counter' | 'distribution' | 'gauge';
  value: number;
  attributes: Record<string, string | number>;
  unit?: string;
};

function boundedString(value: string): string {
  return scrubString(value).slice(0, MAX_STREAM_SNAPSHOT_STRING_LENGTH);
}

export function addTraceId(traceIds: string[], traceIdSet: Set<string>, value: unknown): void {
  if (typeof value !== 'string') {
    return;
  }

  const traceId = boundedString(value.trim());
  if (!traceId) {
    return;
  }

  const existingIndex = traceIdSet.has(traceId) ? traceIds.indexOf(traceId) : -1;
  if (existingIndex >= 0) {
    traceIds.splice(existingIndex, 1);
  }
  traceIdSet.add(traceId);
  traceIds.push(traceId);
  const removed = traceIds.length > MAX_STREAM_TRACE_IDS ? traceIds.shift() : undefined;
  if (removed !== undefined && !traceIds.includes(removed)) {
    traceIdSet.delete(removed);
  }
}

function readProperty(value: object, key: string): unknown {
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return STREAM_TRUNCATED_VALUE;
  }
}

function isTraceIdKey(key: string): boolean {
  return key === 'trackingId' || key === 'traceId' || key === 'trace_id';
}

function isStatusKey(key?: string): boolean {
  const normalized = key?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    normalized === 'code' ||
    normalized === 'status' ||
    normalized === 'statuscode' ||
    normalized === 'grpcstatus' ||
    normalized?.endsWith('subscriptionstatus') === true ||
    normalized?.endsWith('executionreportstatus') === true
  );
}

function isSafeDiagnosticValue(value: unknown, key?: string): boolean {
  if (isTraceIdKey(key ?? '')) {
    return typeof value === 'string';
  }
  if (!isStatusKey(key)) {
    return false;
  }
  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && /^\d{1,9}$/.test(value))
  );
}

export function boundedStreamSnapshot(value: unknown): BoundedSnapshot {
  const ancestors = new WeakSet<object>();
  const traceIds: string[] = [];
  const traceIdSet = new Set<string>();
  let visitedNodes = 0;

  function visit(current: unknown, depth: number, key?: string): unknown {
    if (visitedNodes >= MAX_STREAM_SNAPSHOT_NODES) {
      return STREAM_TRUNCATED_VALUE;
    }
    visitedNodes += 1;

    if (depth <= MAX_STREAM_SNAPSHOT_DEPTH && isTraceIdKey(key ?? '')) {
      addTraceId(traceIds, traceIdSet, current);
    }

    if (typeof current === 'string') {
      return isSafeDiagnosticValue(current, key) ? boundedString(current) : FILTERED_VALUE;
    }
    if (typeof current === 'function') {
      return FILTERED_VALUE;
    }
    if (current === null || typeof current !== 'object') {
      return current === null || current === undefined || isSafeDiagnosticValue(current, key)
        ? current
        : FILTERED_VALUE;
    }
    if (isBinary(current)) {
      return FILTERED_VALUE;
    }
    if (ancestors.has(current)) {
      return CIRCULAR_VALUE;
    }
    if (depth >= MAX_STREAM_SNAPSHOT_DEPTH) {
      return STREAM_MAX_DEPTH_VALUE;
    }

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        const result: unknown[] = [];
        const entryCount = Math.min(current.length, MAX_STREAM_SNAPSHOT_ENTRIES);
        for (let index = 0; index < entryCount; index += 1) {
          result.push(visit(readProperty(current, String(index)), depth + 1));
        }
        return result;
      }

      const result: Record<string, unknown> = {};
      let entryCount = 0;
      for (const childKey of Object.keys(current)) {
        if (entryCount >= MAX_STREAM_SNAPSHOT_ENTRIES) {
          break;
        }
        entryCount += 1;
        const boundedKey = childKey.slice(0, MAX_STREAM_SNAPSHOT_STRING_LENGTH);
        result[boundedKey] = isSensitiveKey(childKey)
          ? FILTERED_VALUE
          : visit(readProperty(current, childKey), depth + 1, childKey);
      }
      return result;
    } catch {
      return STREAM_TRUNCATED_VALUE;
    } finally {
      ancestors.delete(current);
    }
  }

  return { value: visit(value, 0), traceIds };
}

export function metadataTrackingIds(metadata: ErrorHubMetadata): string[] {
  try {
    return readTrackingIds(metadata).filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function readTrackingIds(metadata: ErrorHubMetadata): unknown[] {
  if (typeof metadata.getAll === 'function') {
    return metadata.getAll?.('x-tracking-id') ?? [];
  }
  if (typeof metadata.get === 'function') {
    return [metadata.get('x-tracking-id')];
  }
  return [];
}

function readErrorHubMetadataNumber(metadata: ErrorHubMetadata, key: string): number | undefined {
  try {
    const values = metadata.getAll?.(key) ?? [];
    const value = values[values.length - 1];
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function collectRateLimits(metadata: ErrorHubMetadata, context: StreamContext): void {
  for (const name of Object.keys(STREAM_RATE_LIMIT_METRICS) as Array<
    keyof typeof STREAM_RATE_LIMIT_METRICS
  >) {
    const value = readErrorHubMetadataNumber(metadata, `x-ratelimit-${name}`);
    if (value === undefined) {
      continue;
    }
    context.rateLimits[name] = value;
  }
}

export function collectStreamMetadata(context: StreamContext, metadata: ErrorHubMetadata): void {
  collectRateLimits(metadata, context);
  for (const trackingId of metadataTrackingIds(metadata)) {
    addTraceId(context.traceIds, context.traceIdSet, trackingId);
  }
}

export function safeErrorProperty(error: unknown, key: string): unknown {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return undefined;
  }
  try {
    return (error as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

export function streamErrorCode(error: unknown): number | undefined {
  const code = safeErrorProperty(error, 'code');
  return typeof code === 'number' && Number.isFinite(code) ? code : undefined;
}

export function streamErrorDetails(error: unknown): unknown {
  return safeErrorProperty(error, 'details');
}

export function cloneErrorForCapture(error: unknown): Error {
  const message = safeErrorProperty(error, 'message');
  const cloned = new Error(
    typeof message === 'string' ? scrubString(message) : 'Non-Error exception'
  );
  const name = safeErrorProperty(error, 'name');
  if (typeof name === 'string') {
    cloned.name = name;
  }
  const stack = safeErrorProperty(error, 'stack');
  if (typeof stack === 'string') {
    cloned.stack = scrubString(stack);
  }
  return cloned;
}

export function isStreamClientError(error: unknown): boolean {
  return safeErrorProperty(error, 'name') === 'ClientError';
}

export function createStreamContext(): StreamContext {
  return {
    startedAt: new Date().toISOString(),
    startTime: performance.now(),
    traceIds: [],
    traceIdSet: new Set(),
    rateLimits: {},
    finalized: false,
  };
}

export function collectStreamResponse(context: StreamContext, response: unknown): void {
  let snapshot: BoundedSnapshot;
  try {
    snapshot = boundedStreamSnapshot(response);
  } catch {
    snapshot = { value: STREAM_TRUNCATED_VALUE, traceIds: [] };
  }

  context.lastMessage = snapshot.value;
  for (const traceId of snapshot.traceIds) {
    addTraceId(context.traceIds, context.traceIdSet, traceId);
  }
}

export function isAbortSignalError(error: unknown): boolean {
  const name = safeErrorProperty(error, 'name');
  return name === 'AbortError' || name === 'CanceledError' || name === 'CancelledError';
}

export function streamDurationSeconds(context: StreamContext): number {
  const duration = Math.max(0, (performance.now() - context.startTime) / 1_000);
  return Number.isFinite(duration) ? duration : 0;
}

export function resolveStreamTermination(
  context: StreamContext,
  completed: boolean,
  hadError: boolean,
  signalAborted: boolean,
  error: unknown
): StreamTermination {
  const aborted = signalAborted || isAbortSignalError(error);
  return {
    reason: streamDisconnectReason(completed, hadError, aborted, error),
    endedAt: new Date().toISOString(),
    code: streamErrorCode(error),
    durationSeconds: streamDurationSeconds(context),
    hadError: hadError && !aborted,
    reportableError: hadError && !aborted ? streamErrorReportable(error, context) : false,
  };
}

function streamErrorReportable(error: unknown, context: StreamContext): boolean {
  try {
    return isErrorHubErrorReportable(error, streamErrorDetails(error), context.lastMessage);
  } catch {
    return true;
  }
}

function streamDisconnectReason(
  completed: boolean,
  hadError: boolean,
  aborted: boolean,
  error: unknown
): StreamDisconnectReason {
  if (hadError && !aborted) {
    return isStreamClientError(error) ? 'grpc_error' : 'error';
  }
  if (aborted) {
    return 'aborted';
  }
  return completed ? 'completed' : 'consumer_close';
}

export function streamEventExtras(
  context: StreamContext,
  path: string,
  termination: StreamTermination,
  error?: unknown
): Record<string, unknown> {
  const details = termination.hadError ? streamErrorDetails(error) : undefined;
  return {
    started_at: context.startedAt,
    ended_at: termination.endedAt,
    duration_seconds: termination.durationSeconds,
    path,
    disconnect_reason: termination.reason,
    trace_ids: [...context.traceIds],
    last_message: context.lastMessage,
    ...(details === undefined ? {} : { details: scrubErrorHubValue(details) }),
    ...(termination.code === undefined ? {} : { grpc_code: termination.code }),
  };
}

export function streamMetrics(
  context: StreamContext,
  path: string,
  termination: StreamTermination
): StreamMetric[] {
  const attributes = {
    'rpc.method': scrubString(path).slice(0, MAX_METRIC_ATTRIBUTE_STRING_LENGTH),
    'stream.disconnect_reason': termination.reason.slice(0, MAX_METRIC_ATTRIBUTE_STRING_LENGTH),
    ...(termination.code === undefined ? {} : { 'rpc.grpc.status_code': termination.code }),
  };
  const metrics: StreamMetric[] = [
    {
      name: STREAM_COUNT_METRIC,
      type: 'counter',
      value: 1,
      attributes,
    },
    {
      name: STREAM_DURATION_METRIC,
      type: 'distribution',
      value: termination.durationSeconds,
      attributes,
      unit: 'second',
    },
  ];
  if (termination.reportableError) {
    metrics.push({
      name: STREAM_ERROR_METRIC,
      type: 'counter',
      value: 1,
      attributes,
    });
  }
  for (const [name, value] of Object.entries(context.rateLimits)) {
    metrics.push({
      name: STREAM_RATE_LIMIT_METRICS[name as keyof typeof STREAM_RATE_LIMIT_METRICS],
      type: 'gauge',
      value,
      attributes,
    });
  }
  return metrics;
}
