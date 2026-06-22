import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestVerify } from '../app/js/ui/verifyClient.js';

// requestVerify must throw (never hang or return junk) so the UI can fall back
// to the offline verdict that already stands.

test('non-2xx response throws with the HTTP status and server detail', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: 'model unavailable' }),
  });
  try {
    await assert.rejects(
      () => requestVerify({ image: {} }),
      /HTTP 503.*model unavailable/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('a network failure surfaces the underlying message', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
  try {
    await assert.rejects(() => requestVerify({ image: {} }), /ENOTFOUND/);
  } finally {
    globalThis.fetch = original;
  }
});

test('an aborted request reports a blocked/timed-out endpoint', async () => {
  const original = globalThis.fetch;
  // Simulate the firewall black-hole: reject with AbortError once the
  // request's own timeout fires (honoring the AbortSignal it was handed).
  globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });
  try {
    await assert.rejects(
      () => requestVerify({ image: {} }, { timeoutMs: 20 }),
      /blocking the model endpoint/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
