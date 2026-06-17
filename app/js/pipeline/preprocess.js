/**
 * Image preprocessing for OCR (browser / HTML canvas).
 * Pipeline: grayscale -> contrast/threshold -> optional deskew. Improves OCR on
 * real photographs (glare, angle, uneven lighting).
 *
 * Browser-only (uses canvas); not imported by Node tests.
 *
 * @param {HTMLImageElement|ImageBitmap|Blob} input - source label image
 * @param {{ threshold?: number, deskew?: boolean }} [opts]
 * @returns {Promise<HTMLCanvasElement>} cleaned image ready for OCR
 */
export async function preprocess(input, opts = {}) {
  throw new Error('preprocess: not implemented (M2)');
}
