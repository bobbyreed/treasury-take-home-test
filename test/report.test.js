import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFields } from '../app/js/pipeline/extract.js';
import { buildReport } from '../app/js/pipeline/report.js';
import { CANONICAL_WARNING } from '../app/js/pipeline/compare.js';

const ocr = (text, confidence = 88) => extractFields({ text, confidence });

test('spirits: fully compliant label PASSES', () => {
  const text = `Old Tom Distillery
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL
Distilled & Bottled by Old Tom Distillery, Lexington, KY
${CANONICAL_WARNING}`;
  const r = buildReport({
    labelId: 't1',
    beverageType: 'spirits',
    extracted: ocr(text),
    expected: {
      brandName: 'Old Tom Distillery',
      classType: 'Kentucky Straight Bourbon Whiskey',
      abv: '45% Alc./Vol. (90 Proof)',
      netContents: '750 mL',
      producer: 'Distilled & Bottled by Old Tom Distillery, Lexington, KY',
    },
  });
  assert.equal(r.overall, 'PASS');
});

test('spirits: wrong ABV → NEEDS_REVIEW', () => {
  const text = `Old Tom Distillery
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL
Distilled & Bottled by Old Tom Distillery, Lexington, KY
${CANONICAL_WARNING}`;
  const r = buildReport({
    beverageType: 'spirits',
    extracted: ocr(text),
    expected: {
      brandName: 'Old Tom Distillery',
      classType: 'Kentucky Straight Bourbon Whiskey',
      abv: '40% Alc./Vol. (80 Proof)', // application says 40, label shows 45
      netContents: '750 mL',
      producer: 'Distilled & Bottled by Old Tom Distillery, Lexington, KY',
    },
  });
  assert.equal(r.overall, 'NEEDS_REVIEW');
  assert.equal(r.fields.find((f) => f.field === 'abv').status, 'MISMATCH');
});

test('missing government warning → NEEDS_REVIEW', () => {
  const text = `Old Tom Distillery
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL
Distilled & Bottled by Old Tom Distillery, Lexington, KY`;
  const r = buildReport({
    beverageType: 'spirits',
    extracted: ocr(text),
    expected: {
      brandName: 'Old Tom Distillery',
      classType: 'Kentucky Straight Bourbon Whiskey',
      abv: '45% Alc./Vol. (90 Proof)',
      netContents: '750 mL',
      producer: 'Distilled & Bottled by Old Tom Distillery, Lexington, KY',
    },
  });
  assert.equal(r.overall, 'NEEDS_REVIEW');
  assert.equal(r.fields.find((f) => f.field === 'warning').status, 'MISSING');
});

test('imported wine missing country of origin → NEEDS_REVIEW', () => {
  const text = `Château de la Roche
Sancerre (White Wine)
12.5% VOL.
750 mL
Bottled by Vignoble Imports, New York, NY
${CANONICAL_WARNING}`; // no "FRANCE" on the label
  const r = buildReport({
    beverageType: 'wine',
    isImport: true,
    extracted: ocr(text),
    expected: {
      brandName: 'Château de la Roche',
      classType: 'Sancerre (White Wine)',
      abv: '12.5% VOL.',
      netContents: '750 mL',
      producer: 'Bottled by Vignoble Imports, New York, NY',
      countryOfOrigin: 'FRANCE',
    },
  });
  assert.equal(r.overall, 'NEEDS_REVIEW');
  assert.equal(r.fields.find((f) => f.field === 'countryOfOrigin').status, 'MISMATCH');
});

test('beer: ABV not required, so an unreadable ABV still PASSES', () => {
  const text = `Mountain Peak Brewing
India Pale Ale (IPA)
12 FL. OZ. (355 mL)
Brewed & Canned by Mountain Peak Brewing, Denver, CO
${CANONICAL_WARNING}`; // no ABV printed
  const r = buildReport({
    beverageType: 'beer',
    extracted: ocr(text),
    expected: {
      brandName: 'Mountain Peak Brewing',
      classType: 'India Pale Ale (IPA)',
      abv: '7.2% Alc./Vol.',
      netContents: '12 FL. OZ. (355 mL)',
      producer: 'Brewed & Canned by Mountain Peak Brewing, Denver, CO',
    },
  });
  assert.equal(r.overall, 'PASS');
});

test('defaults: buildReport() with no args → NEEDS_REVIEW (all required missing)', () => {
  const r = buildReport();
  assert.equal(r.overall, 'NEEDS_REVIEW');
  assert.equal(r.beverageType, 'other');
  assert.equal(r.usedAI, false);
});

test('derives OCR text from extracted.lines when rawText is absent', () => {
  const r = buildReport({
    beverageType: 'beer',
    extracted: {
      lines: [
        'Mountain Peak Brewing',
        'India Pale Ale (IPA)',
        'Brewed & Canned by Mountain Peak Brewing, Denver, CO',
      ],
      abv: { percent: 7.2 },
      netContents: { ml: 355 },
      warningText: CANONICAL_WARNING,
      warningAllCaps: true,
      ocrConfidence: 88,
    },
    expected: {
      brandName: 'Mountain Peak Brewing',
      classType: 'India Pale Ale (IPA)',
      netContents: '355 mL',
      producer: 'Brewed & Canned by Mountain Peak Brewing, Denver, CO',
    },
  });
  assert.equal(r.overall, 'PASS');
  assert.equal(r.fields.find((f) => f.field === 'brandName').status, 'MATCH');
});
