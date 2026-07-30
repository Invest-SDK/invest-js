import { GetBondCouponsRequest, GetBondCouponsResponse } from '@ttech-pub/grpc-node-client';
import { APIService, BaseCommand } from '../../shared';

export interface GetBondCouponsInput extends GetBondCouponsRequest {}

export interface GetBondCouponsOutput extends GetBondCouponsResponse {}

export class GetBondCouponsCommand extends BaseCommand<
  GetBondCouponsInput,
  Promise<GetBondCouponsOutput>
> {
  public override call(client: APIService): Promise<GetBondCouponsOutput> {
    return client.instruments.getBondCoupons(this.options);
  }
}
