/**
 * OCR via Tesseract.js, vendored and served locally (no CDN) so it works
 * offline / behind the TTB firewall. Assets live in `app/vendor/tesseract/`.
 *
 * The vendored ESM bundle exposes a default export; `createWorker` is a property
 * of it. We force the SIMD-LSTM core (the only core variant we vendor) and point
 * the worker, core, and language paths at our local files. OEM 1 = LSTM_ONLY,
 * which is what the SIMD-LSTM core supports.
 *
 * Browser-only; not imported by Node tests.
 */
import Tesseract from '../../vendor/tesseract/tesseract.esm.min.js';

const VENDOR = new URL('../../vendor/tesseract/', import.meta.url).href;

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker('eng', 1 /* LSTM_ONLY */, {
        workerPath: VENDOR + 'worker.min.js',
        corePath: VENDOR + 'tesseract-core-simd-lstm.wasm.js',
        langPath: VENDOR, // directory containing eng.traineddata.gz
        gzip: true,
      });
      // Auto page segmentation. The worker default treats the whole label as one
      // uniform block and drops large display lines (brand, class/type); PSM 3
      // (AUTO) does proper layout analysis and picks those titles up.
      await worker.setParameters({
        tessedit_pageseg_mode: (Tesseract.PSM && Tesseract.PSM.AUTO) || '3',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Recognize text in an image.
 * @param {HTMLCanvasElement|Blob|HTMLImageElement} image - ideally preprocessed
 * @returns {Promise<{
 *   text: string,
 *   words: Array<{ text: string, bbox: object, confidence: number }>,
 *   confidence: number
 * }>}
 */
export async function recognize(image) {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  const words = (data.words || []).map((w) => ({
    text: w.text,
    bbox: w.bbox,
    confidence: w.confidence,
  }));
  return { text: data.text, words, confidence: data.confidence };
}

/** Tear down the worker (frees the WASM instance). */
export async function terminate() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
