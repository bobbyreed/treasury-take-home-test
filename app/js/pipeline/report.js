/**
 * Assemble a VerificationReport from expected application values + extracted OCR
 * fields, under the applicable beverage rules. Pure and environment-agnostic.
 *
 * Overall verdict: PASS iff every *required* field (per the beverage rules) is
 * MATCH or MINOR_DIFFERENCE; any MISMATCH / MISSING / LOW_CONFIDENCE on a
 * required field → NEEDS_REVIEW. Non-required fields are still reported but don't
 * affect the verdict (e.g. ABV on a beer, where rules don't require it).
 *
 * See docs/IMPLEMENTATION_PLAN.md §6 for the field shapes.
 */
import { rulesFor } from './rules.js';
import {
  compareFreeText,
  compareAbv,
  compareNetContents,
  compareWarning,
} from './compare.js';

const PASSING = new Set(['MATCH', 'MINOR_DIFFERENCE']);

/**
 * @param {{
 *   labelId?: string,
 *   expected?: object,      // brandName, classType, abv, netContents, producer, countryOfOrigin
 *   extracted?: object,     // from extractFields()
 *   beverageType?: string,
 *   isImport?: boolean,
 *   usedAI?: boolean
 * }} args
 * @returns {object} VerificationReport
 */
export function buildReport({
  labelId = null,
  expected = {},
  extracted = {},
  beverageType = 'other',
  isImport = false,
  usedAI = false,
} = {}) {
  const rules = rulesFor(beverageType, isImport);
  const required = new Set(rules.requiredFields);
  const conf = extracted.ocrConfidence ?? null;
  const text = extracted.rawText || (extracted.lines ? extracted.lines.join('\n') : '');

  const fields = [
    compareFreeText('brandName', expected.brandName, text, conf),
    compareFreeText('classType', expected.classType, text, conf),
    compareAbv(expected.abv, extracted.abv || {}, conf),
    compareNetContents(expected.netContents, extracted.netContents || {}, conf),
    compareFreeText('producer', expected.producer, text, conf),
  ];

  // Country of origin: only relevant for imports (or if the application supplies it).
  if (required.has('countryOfOrigin') || (expected.countryOfOrigin != null && expected.countryOfOrigin !== '')) {
    fields.push(compareFreeText('countryOfOrigin', expected.countryOfOrigin, text, conf));
  }

  const w = compareWarning({ warningText: extracted.warningText, allCaps: extracted.warningAllCaps });
  fields.push({
    field: 'warning',
    expectedValue: '(standard TTB government warning)',
    extractedValue: extracted.warningText ? 'present' : null,
    status: w.status,
    note: w.note,
  });

  let overall = 'PASS';
  for (const fc of fields) {
    if (required.has(fc.field) && !PASSING.has(fc.status)) {
      overall = 'NEEDS_REVIEW';
      break;
    }
  }

  return {
    labelId,
    overall,
    beverageType: rules.beverageType,
    isImport,
    usedAI,
    fields,
    createdAt: new Date().toISOString(),
  };
}
