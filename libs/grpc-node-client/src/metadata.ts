import { Metadata, type MetadataInit } from 'nice-grpc';

export function createMetadata(metadata: MetadataInit | undefined, token: string) {
  return Metadata(metadata)
    .set('Authorization', `Bearer ${token}`)
    .set('x-app-name', 't-invest-js-node-sdk');
}
