/**
 * Browser client for the optional online AI verification endpoint
 * (POST /api/verifyLabel, a Hosting rewrite to the Cloud Function).
 *
 * Sends the *original* color image (downscaled to keep the request small) plus
 * the offline OCR text as a hint. Network/DOM only — the pure mapping of the
 * response lives in ../pipeline/aiVerify.js.
 */

const ENDPOINT = '/api/verifyLabel';
const MAX_DIM = 1568;       // Claude's long-edge sweet spot; also caps payload size
const JPEG_QUALITY = 0.85;

/**
 * Downscale an image File and encode it as base64 JPEG for the request body.
 * @param {File|Blob} file
 * @returns {Promise<{ mediaType: string, dataBase64: string }>}
 */
export async function fileToPayload(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return { mediaType: 'image/jpeg', dataBase64: dataUrl.split(',')[1] };
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

/**
 * Call the verification endpoint. Throws on network failure or non-2xx so the
 * caller can degrade gracefully (the offline result already stands).
 * @param {{ image: object, ocrText?: string, expected?: object }} body
 * @param {string} [endpoint]
 * @returns {Promise<{ extracted: object, confidence: number|null, notes: string|null }>}
 */
export async function requestVerify(body, endpoint = ENDPOINT) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* non-JSON */ }
    throw new Error(`AI verification unavailable (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}
