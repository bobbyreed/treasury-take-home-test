/**
 * Field extraction from OCR output.
 *
 * Two kinds of field:
 *  - Structured fields (ABV, net contents, government warning) have recognizable
 *    formats, so they're parsed here with regexes — pure and environment-agnostic,
 *    and unit-tested directly in Node.
 *  - Free-text fields (brand, class/type, producer, country of origin) are too
 *    unreliable to pull out of noisy OCR on their own, so the extractor surfaces
 *    `rawText` / `lines`, and the comparison step (M4) fuzzy-matches the *expected*
 *    application values against them (see `fuzzy.js`). That's the robust path for
 *    a verification tool: confirm the known values are present rather than guess
 *    them blind.
 */

/**
 * Parse alcohol content. Handles "45% Alc./Vol. (90 Proof)", "14.8% VOL.",
 * "7.2% Alc./Vol.", and garbled variants. Anchored to alc/vol so it ignores
 * unrelated percentages like "100% Blue Agave".
 * @param {string} text
 * @returns {{ percent: number|null, proof: number|null }}
 */
export function parseAbv(text) {
  const s = String(text || '');
  // number% immediately before alc/vol/abv, e.g. "45% Alc./Vol." / "14.8% VOL."
  let m = s.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:alc|vol|abv)/i);
  // alc/vol/abv before the number, e.g. "ALC 45% BY VOL"
  if (!m) m = s.match(/(?:alc|abv)[.\s:/]{0,4}(\d{1,2}(?:\.\d+)?)\s*%/i);
  // fallback: first 1–2 digit percentage (1–2 digits excludes "100%")
  if (!m) m = s.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
  const percent = m ? parseFloat(m[1]) : null;

  const pr = s.match(/(\d{2,3})\s*proof/i);
  const proof = pr ? parseInt(pr[1], 10) : null;

  return { percent, proof };
}

/**
 * Parse net contents into a canonical milliliter value. Prefers an explicit mL
 * figure (labels often print "12 FL. OZ. (355 mL)"), then liters, then fluid
 * ounces. Pint-only strings without a mL equivalent are not converted (rare on
 * our labels; documented limitation).
 * @param {string} text
 * @returns {{ value: number|null, unit: string|null, ml: number|null }}
 */
export function parseNetContents(text) {
  const s = String(text || '');

  let m = s.match(/(\d+(?:\.\d+)?)\s*m\s?l\b/i); // milliliters
  if (m) {
    const v = parseFloat(m[1]);
    return { value: v, unit: 'mL', ml: v };
  }
  m = s.match(/(\d+(?:\.\d+)?)\s*l\b/i); // liters
  if (m) {
    const v = parseFloat(m[1]);
    return { value: v, unit: 'L', ml: v * 1000 };
  }
  m = s.match(/(\d+(?:\.\d+)?)\s*fl\.?\s*oz/i); // fluid ounces
  if (m) {
    const v = parseFloat(m[1]);
    return { value: v, unit: 'fl oz', ml: +(v * 29.5735).toFixed(2) };
  }
  return { value: null, unit: null, ml: null };
}

/**
 * Locate the government warning block and report whether the "GOVERNMENT
 * WARNING:" lead-in is in all caps. Locating is tolerant (case-insensitive); the
 * all-caps check is exact, because Jenny's title-case "Government Warning" is a
 * rejection. Verbatim wording comparison happens later (compare.js).
 * @param {string} text
 * @returns {{ warningText: string|null, allCaps: boolean, found: boolean }}
 */
export function locateWarning(text) {
  const s = String(text || '');
  const m = s.match(/government\s+warning\s*:?/i);
  if (!m) return { warningText: null, allCaps: false, found: false };
  const start = m.index;
  const warningText = s.slice(start).replace(/\s+/g, ' ').trim();
  const leadIn = s.slice(start, start + m[0].length);
  const allCaps = /GOVERNMENT\s+WARNING/.test(leadIn);
  return { warningText, allCaps, found: true };
}

/**
 * Build ExtractedFields from an OCR result. Free-text fields are left null here
 * and resolved by fuzzy-matching expected values at compare time.
 * @param {{ text?: string, words?: Array, confidence?: number, source?: string }} ocr
 * @returns {object} ExtractedFields (see docs/IMPLEMENTATION_PLAN.md §6)
 */
export function extractFields(ocr = {}) {
  const text = ocr.text || '';
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const warning = locateWarning(text);
  return {
    brandName: null,
    classType: null,
    producer: null,
    countryOfOrigin: null,
    abv: parseAbv(text),
    netContents: parseNetContents(text),
    warningText: warning.warningText,
    warningAllCaps: warning.allCaps,
    rawText: text,
    lines,
    wordBoxes: ocr.words || [],
    ocrConfidence: ocr.confidence ?? null,
    source: ocr.source || 'OCR',
  };
}
