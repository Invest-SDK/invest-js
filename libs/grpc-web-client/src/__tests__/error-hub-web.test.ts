import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BrowserClient, getCurrentScope, getGlobalScope, getIsolationScope } from '@sentry/browser';
import { createStreamContext, resolveStreamTermination } from '@ttech-pub/invest-core';
import { ClientError, Status } from 'nice-grpc-web';
import { createErrorHubReporter } from '../error-hub-web';

test('Web events stay private and stream metrics flush on the normal timer', async (t) => {
  const bodies: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    bodies.push(String(options.body));
    return new Response('', { status: 200 });
  });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalInit = BrowserClient.prototype.init;
  const init = t.mock.method(BrowserClient.prototype, 'init', function (this: BrowserClient) {
    this.getOptions().sampleRate = 1;
    originalInit.call(this);
  });
  const isolationScope = getIsolationScope();
  const lastEventId = isolationScope.lastEventId();
  let hostProcessorCalls = 0;
  for (const scope of [getGlobalScope(), isolationScope, getCurrentScope()]) {
    const data = scope.getScopeData();
    t.mock.method(scope, 'getScopeData', () => ({
      ...data,
      extra: { hostData: 'host-extra-secret' },
      tags: { tenant: 'host-tag-secret' },
      attachments: [{ filename: 'host.txt', data: 'host-attachment-secret' }],
      eventProcessors: [
        () => {
          hostProcessorCalls += 1;
          return null;
        },
      ],
    }));
  }
  const reporter = createErrorHubReporter('https://example.test');
  const client = init.mock.calls[0].this as BrowserClient;
  try {
    const completed = createStreamContext();
    reporter.capture(
      completed,
      '/service/stream',
      resolveStreamTermination(completed, true, false, false, undefined),
      undefined
    );
    const failed = createStreamContext();
    const error = new ClientError(
      '/service/stream',
      Status.UNAVAILABLE,
      'connect ECONNREFUSED 127.0.0.1:54321 https://example.test/?token=web-query-secret'
    );
    reporter.capture(
      failed,
      '/service/stream',
      resolveStreamTermination(failed, false, true, false, error),
      error
    );
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.equal(bodies.length, 2);
    assert.ok(bodies.some((body) => body.includes('ECONNREFUSED 127.0.0.1:54321')));
    assert.equal(
      bodies.some((body) => body.includes('web-query-secret')),
      false
    );
    assert.equal(hostProcessorCalls, 0);
    assert.equal(isolationScope.lastEventId(), lastEventId);
    assert.equal(
      bodies.some((body) => body.includes('host-') || body.includes('"type":"attachment"')),
      false
    );
    t.mock.timers.tick(5_000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const metricBodies = bodies.filter((body) => body.includes('"type":"trace_metric"'));
    assert.equal(
      metricBodies.length,
      1,
      'metrics must flush without client.flush() or hiding the tab'
    );
    const metrics = JSON.parse(metricBodies[0].split('\n')[2]).items as Array<{
      name: string;
      value: number;
    }>;
    assert.equal(
      metrics.filter((metric) => metric.name === 'invest.sdk.stream.connections').length,
      2
    );
    assert.equal(metrics.find((metric) => metric.name === 'invest.sdk.stream.errors')?.value, 1);
  } finally {
    t.mock.timers.reset();
    await client.close();
  }
});
