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
