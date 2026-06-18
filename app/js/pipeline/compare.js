/**
 * Deterministic comparison: turn expected application values + extracted OCR
 * into per-field verdicts. Pure and environment-agnostic — the highest-risk
 * logic in the project, so it's unit-tested directly in Node.
 *
 * Statuses: MATCH | MINOR_DIFFERENCE | MISMATCH | MISSING | LOW_CONFIDENCE.
 *
 * Free-text fields (brand, class/type, producer, country) are matched by
 * searching the *expected* value inside the OCR text — case/punctuation
 * differences are MINOR_DIFFERENCE (Dave's "STONE'S THROW" ≈ "Stone's Throw"),
 * fuzzy near-misses tolerate OCR slips, and a clean miss is MISMATCH (or
 * LOW_CONFIDENCE when the OCR is too poor to trust).
 */
import { parseAbv, parseNetContents } from './extract.js';
import { findInText } from './fuzzy.js';
import { STATUS } from './status.js';
import { CANONICAL_WARNING, LOW_CONFIDENCE_BELOW, GARBLE_RATIO_LIMIT } from './constants.js';
import { normalize, tokens, coverage } from './text.js';

// Re-export for callers/tests that historically imported these from here.
export { CANONICAL_WARNING } from './constants.js';
export { normalize } from './text.js';

/**
 * Effective OCR confidence for the "unreadable vs wrong" decision. A label can
 * have a high *average* confidence while one stylized field (e.g. a decorative
 * title) is unreadable garbage — so if a meaningful share of words came back
 * garbled, treat the read as low-confidence even when the average looks fine.
 * That routes a not-found field to "couldn't read" rather than a false mismatch.
 * @param {{ ocrConfidence?: number|null, garbledRatio?: number }} extracted
 * @returns {number|null}
 */
export function effectiveConfidence(extracted = {}) {
  const base = extracted.ocrConfidence;
  if (base == null) return null;
  if ((extracted.garbledRatio ?? 0) >= GARBLE_RATIO_LIMIT) {
    return Math.min(base, LOW_CONFIDENCE_BELOW - 1);
  }
  return base;
}

const collapseWs = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const mk = (field, expectedValue, extractedValue, status, note) =>
  ({ field, expectedValue, extractedValue, status, note });

/**
 * Compare a free-text field (brand / class / producer / country) by locating the
 * expected value within the OCR text.
 * @returns {{field, expectedValue, extractedValue, status, note}}
 */
export function compareFreeText(field, expected, ocrText, ocrConfidence = null) {
  if (expected == null || String(expected).trim() === '') {
    return mk(field, expected ?? null, null, STATUS.MISSING, 'No expected value provided');
  }
  const text = String(ocrText || '');

  // Exact (case-sensitive, whitespace-normalized) containment.
  if (collapseWs(text).includes(collapseWs(expected))) {
    return mk(field, expected, collapseWs(expected), STATUS.MATCH, 'Found on label');
  }
  // Case/punctuation-insensitive containment → present but formatted differently.
  const nE = normalize(expected);
  if (nE && normalize(text).includes(nE)) {
    return mk(field, expected, expected, STATUS.MINOR_DIFFERENCE, 'Present; case/punctuation differs');
  }
  // Multi-word / multi-line values (e.g. a producer line split across rows, with
  // OCR noise between) — match by how many expected tokens appear in the OCR
  // text. Handles non-contiguous values and strings too long for fuzzy search.
  const expectedTokens = tokens(expected);
  if (expectedTokens.length >= 4) {
    const cov = coverage(expectedTokens, text);
    if (cov >= 0.9) return mk(field, expected, expected, STATUS.MATCH, `Present (text coverage ${Math.round(cov * 100)}%)`);
    if (cov >= 0.78) return mk(field, expected, expected, STATUS.MINOR_DIFFERENCE, `Mostly present (coverage ${Math.round(cov * 100)}%)`);
  }
  // Fuzzy (tolerates OCR slips on shorter values).
  const fz = findInText(expected, text, { threshold: 0.6 });
  if (fz && fz.score <= 0.2) {
    return mk(field, expected, fz.value, STATUS.MATCH, `Fuzzy match (score ${fz.score.toFixed(2)})`);
  }
  if (fz && fz.score <= 0.45) {
    return mk(field, expected, fz.value, STATUS.MINOR_DIFFERENCE, `Close match (score ${fz.score.toFixed(2)})`);
  }
  if (ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW) {
    return mk(field, expected, null, STATUS.LOW_CONFIDENCE, 'Not found; OCR confidence low — try a clearer image');
  }
  return mk(field, expected, fz ? fz.value : null, STATUS.MISMATCH, 'Expected value not found on label');
}

/**
 * Compare alcohol content numerically (percent). `expectedAbv` may be a number
 * or a label string like "45% Alc./Vol. (90 Proof)".
 */
export function compareAbv(expectedAbv, extractedAbv = {}, ocrConfidence = null) {
  const expPercent =
    typeof expectedAbv === 'number' ? expectedAbv : parseAbv(String(expectedAbv ?? '')).percent;
  if (expPercent == null) return mk('abv', expectedAbv ?? null, extractedAbv.percent ?? null, STATUS.MISSING, 'No expected ABV');
  if (extractedAbv.percent == null) {
    return ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW
      ? mk('abv', expPercent, null, STATUS.LOW_CONFIDENCE, 'ABV not read; OCR confidence low')
      : mk('abv', expPercent, null, STATUS.MISMATCH, 'No alcohol content found on label');
  }
  const diff = Math.abs(expPercent - extractedAbv.percent);
  if (diff < 0.05) return mk('abv', expPercent, extractedAbv.percent, STATUS.MATCH, '');
  return mk('abv', expPercent, extractedAbv.percent, STATUS.MISMATCH,
    `Expected ${expPercent}%, label shows ${extractedAbv.percent}%`);
}

/**
 * Compare net contents by canonical millilitres, within a small tolerance for
 * unit-rounding. `expectedNet` may be a number (mL) or a label string.
 */
export function compareNetContents(expectedNet, extractedNet = {}, ocrConfidence = null) {
  const expMl = typeof expectedNet === 'number' ? expectedNet : parseNetContents(String(expectedNet ?? '')).ml;
  if (expMl == null) return mk('netContents', expectedNet ?? null, extractedNet.ml ?? null, STATUS.MISSING, 'No expected net contents');
  if (extractedNet.ml == null) {
    return ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW
      ? mk('netContents', expMl, null, STATUS.LOW_CONFIDENCE, 'Net contents not read; OCR confidence low')
      : mk('netContents', expMl, null, STATUS.MISMATCH, 'No net contents found on label');
  }
  const tol = Math.max(1, expMl * 0.02); // 2% covers fl-oz↔mL rounding
  if (Math.abs(expMl - extractedNet.ml) <= tol) {
    return mk('netContents', `${expMl} mL`, `${extractedNet.ml} mL`, STATUS.MATCH, '');
  }
  return mk('netContents', `${expMl} mL`, `${extractedNet.ml} mL`, STATUS.MISMATCH, 'Net contents differ');
}

/** Fraction of canonical warning tokens present in the extracted text. */
export function warningCoverage(extractedText) {
  return coverage(tokens(CANONICAL_WARNING), extractedText);
}

/**
 * Verify the government warning: the lead-in must be all-caps (Jenny's
 * title-case rejection), and the wording must essentially match the canonical
 * statement. Because we judge OCR'd text, exactness is measured by token
 * coverage with a high bar — near-perfect is MATCH, partial is a flag to verify,
 * clearly altered/short is MISMATCH.
 * @param {{ warningText: string|null, allCaps: boolean }} extractedWarning
 * @returns {{ status: string, note: string }}
 */
export function compareWarning(extractedWarning) {
  if (!extractedWarning || !extractedWarning.warningText) {
    return { status: STATUS.MISSING, note: 'Government warning not found on label' };
  }
  if (!extractedWarning.allCaps) {
    return { status: STATUS.MISMATCH, note: '"GOVERNMENT WARNING:" must be in all caps' };
  }
  const cov = warningCoverage(extractedWarning.warningText);
  const pct = Math.round(cov * 100);
  if (cov >= 0.9) return { status: STATUS.MATCH, note: `Standard warning present (text coverage ${pct}%)` };
  if (cov >= 0.7) return { status: STATUS.MINOR_DIFFERENCE, note: `Warning mostly matches (coverage ${pct}%) — verify wording` };
  return { status: STATUS.MISMATCH, note: `Warning wording differs from the required statement (coverage ${pct}%)` };
}
