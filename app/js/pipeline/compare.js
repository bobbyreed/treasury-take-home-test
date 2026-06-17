/**
 * Deterministic field comparison: normalization, fuzzy matching, and the
 * verbatim government-warning check. Pure and environment-agnostic — unit-tested
 * directly in Node (this is the highest-risk logic in the project).
 */

/** Canonical TTB government health warning — the verbatim comparison target. */
export const CANONICAL_WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not ' +
  'drink alcoholic beverages during pregnancy because of the risk of birth ' +
  'defects. (2) Consumption of alcoholic beverages impairs your ability to ' +
  'drive a car or operate machinery, and may cause health problems.';

/**
 * Normalize free text for tolerant comparison: trim, collapse whitespace,
 * case-fold, normalize quotes/punctuation, strip diacritics.
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
  throw new Error('normalize: not implemented (M4)');
}

/**
 * Compare a single expected vs extracted field value.
 * @param {string} field
 * @param {*} expected
 * @param {*} extracted
 * @param {object} [opts]
 * @returns {{ field: string, expectedValue: *, extractedValue: *, status: string, note: string }}
 *   status ∈ MATCH | MINOR_DIFFERENCE | MISMATCH | MISSING | LOW_CONFIDENCE
 */
export function compareField(field, expected, extracted, opts = {}) {
  throw new Error('compareField: not implemented (M4)');
}

/**
 * Verify the government warning: wording verbatim (whitespace-normalized) vs
 * CANONICAL_WARNING, plus an all-caps assertion on "GOVERNMENT WARNING:".
 * @param {{ warningText: string|null, allCaps: boolean }} extractedWarning
 * @returns {{ status: string, note: string }}
 */
export function compareWarning(extractedWarning) {
  throw new Error('compareWarning: not implemented (M4)');
}
