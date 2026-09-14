import { _INTERNAL_captureSerializedMetric } from '@sentry/core';
import type {
  Metric,
  MetricType,
  SerializedMetric,
  SerializedMetricAttributeValue,
} from '@sentry/core';
import type { NodeClient, Scope } from '@sentry/node';
import {
  MAX_METRIC_ATTRIBUTE_STRING_LENGTH,
  streamMetrics,
  scrubString,
  type StreamContext,
  type StreamTermination,
} from '@ttech-pub/invest-core';

export function safeCaptureMetrics(
  client: NodeClient,
  scope: Scope | undefined,
  context: StreamContext,
  path: string,
  termination: StreamTermination
): void {
  if (!scope) {
    return;
  }

  try {
    for (const metric of streamMetrics(context, path, termination)) {
      captureMetric(client, metric.name, metric.type, metric.value, metric.attributes, metric.unit);
    }
  } catch {
    return;
  }
}

function captureMetric(
  client: NodeClient,
  name: string,
  type: MetricType,
  value: number,
  attributes: Record<string, string | number>,
  unit?: string
): void {
  const options = client.getOptions();
  const rawAttributes: Record<string, string | number> = { ...attributes };
  if (typeof options.release === 'string') {
    rawAttributes['sentry.release'] = scrubString(options.release).slice(
      0,
      MAX_METRIC_ATTRIBUTE_STRING_LENGTH
    );
  }
  if (typeof options.environment === 'string') {
    rawAttributes['sentry.environment'] = scrubString(options.environment).slice(
      0,
      MAX_METRIC_ATTRIBUTE_STRING_LENGTH
    );
  }

  const serializedAttributes: NonNullable<SerializedMetric['attributes']> = {};
  for (const [key, attributeValue] of Object.entries(rawAttributes)) {
    serializedAttributes[key] = serializeMetricAttribute(attributeValue);
  }
  _INTERNAL_captureSerializedMetric(client, {
    timestamp: Date.now() / 1_000,
    trace_id: '',
    name,
    type,
    unit,
    value,
    attributes: serializedAttributes,
  });

  const metric: Metric = { name, type, unit, value, attributes: rawAttributes };
  client.emit('afterCaptureMetric', metric);
}

function serializeMetricAttribute(value: string | number): SerializedMetricAttributeValue {
  if (typeof value === 'string') {
    return { type: 'string', value };
  }
  return Number.isInteger(value) ? { type: 'integer', value } : { type: 'double', value };
}
