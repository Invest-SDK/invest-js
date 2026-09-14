import type { NodeClient, Scope } from '@sentry/node';
import type { CallOptions, ClientMiddleware, ClientMiddlewareCall, Metadata } from 'nice-grpc';
import { createErrorHubScope } from './error-hub-client';
import {
  STREAM_CLOSED_MESSAGE,
  cloneErrorForCapture,
  collectStreamMetadata,
  collectStreamResponse,
  createStreamContext,
  resolveStreamTermination,
  streamEventExtras,
  type StreamContext,
  type StreamTermination,
} from '@ttech-pub/invest-core';
import { safeCaptureMetrics } from './error-hub-stream-metrics';

function safeCaptureMessage(
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
    scope.setExtras(streamEventExtras(context, path, termination));
    client.captureMessage(STREAM_CLOSED_MESSAGE, 'info', undefined, scope);
  } catch {
    return;
  }
}

function safeCaptureException(
  client: NodeClient,
  scope: Scope | undefined,
  context: StreamContext,
  path: string,
  error: unknown,
  termination: StreamTermination
): void {
  if (!scope || !termination.reportableError) {
    return;
  }

  try {
    scope.setExtras(streamEventExtras(context, path, termination, error));

    const capturedError = cloneErrorForCapture(error);
    client.captureException(capturedError, { originalException: capturedError }, scope);
  } catch {
    return;
  }
}

function composeStreamOptions(options: CallOptions, context: StreamContext): CallOptions {
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

function finalizeStream(
  client: NodeClient,
  scope: Scope | undefined,
  context: StreamContext,
  path: string,
  options: CallOptions,
  completed: boolean,
  hadStreamError: boolean,
  streamError: unknown
): void {
  if (context.finalized) {
    return;
  }
  context.finalized = true;
  const termination = resolveStreamTermination(
    context,
    completed,
    hadStreamError,
    options.signal?.aborted === true,
    streamError
  );

  safeCaptureMetrics(client, scope, context, path, termination);
  if (termination.hadError) {
    safeCaptureException(client, scope, context, path, streamError, termination);
    return;
  }
  safeCaptureMessage(client, scope, context, path, termination);
}

export function createErrorHubMiddleware(client: NodeClient): ClientMiddleware {
  return async function* <RequestType, ResponseType>(
    call: ClientMiddlewareCall<RequestType, ResponseType>,
    options: CallOptions
  ) {
    if (!call.method.responseStream) {
      return yield* call.next(call.request, options);
    }

    const context = createStreamContext();
    let scope: Scope | undefined;
    try {
      scope = createErrorHubScope(client);
    } catch {
      return yield* call.next(call.request, options);
    }

    let completed = false;
    let streamError: unknown;
    let hadStreamError = false;
    const streamOptions = composeStreamOptions(options, context);

    try {
      for await (const response of call.next(call.request, streamOptions)) {
        collectStreamResponse(context, response);
        yield response;
      }
      completed = true;
    } catch (error) {
      hadStreamError = true;
      streamError = error;
      throw error;
    } finally {
      finalizeStream(
        client,
        scope,
        context,
        call.method.path,
        options,
        completed,
        hadStreamError,
        streamError
      );
    }
  };
}
