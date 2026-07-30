import { BaseError } from '@ttech-pub/invest-core';

export class EmptyURLError extends BaseError {
  override code = 'EmptyURL';
}
