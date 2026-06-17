/**
 * Field extraction from OCR output -> ExtractedFields.
 *
 * The individual parsers (`parseAbv`, `parseNetContents`, `locateWarning`) are
 * pure and environment-agnostic, so they are unit-tested directly in Node.
 * `extractFields` orchestrates them over the full OCR result.
 */

/**
 * @param {string} text
 * @returns {{ percent: number|null, proof: number|null }}
 */
export function parseAbv(text) {
  throw new Error('parseAbv: not implemented (M3)');
}

/**
 * @param {string} text
 * @returns {{ value: number|null, unit: string|null, ml: number|null }}
 */
export function parseNetContents(text) {
  throw new Error('parseNetContents: not implemented (M3)');
}

/**
 * Locate the government warning block and report whether the
 * "GOVERNMENT WARNING:" lead-in is rendered in all caps.
 * @param {string} text
 * @returns {{ warningText: string|null, allCaps: boolean }}
 */
export function locateWarning(text) {
  throw new Error('locateWarning: not implemented (M3)');
}

/**
 * @param {{ text: string, words: Array, confidence: number }} ocr
 * @returns {object} ExtractedFields (see docs/IMPLEMENTATION_PLAN.md §6)
 */
export function extractFields(ocr) {
  throw new Error('extractFields: not implemented (M3)');
}
