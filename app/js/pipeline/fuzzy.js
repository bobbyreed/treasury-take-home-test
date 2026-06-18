/**
 * Fuzzy matching over noisy OCR, via vendored Fuse.js (local, no CDN).
 *
 * The insight for a *verification* tool: we don't need to perfectly transcribe a
 * label, we need to confirm the application's known values are present. So we
 * fuzzy-search the expected value against the OCR text and judge by score. This
 * tolerates OCR slips (e.g. "45% Alc,/Vol. (90 poo)" still matches "45% Alc./Vol.
 * (90 Proof)") and also gives the case/punctuation tolerance the brand/class
 * checks need (Dave's "STONE'S THROW" vs "Stone's Throw").
 *
 * Pure and environment-agnostic — unit-tested directly in Node.
 *
 * Fuse score: 0 = exact, 1 = no match. Lower is better.
 */
import Fuse from '../../vendor/fuse/fuse.mjs';

const FUSE_OPTS = {
  includeScore: true,
  threshold: 1, // we filter by our own threshold; let Fuse rank everything
  ignoreLocation: true,
  isCaseSensitive: false,
  minMatchCharLength: 2,
};

/**
 * Build search candidates from OCR lines: each line, plus joins of up to
 * `maxSpan` adjacent lines (so a value split across lines — "OLD TOM" /
 * "DISTILLERY" — can still be matched as one).
 * @param {string[]} lines
 * @param {number} [maxSpan=3]
 * @returns {string[]}
 */
export function windows(lines, maxSpan = 3) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let acc = '';
    for (let span = 0; span < maxSpan && i + span < lines.length; span++) {
      acc = acc ? `${acc} ${lines[i + span]}` : lines[i + span];
      out.push(acc);
    }
  }
  return out;
}

/**
 * Best fuzzy match of `query` among `candidates`.
 * @param {string} query
 * @param {string[]} candidates
 * @param {{ threshold?: number }} [opts] - max acceptable score (default 0.6)
 * @returns {{ value: string, score: number }|null}
 */
export function bestMatch(query, candidates, { threshold = 0.6 } = {}) {
  const list = (candidates || []).filter(Boolean);
  if (!query || list.length === 0) return null;
  const fuse = new Fuse(list, FUSE_OPTS);
  const hit = fuse.search(query)[0];
  if (!hit || hit.score > threshold) return null;
  return { value: hit.item, score: hit.score };
}

/**
 * Best fuzzy match of `query` anywhere in a block of OCR `text` (line-windowed).
 * @param {string} query
 * @param {string} text
 * @param {{ threshold?: number, maxSpan?: number }} [opts]
 * @returns {{ value: string, score: number }|null}
 */
export function findInText(query, text, { threshold = 0.6, maxSpan = 3 } = {}) {
  const lines = String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return bestMatch(query, windows(lines, maxSpan), { threshold });
}
