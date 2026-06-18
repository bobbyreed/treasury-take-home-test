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

/** Canonical TTB government health warning — the verbatim comparison target. */
export const CANONICAL_WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not ' +
  'drink alcoholic beverages during pregnancy because of the risk of birth ' +
  'defects. (2) Consumption of alcoholic beverages impairs your ability to ' +
  'drive a car or operate machinery, and may cause health problems.';

/** OCR confidence below this routes a "not found" to LOW_CONFIDENCE, not MISMATCH. */
const LOW_CONFIDENCE_BELOW = 55;

/**
 * Normalize text for tolerant comparison: strip diacritics, unify quotes/dashes,
 * lowercase, reduce punctuation to spaces, collapse whitespace.
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diacritics
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
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
    return mk(field, expected ?? null, null, 'MISSING', 'No expected value provided');
  }
  const text = String(ocrText || '');

  // Exact (case-sensitive, whitespace-normalized) containment.
  if (collapseWs(text).includes(collapseWs(expected))) {
    return mk(field, expected, collapseWs(expected), 'MATCH', 'Found on label');
  }
  // Case/punctuation-insensitive containment → present but formatted differently.
  const nE = normalize(expected);
  if (nE && normalize(text).includes(nE)) {
    return mk(field, expected, expected, 'MINOR_DIFFERENCE', 'Present; case/punctuation differs');
  }
  // Fuzzy (tolerates OCR slips).
  const fz = findInText(expected, text, { threshold: 0.6 });
  if (fz && fz.score <= 0.2) {
    return mk(field, expected, fz.value, 'MATCH', `Fuzzy match (score ${fz.score.toFixed(2)})`);
  }
  if (fz && fz.score <= 0.45) {
    return mk(field, expected, fz.value, 'MINOR_DIFFERENCE', `Close match (score ${fz.score.toFixed(2)})`);
  }
  if (ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW) {
    return mk(field, expected, null, 'LOW_CONFIDENCE', 'Not found; OCR confidence low — try a clearer image');
  }
  return mk(field, expected, fz ? fz.value : null, 'MISMATCH', 'Expected value not found on label');
}

/**
 * Compare alcohol content numerically (percent). `expectedAbv` may be a number
 * or a label string like "45% Alc./Vol. (90 Proof)".
 */
export function compareAbv(expectedAbv, extractedAbv = {}, ocrConfidence = null) {
  const expPercent =
    typeof expectedAbv === 'number' ? expectedAbv : parseAbv(String(expectedAbv ?? '')).percent;
  if (expPercent == null) return mk('abv', expectedAbv ?? null, extractedAbv.percent ?? null, 'MISSING', 'No expected ABV');
  if (extractedAbv.percent == null) {
    return ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW
      ? mk('abv', expPercent, null, 'LOW_CONFIDENCE', 'ABV not read; OCR confidence low')
      : mk('abv', expPercent, null, 'MISMATCH', 'No alcohol content found on label');
  }
  const diff = Math.abs(expPercent - extractedAbv.percent);
  if (diff < 0.05) return mk('abv', expPercent, extractedAbv.percent, 'MATCH', '');
  return mk('abv', expPercent, extractedAbv.percent, 'MISMATCH',
    `Expected ${expPercent}%, label shows ${extractedAbv.percent}%`);
}

/**
 * Compare net contents by canonical millilitres, within a small tolerance for
 * unit-rounding. `expectedNet` may be a number (mL) or a label string.
 */
export function compareNetContents(expectedNet, extractedNet = {}, ocrConfidence = null) {
  const expMl = typeof expectedNet === 'number' ? expectedNet : parseNetContents(String(expectedNet ?? '')).ml;
  if (expMl == null) return mk('netContents', expectedNet ?? null, extractedNet.ml ?? null, 'MISSING', 'No expected net contents');
  if (extractedNet.ml == null) {
    return ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE_BELOW
      ? mk('netContents', expMl, null, 'LOW_CONFIDENCE', 'Net contents not read; OCR confidence low')
      : mk('netContents', expMl, null, 'MISMATCH', 'No net contents found on label');
  }
  const tol = Math.max(1, expMl * 0.02); // 2% covers fl-oz↔mL rounding
  if (Math.abs(expMl - extractedNet.ml) <= tol) {
    return mk('netContents', `${expMl} mL`, `${extractedNet.ml} mL`, 'MATCH', '');
  }
  return mk('netContents', `${expMl} mL`, `${extractedNet.ml} mL`, 'MISMATCH', 'Net contents differ');
}

function tokens(s) {
  return normalize(s).split(' ').filter(Boolean);
}

/** Fraction of canonical warning tokens present in the extracted text (multiset). */
export function warningCoverage(extractedText) {
  const want = tokens(CANONICAL_WARNING);
  const counts = new Map();
  for (const t of tokens(extractedText)) counts.set(t, (counts.get(t) || 0) + 1);
  let matched = 0;
  for (const t of want) {
    const c = counts.get(t) || 0;
    if (c > 0) { matched++; counts.set(t, c - 1); }
  }
  return want.length ? matched / want.length : 0;
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
    return { status: 'MISSING', note: 'Government warning not found on label' };
  }
  if (!extractedWarning.allCaps) {
    return { status: 'MISMATCH', note: '"GOVERNMENT WARNING:" must be in all caps' };
  }
  const cov = warningCoverage(extractedWarning.warningText);
  const pct = Math.round(cov * 100);
  if (cov >= 0.9) return { status: 'MATCH', note: `Standard warning present (text coverage ${pct}%)` };
  if (cov >= 0.7) return { status: 'MINOR_DIFFERENCE', note: `Warning mostly matches (coverage ${pct}%) — verify wording` };
  return { status: 'MISMATCH', note: `Warning wording differs from the required statement (coverage ${pct}%)` };
}
