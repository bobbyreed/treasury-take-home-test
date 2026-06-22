/**
 * Browser-side orchestrator for one offline verification:
 * preprocess → OCR → extract → buildReport. The single-label flow, the
 * Instructions tour, and the Guided Practice levels all share this so there is
 * exactly one definition of "run the label through the tool."
 *
 * Browser-only (preprocess/recognize touch canvas + the OCR worker); the pure
 * comparison logic it calls (extract/report) is unit-tested separately.
 */
import { preprocess } from './preprocess.js';
import { recognize } from './ocr.js';
import { extractFields } from './extract.js';
import { buildReport } from './report.js';

/**
 * @param {Blob|File} image - source label image
 * @param {{
 *   expected?: object,    // application values to check
 *   isImport?: boolean,
 *   binarize?: boolean,
 *   labelId?: string,
 * }} [opts]
 * @returns {Promise<{ocr: object, extracted: object, report: object, ms: number}>}
 */
export async function runVerification(image, opts = {}) {
  const { expected = {}, isImport = false, binarize = true, labelId } = opts;
  const started = performance.now();

  const canvas = await preprocess(image, { binarize });
  const ocr = await recognize(canvas);
  const extracted = extractFields(ocr);
  const report = buildReport({
    labelId: labelId || (image && image.name) || null,
    expected,
    extracted,
    isImport,
  });

  return { ocr, extracted, report, ms: Math.round(performance.now() - started) };
}
