import { OperationsRequest, OperationsResponse } from '@ttech-pub/grpc-web-client';
import { APIService, BaseCommand } from '../../shared';

export { OperationState } from '@ttech-pub/grpc-web-client';

export interface GetOperationsInput extends OperationsRequest {}

export interface GetOperationsOutput extends OperationsResponse {}

export class GetOperationsCommand extends BaseCommand<
  GetOperationsInput,
  Promise<GetOperationsOutput>
> {
  public override call(client: APIService): Promise<GetOperationsOutput> {
    return client.operations.getOperations(this.options);
  }
}
