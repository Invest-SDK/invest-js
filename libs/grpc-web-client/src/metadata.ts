import { Metadata, type MetadataInit } from 'nice-grpc-web';

export function createMetadata(metadata: MetadataInit | undefined, token: string) {
  return Metadata(metadata)
    .set('Authorization', `Bearer ${token}`)
    .set('x-app-name', 't-invest-js-web-sdk');
}
