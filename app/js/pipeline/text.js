/**
 * Text utilities shared by the comparison engine: normalization, tokenization,
 * and token coverage. Pure and environment-agnostic.
 */

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

/** Split normalized text into tokens. */
export function tokens(s) {
  return normalize(s).split(' ').filter(Boolean);
}

/** Fraction of `wantTokens` present (multiset) in `text` — order-insensitive. */
export function coverage(wantTokens, text) {
  if (!wantTokens.length) return 0;
  const counts = new Map();
  for (const t of tokens(text)) counts.set(t, (counts.get(t) || 0) + 1);
  let matched = 0;
  for (const t of wantTokens) {
    const c = counts.get(t) || 0;
    if (c > 0) { matched++; counts.set(t, c - 1); }
  }
  return matched / wantTokens.length;
}
