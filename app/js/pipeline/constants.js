/**
 * Domain constants for the comparison engine.
 */

/** Canonical TTB government health warning — the verbatim comparison target. */
export const CANONICAL_WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not ' +
  'drink alcoholic beverages during pregnancy because of the risk of birth ' +
  'defects. (2) Consumption of alcoholic beverages impairs your ability to ' +
  'drive a car or operate machinery, and may cause health problems.';

/** OCR mean-confidence below this routes a "not found" to LOW_CONFIDENCE, not MISMATCH. */
export const LOW_CONFIDENCE_BELOW = 55;

/** A word OCR'd below this confidence is counted as "garbled" (unreadable). */
export const GARBLE_WORD_CONF = 50;

/** If at least this share of OCR words are garbled, treat the whole read as
 *  low-confidence — a stylized/unreadable field shouldn't read as a mismatch. */
export const GARBLE_RATIO_LIMIT = 0.15;
