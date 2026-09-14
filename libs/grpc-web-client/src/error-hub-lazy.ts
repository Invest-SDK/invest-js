import type { ClientMiddleware, ClientMiddlewareCall, CallOptions, Metadata } from 'nice-grpc-web';
import {
  collectStreamMetadata,
  collectStreamResponse,
  createStreamContext,
  resolveStreamTermination,
  type StreamTermination,
} from '@ttech-pub/invest-core';

type ErrorHubReporter = {
  capture(
    context: ReturnType<typeof createStreamContext>,
    path: string,
    termination: StreamTermination,
    error: unknown
  ): void;
};

const reporters = new Map<string, Promise<ErrorHubReporter | undefined>>();
let importReporter = () => import('./error-hub-web');

function loadReporter(target: string): Promise<ErrorHubReporter | undefined> {
  const reporter = reporters.get(target);
  if (reporter) {
    return reporter;
  }

  const loading = importReporter()
    .then(({ createErrorHubReporter }) => createErrorHubReporter(target))
    .catch(() => undefined);
  reporters.set(target, loading);
  return loading;
}

export function setErrorHubReporterImporterForTest(importer?: typeof importReporter): void {
  reporters.clear();
  importReporter = importer ?? (() => import('./error-hub-web'));
}

function streamOptions(
  options: CallOptions,
  context: ReturnType<typeof createStreamContext>
): CallOptions {
  return {
    ...options,
    onHeader: (metadata: Metadata) => {
      collectStreamMetadata(context, metadata);
      options.onHeader?.(metadata);
    },
    onTrailer: (metadata: Metadata) => {
      collectStreamMetadata(context, metadata);
      options.onTrailer?.(metadata);
    },
  };
}

export function createLazyErrorHubMiddleware(target: string): ClientMiddleware {
  return async function* <Request, Response>(
    call: ClientMiddlewareCall<Request, Response>,
    options: CallOptions
  ) {
    if (!call.method.responseStream) {
      return yield* call.next(call.request, options);
    }

    const context = createStreamContext();
    const reporter = loadReporter(target);
    let completed = false;
    let hadError = false;
    let streamError: unknown;

    try {
      for await (const response of call.next(call.request, streamOptions(options, context))) {
        collectStreamResponse(context, response);
        yield response;
      }
      completed = true;
    } catch (error) {
      hadError = true;
      streamError = error;
      throw error;
    } finally {
      const termination = resolveStreamTermination(
        context,
        completed,
        hadError,
        options.signal?.aborted === true,
        streamError
      );
      reporter.then((loaded) =>
        loaded?.capture(context, call.method.path, termination, streamError)
      );
    }
  };
}
