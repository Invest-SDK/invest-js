import assert from 'node:assert/strict';
import test from 'node:test';
import { singleFlight } from '../single-flight';

test('singleFlight shares concurrent calls and caches the result', async () => {
  let calls = 0;
  const getValue = singleFlight(async () => {
    calls += 1;
    return { value: 'cached' };
  });

  const [first, second] = await Promise.all([getValue(), getValue()]);

  assert.strictEqual(first, second);
  assert.strictEqual(await getValue(), first);
  assert.equal(calls, 1);
});

test('singleFlight retries after a failed call', async () => {
  let calls = 0;
  const getValue = singleFlight(async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('temporary failure');
    }

    return 'ok';
  });

  await assert.rejects(getValue(), { message: 'temporary failure' });
  assert.equal(await getValue(), 'ok');
  assert.equal(calls, 2);
});
