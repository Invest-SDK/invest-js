export function singleFlight<T>(callback: () => Promise<T>): () => Promise<T> {
  let cachedValue: T;
  let hasCachedValue = false;
  let pendingCall: Promise<T> | undefined;

  return () => {
    if (hasCachedValue) {
      return Promise.resolve(cachedValue);
    }

    if (!pendingCall) {
      pendingCall = Promise.resolve()
        .then(callback)
        .then((value) => {
          cachedValue = value;
          hasCachedValue = true;
          return value;
        })
        .finally(() => {
          pendingCall = undefined;
        });
    }

    return pendingCall;
  };
}
