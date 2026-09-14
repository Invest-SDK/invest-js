import { after, before, describe, mock, test } from 'node:test';
import assert from 'node:assert';
import { NodeApiClient } from '@ttech-pub/grpc-node-client';
import { InvestNodeSDK } from '../instance';
import { APIService, BaseCommand } from '../shared';

class MockCommand extends BaseCommand<void, string> {
  constructor() {
    super();
  }

  public override call(_client: APIService) {
    return 'hello';
  }
}

class ClientCommand extends BaseCommand<void, APIService> {
  public override call(client: APIService): APIService {
    return client;
  }
}

describe('Instance', () => {
  before(() => {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  });
  after(() => mock.restoreAll());

  test('InvestNodeSDK должен успешно создаться с валидным токеном', () => {
    const options = { token: 'valid-token', telemetry: 'enabled' } as const;
    const sdk = new InvestNodeSDK(options);
    assert.ok(sdk instanceof InvestNodeSDK);
    assert.ok(sdk.send(new ClientCommand()) instanceof NodeApiClient);
  });

  test('InvestNodeSDK должен выбросить EmptyTokenError при пустом токене', () => {
    const invalidOptions = [{ token: null }, { token: undefined }, { token: '' }, {}];

    for (const options of invalidOptions) {
      assert.throws(
        //@ts-expect-error allow for test
        () => new InvestNodeSDK(options),
        { name: 'EmptyTokenError', message: 'Token is empty' }
      );
    }
  });

  test('InvestNodeSDK.send должен вызвать команду с клиентом', () => {
    const options = { token: 'valid-token' };
    const sdk = new InvestNodeSDK(options);

    const expectedResult = 'hello';
    const command = new MockCommand();

    const result = sdk.send(command);
    assert.deepStrictEqual(result, expectedResult);
  });

  test('InvestNodeSDK.create должен успешно создаться с валидным токеном', async () => {
    const sdk = await InvestNodeSDK.create({ token: 'valid-token' });
    assert.ok(sdk instanceof InvestNodeSDK);
  });

  test('InvestNodeSDK.create passes telemetry once and reuses created client', async () => {
    const originalCreate = NodeApiClient.create;
    const expectedClient = {} as NodeApiClient;
    const options = { token: 'valid-token', telemetry: 'disabled' } as const;
    let calls = 0;
    let received: unknown;
    NodeApiClient.create = async (candidate) => {
      calls += 1;
      received = candidate;
      return expectedClient;
    };
    try {
      const sdk = await InvestNodeSDK.create(options);
      assert.equal(calls, 1);
      assert.strictEqual(received, options);
      assert.strictEqual(sdk.send(new ClientCommand()), expectedClient);
    } finally {
      NodeApiClient.create = originalCreate;
    }
  });
});
