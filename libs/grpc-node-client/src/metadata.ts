import { Metadata, type MetadataInit } from 'nice-grpc';

export function createMetadata(
  configMetadata: MetadataInit | undefined,
  callMetadata: MetadataInit | undefined,
  token: string
) {
  const metadata = Metadata(configMetadata);

  for (const [key, value] of Metadata(callMetadata)) {
    metadata.set(key, value);
  }

  return metadata.set('Authorization', `Bearer ${token}`).set('x-app-name', 't-invest-js-node-sdk');
}
