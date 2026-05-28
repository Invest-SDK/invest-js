import { PostOrderRequest, PostOrderResponse } from '@ttech-pub/grpc-node-client';
import { Decimal } from '@ttech-pub/invest-core';
import { APIService, BaseCommand } from '../../shared';

export interface PostSandboxOrderInput extends Omit<PostOrderRequest, 'price'> {
  price?: Decimal;
}

export interface PostSandboxOrderOutput extends PostOrderResponse {}

export class PostSandboxOrderCommand extends BaseCommand<
  PostSandboxOrderInput,
  Promise<PostSandboxOrderOutput>
> {
  public override call(client: APIService): Promise<PostSandboxOrderOutput> {
    const { price, ...otherOptions } = this.options;

    return client.sandbox.postSandboxOrder({
      ...otherOptions,
      ...(price ? { price: price.toPrimitives() } : {}),
    });
  }
}
