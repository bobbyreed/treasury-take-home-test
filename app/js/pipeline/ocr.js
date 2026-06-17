/**
 * OCR via Tesseract.js, vendored and served locally (no CDN) so it works
 * offline / behind the TTB firewall. Assets live in `app/vendor/tesseract/`.
 *
 * Browser-only; not imported by Node tests.
 *
 * @param {HTMLCanvasElement|Blob} image - preprocessed image
 * @returns {Promise<{
 *   text: string,
 *   words: Array<{ text: string, bbox: object, confidence: number }>,
 *   confidence: number
 * }>}
 */
export async function recognize(image) {
  throw new Error('recognize: not implemented (M2)');
}
