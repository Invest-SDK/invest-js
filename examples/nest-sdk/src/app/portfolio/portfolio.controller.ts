import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  GetAccountsResponse,
  OperationsResponse,
  PositionsResponse,
} from '@ttech-pub/grpc-node-client';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly _portfolioService: PortfolioService) {}

  @Get('accounts')
  getAccounts(): Promise<GetAccountsResponse> {
    return this._portfolioService.getAccounts();
  }

  @Get('accounts/:accountId/positions')
  getPositionsByAccount(@Param('accountId') accountId: string): Promise<PositionsResponse> {
    return this._portfolioService.getPositionsByAccount(accountId);
  }

  @Get('accounts/:accountId/positions/:figi/today_executed')
  getOperationsByAccountAndFigi(
    @Param('accountId') accountId: string,
    @Param('figi') figi: string
  ): Promise<OperationsResponse> {
    return this._portfolioService.getTodayExecutedOperationsByAccountAndFigi(accountId, figi);
  }
}
