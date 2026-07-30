import { BaseError } from '@ttech-pub/invest-core';

export class EmptyTokenError extends BaseError {
  override code = 'EmptyToken';
}
