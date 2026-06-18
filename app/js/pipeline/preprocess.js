/**
 * Image preprocessing for OCR (browser / HTML canvas).
 *
 * Loads the source into a canvas, downscales very large images for speed,
 * converts to grayscale (luminance), and optionally binarizes with an Otsu
 * threshold (markedly helps OCR on uneven lighting). Deskew / perspective
 * correction is not yet implemented — tracked for a later pass once we see how
 * real photographs behave.
 *
 * Browser-only (uses canvas / createImageBitmap); not imported by Node tests.
 */

/**
 * @param {Blob|File|HTMLImageElement|ImageBitmap} input - source label image
 * @param {{ maxDim?: number, binarize?: boolean }} [opts]
 * @returns {Promise<HTMLCanvasElement>} cleaned image ready for OCR
 */
export async function preprocess(input, opts = {}) {
  const { maxDim = 1600, binarize = true } = opts;
  const bitmap = await toBitmap(input);

  // Downscale so the long edge is <= maxDim: large images slow OCR without
  // improving it; very small ones lose glyph detail.
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === 'function') bitmap.close();

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  // Grayscale in place; build a histogram for Otsu.
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const g = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    data[i] = data[i + 1] = data[i + 2] = g;
    hist[g]++;
  }

  if (binarize) {
    const t = otsuThreshold(hist, w * h);
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] > t ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function toBitmap(input) {
  if (typeof ImageBitmap !== 'undefined' && input instanceof ImageBitmap) return input;
  if (input instanceof Blob) return createImageBitmap(input);
  if (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement) {
    if (!input.complete) {
      await new Promise((res, rej) => { input.onload = res; input.onerror = rej; });
    }
    return createImageBitmap(input);
  }
  throw new Error('preprocess: unsupported input type');
}

/** Otsu's method: the grayscale threshold maximizing between-class variance. */
function otsuThreshold(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}
