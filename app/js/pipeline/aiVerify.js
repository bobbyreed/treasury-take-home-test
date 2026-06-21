/**
 * Bridge the online AI reading (verifyLabel response) back into the SAME
 * deterministic comparison engine used for the offline OCR read.
 *
 * The AI returns printed field *values*; the offline pipeline surfaces raw
 * text and lets compare.js fuzzy-match expected values against it. To reuse all
 * of that logic unchanged, we shape the AI fields into an ExtractedFields object
 * (parsing ABV / net contents the same way, and synthesizing a `rawText` from
 * the AI's values so the free-text matchers work as-is). Pure and
 * environment-agnostic — unit-tested in Node.
 *
 * See docs/IMPLEMENTATION_PLAN.md §6/§7.
 */
import { parseAbv, parseNetContents } from './extract.js';

/**
 * @param {object} ai - the `extracted` block from a verifyLabel response
 *   { brandName, classType, abv, netContents, producer, countryOfOrigin,
 *     warningText, warningAllCaps, readable, source }
 * @param {number|null} confidence - top-level confidence from the response
 * @returns {object} ExtractedFields (source:"AI")
 */
export function aiFieldsToExtracted(ai = {}, confidence = null) {
  const parts = [
    ai.brandName, ai.classType, ai.abv, ai.netContents,
    ai.producer, ai.countryOfOrigin, ai.warningText,
  ].filter(Boolean);

  return {
    brandName: ai.brandName || null,
    classType: ai.classType || null,
    producer: ai.producer || null,
    countryOfOrigin: ai.countryOfOrigin || null,
    abv: parseAbv(ai.abv || ''),
    netContents: parseNetContents(ai.netContents || ''),
    warningText: ai.warningText || null,
    warningAllCaps: !!ai.warningAllCaps,
    rawText: parts.join('\n'),
    lines: parts,
    wordBoxes: [],
    ocrConfidence: Number.isFinite(confidence) ? confidence : null,
    // If the model says it couldn't read the label, force the "couldn't read"
    // path (LOW_CONFIDENCE) rather than letting fields read as MISMATCH.
    garbledRatio: ai.readable === false ? 1 : 0,
    source: 'AI',
  };
}

/**
 * Per-field status changes from the offline read to the AI read. Drives the
 * "AI revised N field(s)" callout so a reviewer sees what the booster changed.
 * @param {object} offlineReport
 * @param {object} aiReport
 * @returns {Array<{ field: string, before: string, after: string }>}
 */
export function diffFields(offlineReport = {}, aiReport = {}) {
  const before = new Map((offlineReport.fields || []).map((f) => [f.field, f.status]));
  const deltas = [];
  for (const f of aiReport.fields || []) {
    const prev = before.get(f.field);
    if (prev && prev !== f.status) deltas.push({ field: f.field, before: prev, after: f.status });
  }
  return deltas;
}
