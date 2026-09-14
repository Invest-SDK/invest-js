import { readFileSync } from 'node:fs';
import * as tls from 'node:tls';
import { makePromiseBuffer, type Transport, type TransportMakeRequestResponse } from '@sentry/core';
import { makeNodeTransport } from '@sentry/node';
import { downloadMincifryCertificate } from './mincifry-certificate';

function defaultCertificates(): readonly string[] {
  if (tls.getCACertificates) {
    return tls.getCACertificates();
  }

  // Node 22 before getCACertificates: retain explicitly configured extra roots.
  const extraCertificates = process.env.NODE_EXTRA_CA_CERTS;
  if (!extraCertificates) {
    return tls.rootCertificates;
  }
  try {
    return [...tls.rootCertificates, readFileSync(extraCertificates, 'utf8')];
  } catch {
    // Node also ignores an unavailable NODE_EXTRA_CA_CERTS file.
    return tls.rootCertificates;
  }
}

export function makeErrorHubTransport(options: Parameters<typeof makeNodeTransport>[0]): Transport {
  const transport = downloadMincifryCertificate()
    .then((certificate) => {
      const configuredCertificates = options.caCerts;
      if (configuredCertificates === undefined) {
        return makeNodeTransport({ ...options, caCerts: [...defaultCertificates(), certificate] });
      }
      const certificates = Array.isArray(configuredCertificates)
        ? configuredCertificates
        : [configuredCertificates];
      return makeNodeTransport({ ...options, caCerts: [...certificates, certificate] });
    })
    .catch(() => makeNodeTransport(options));
  // Bound events waiting for the download and include that wait in flush's timeout.
  const pending = makePromiseBuffer<TransportMakeRequestResponse>(options.bufferSize ?? 64);

  return {
    send: (envelope) =>
      pending.add(async () => {
        const readyTransport = await transport;
        return readyTransport.send(envelope);
      }),
    flush: (timeout) => pending.drain(timeout),
  };
}
