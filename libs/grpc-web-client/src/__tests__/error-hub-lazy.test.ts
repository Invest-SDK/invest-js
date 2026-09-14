import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { type StreamTermination, streamEventExtras } from '@ttech-pub/invest-core';
import {
  createLazyErrorHubMiddleware,
  setErrorHubReporterImporterForTest,
} from '../error-hub-lazy';

afterEach(() => setErrorHubReporterImporterForTest());

test('loads ErrorHub only when a response stream starts', async () => {
  let imports = 0;
  let captures = 0;
  setErrorHubReporterImporterForTest(async () => {
    imports += 1;
    return {
      createErrorHubReporter: () => ({
        capture: () => {
          captures += 1;
        },
      }),
    };
  });

  const middleware = createLazyErrorHubMiddleware('https://example.test');
  const unaryCall = {
    method: { path: '/service/unary', requestStream: false, responseStream: false, options: {} },
    request: {},
    next: async function* () {
      yield { value: true };
    },
  } as unknown as Parameters<typeof middleware>[0];
  const unaryResponses = [];
  for await (const response of middleware(unaryCall, {})) unaryResponses.push(response);
  assert.deepEqual(unaryResponses, [{ value: true }]);
  assert.equal(imports, 0);

  const call = {
    method: { path: '/service/stream', requestStream: false, responseStream: true, options: {} },
    request: {},
    next: async function* () {
      yield { trackingId: 'trace-id' };
    },
  } as unknown as Parameters<typeof middleware>[0];

  assert.equal(imports, 0);
  const responses = [];
  for await (const response of middleware(call, {})) {
    responses.push(response);
  }

  await Promise.resolve();
  assert.equal(imports, 1);
  assert.equal(captures, 1);
  assert.deepEqual(responses, [{ trackingId: 'trace-id' }]);
});

test('freezes stream failure and end time before the reporter finishes loading', async (t) => {
  const endedAt = new Date('2026-09-14T12:00:00Z');
  t.mock.timers.enable({ apis: ['Date'], now: endedAt.getTime() });
  let monotonicTime = 0;
  t.mock.method(performance, 'now', () => monotonicTime);
  type ReporterModule = Awaited<
    ReturnType<NonNullable<Parameters<typeof setErrorHubReporterImporterForTest>[0]>>
  >;
  let finishLoading!: (module: ReporterModule) => void;
  const loading = new Promise<ReporterModule>((resolve) => {
    finishLoading = resolve;
  });
  setErrorHubReporterImporterForTest(() => loading);
  const middleware = createLazyErrorHubMiddleware('https://example.test');
  const controller = new AbortController();
  const error = new Error('transport failed');
  const call = {
    method: { path: '/service/stream', requestStream: false, responseStream: true, options: {} },
    request: {},
    next: async function* () {
      yield { traceId: 'failed-stream' };
      monotonicTime = 1;
      throw error;
    },
  } as unknown as Parameters<typeof middleware>[0];
  await assert.rejects(
    async () => {
      for await (const response of middleware(call, { signal: controller.signal })) {
        assert.deepEqual(response, { traceId: 'failed-stream' });
      }
    },
    (candidate) => candidate === error
  );

  controller.abort();
  monotonicTime = 10_001;
  t.mock.timers.tick(10_000);
  let captured!: { termination: StreamTermination; extras: Record<string, unknown> };
  let captureFinished!: () => void;
  const capture = new Promise<void>((resolve) => {
    captureFinished = resolve;
  });
  finishLoading({
    createErrorHubReporter: () => ({
      capture: (context, path, termination, capturedError) => {
        assert.strictEqual(capturedError, error);
        captured = {
          termination,
          extras: streamEventExtras(context, path, termination, capturedError),
        };
        captureFinished();
      },
    }),
  });
  await capture;

  assert.equal(captured.termination.reason, 'error');
  assert.equal(captured.termination.reportableError, true);
  assert.equal(captured.termination.durationSeconds, 0.001);
  assert.equal(captured.extras['ended_at'], endedAt.toISOString());
});
