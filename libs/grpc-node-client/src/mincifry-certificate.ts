import { unzipSync } from 'fflate';
import { singleFlight } from './shared/single-flight';

export const MINCIFRY_CERTIFICATE_URL = 'https://gu-st.ru/content/lending/russiantrustedca.zip';

export const downloadMincifryCertificate = singleFlight(async (): Promise<Buffer> => {
  const response = await fetch(MINCIFRY_CERTIFICATE_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download Mincifry certificate: ${response.status} ${response.statusText}`
    );
  }

  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const certificate = archive['russiantrustedca.pem'];

  if (!certificate?.length) {
    throw new Error('Mincifry certificate archive does not contain russiantrustedca.pem');
  }

  return Buffer.from(certificate);
});
