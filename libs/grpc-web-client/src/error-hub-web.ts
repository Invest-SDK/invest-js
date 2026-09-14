import { BrowserClient, Scope, defaultStackParser, makeFetchTransport } from '@sentry/browser';
import type { ErrorEvent, Event, EventHint } from '@sentry/core/browser';
import { _INTERNAL_captureSerializedMetric, normalize } from '@sentry/core/browser';
import type {
  MetricType,
  SerializedMetric,
  SerializedMetricAttributeValue,
} from '@sentry/core/browser';
import packageMetadata from '../package.json';
import {
  DEFAULT_MAX_BREADCRUMBS,
  DEFAULT_NORMALIZE_DEPTH,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_TRACES_SAMPLE_RATE,
  STREAM_CLOSED_MESSAGE,
  cloneErrorForCapture,
  isErrorHubErrorReportable,
  resolveErrorHubDsn,
  resolveErrorHubEnvironment,
  scrubErrorHubValue,
  streamEventExtras,
  streamMetrics,
  type StreamContext,
  type StreamTermination,
} from '@ttech-pub/invest-core';

function beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const original = hint.originalException;
  const details = event.extra?.['details'];
  const lastMessage = event.extra?.['last_message'];
  const lifecycle = event.message === STREAM_CLOSED_MESSAGE && original === undefined;
  if (!lifecycle && !isErrorHubErrorReportable(original, details, lastMessage, event)) {
    return null;
  }
  return scrubErrorHubValue(event) as ErrorEvent;
}

class ErrorHubBrowserClient extends BrowserClient {
  protected override _captureEvent(event: Event, hint: EventHint = {}, scope = new Scope()) {
    return super._captureEvent(event, hint, scope, new Scope());
  }

  protected override _prepareEvent(
    event: Event,
    hint: EventHint,
    scope: Scope
  ): PromiseLike<Event> {
    // Do not merge the host's global/isolation scope or run its event processors.
    const options = this.getOptions();
    hint.attachments = [];
    return Promise.resolve({
      ...event,
      event_id: event.event_id ?? hint.event_id,
      timestamp: event.timestamp ?? Date.now() / 1_000,
      release: options.release,
      environment: options.environment,
      platform: 'javascript',
      extra: normalize({ ...scope.getScopeData().extra, ...event.extra }, options.normalizeDepth),
    });
  }
}

function createClient(target: string): BrowserClient {
  const client = new ErrorHubBrowserClient({
    dsn: resolveErrorHubDsn() as unknown as string,
    release: `${packageMetadata.name}@${packageMetadata.version}`,
    environment: resolveErrorHubEnvironment(target),
    sampleRate: DEFAULT_SAMPLE_RATE,
    tracesSampleRate: DEFAULT_TRACES_SAMPLE_RATE,
    maxBreadcrumbs: DEFAULT_MAX_BREADCRUMBS,
    attachStacktrace: true,
    normalizeDepth: DEFAULT_NORMALIZE_DEPTH,
    sendDefaultPii: false,
    integrations: [],
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    beforeSend,
  });
  client.init();
  return client;
}

function metricAttribute(value: string | number): SerializedMetricAttributeValue {
  if (typeof value === 'string') {
    return { type: 'string', value };
  }
  return Number.isInteger(value) ? { type: 'integer', value } : { type: 'double', value };
}

function captureMetric(
  client: BrowserClient,
  name: string,
  type: MetricType,
  value: number,
  attributes: Record<string, string | number>,
  unit?: string
): void {
  const serialized: NonNullable<SerializedMetric['attributes']> = {};
  for (const [key, attribute] of Object.entries(attributes)) {
    serialized[key] = metricAttribute(attribute);
  }
  _INTERNAL_captureSerializedMetric(client, {
    timestamp: Date.now() / 1_000,
    trace_id: '',
    name,
    type,
    unit,
    value,
    attributes: serialized,
  });
  client.emit('afterCaptureMetric', { name, type, unit, value, attributes });
}

function capture(
  client: BrowserClient,
  context: StreamContext,
  path: string,
  termination: StreamTermination,
  error: unknown
): void {
  if (context.finalized) {
    return;
  }
  context.finalized = true;

  const scope = new Scope();
  scope.setClient(client);
  scope.setExtras(streamEventExtras(context, path, termination, error));
  for (const metric of streamMetrics(context, path, termination)) {
    captureMetric(client, metric.name, metric.type, metric.value, metric.attributes, metric.unit);
  }

  if (termination.reportableError) {
    const capturedError = cloneErrorForCapture(error);
    client.captureException(capturedError, { originalException: capturedError }, scope);
    return;
  }
  if (!termination.hadError) {
    client.captureMessage(STREAM_CLOSED_MESSAGE, 'info', undefined, scope);
  }
}

export function createErrorHubReporter(target: string) {
  const client = createClient(target);
  return {
    capture: (
      context: StreamContext,
      path: string,
      termination: StreamTermination,
      error: unknown
    ) => {
      try {
        capture(client, context, path, termination, error);
      } catch {
        return;
      }
    },
  };
}
