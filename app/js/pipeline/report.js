/**
 * Assemble a VerificationReport from expected + extracted fields under the
 * applicable beverage rules. Pure and environment-agnostic (Node-testable).
 *
 * Overall verdict: PASS iff every required field (per the beverage rules) is
 * MATCH (a MINOR_DIFFERENCE is allowed but flagged); any MISMATCH / MISSING /
 * LOW_CONFIDENCE on a required field -> NEEDS_REVIEW.
 *
 * See docs/IMPLEMENTATION_PLAN.md §6 for the field shapes.
 *
 * @param {{
 *   labelId: string,
 *   expected: object,
 *   extracted: object,
 *   beverageType: string,
 *   isImport?: boolean,
 *   usedAI?: boolean
 * }} args
 * @returns {object} VerificationReport
 */
export function buildReport({ labelId, expected, extracted, beverageType, isImport = false, usedAI = false }) {
  throw new Error('buildReport: not implemented (M4)');
}
