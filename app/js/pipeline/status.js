/**
 * Field-comparison statuses and overall verdicts — single source of truth,
 * shared by compare.js (produces them), report.js (aggregates them), and
 * render.js (displays them).
 */

export const STATUS = {
  MATCH: 'MATCH',
  MINOR_DIFFERENCE: 'MINOR_DIFFERENCE',
  MISMATCH: 'MISMATCH',
  MISSING: 'MISSING',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
};

export const OVERALL = {
  PASS: 'PASS',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};
