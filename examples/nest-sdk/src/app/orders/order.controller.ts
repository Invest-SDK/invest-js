import { Controller, Get, Param, Query, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PostOrderResponse } from '@ttech-pub/grpc-node-client';
import type { Observable } from 'rxjs';
import { OrdersService } from './orders.service';

@ApiTags('order')
@Controller('order')
export class OrderController {
  constructor(private readonly _orderService: OrdersService) {}

  @Get('buy/:instrumentId')
  async buyInstrument(
    @Param('instrumentId') instrumentId: string,
    @Query('quantity') quantity: number,
    @Query('accountId') accountId: string
  ): Promise<PostOrderResponse> {
    return this._orderService.buyInstrument(accountId, instrumentId, quantity);
  }

  @Sse('stream-active-ids/:accountId')
  async getOrderIdsActive(@Param('accountId') accountId: string): Promise<Observable<string>> {
    return this._orderService.getActiveOrdersStream(accountId);
  }

  @Sse('stream-success-ids/:accountId')
  async getOrderIdsSuccess(@Param('accountId') accountId: string): Promise<Observable<string>> {
    return this._orderService.getSuccessOrdersStream(accountId);
  }
}
