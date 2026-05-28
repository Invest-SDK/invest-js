import { Inject } from '@nestjs/common';
import { INVEST_SDK_CLIENT } from '../invest-sdk';
import {
  GetAccountsCommand,
  GetOperationsCommand,
  GetPositionsCommand,
  OperationState,
} from '@ttech-pub/invest-sdk-node';
import type {
  GetAccountsResponse,
  OperationsResponse,
  PositionsResponse,
} from '@ttech-pub/grpc-node-client';
import type { InvestNodeSDK } from '@ttech-pub/invest-sdk-node';
import { startOfDay } from 'date-fns';

export class PortfolioService {
  constructor(
    @Inject(INVEST_SDK_CLIENT)
    private readonly _investSdk: InvestNodeSDK
  ) {}

  getAccounts(): Promise<GetAccountsResponse> {
    const command = new GetAccountsCommand({});

    return this._investSdk.send(command);
  }

  getPositionsByAccount(accountId: string): Promise<PositionsResponse> {
    const command = new GetPositionsCommand({ accountId });
    return this._investSdk.send(command);
  }

  getTodayExecutedOperationsByAccountAndFigi(
    accountId: string,
    figi: string
  ): Promise<OperationsResponse> {
    const command = new GetOperationsCommand({
      accountId,
      figi,
      from: startOfDay(new Date()),
      to: new Date(),
      state: OperationState.OPERATION_STATE_EXECUTED,
    });

    return this._investSdk.send(command);
  }
}
