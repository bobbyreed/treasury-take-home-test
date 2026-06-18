import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAbv, parseNetContents, locateWarning, extractFields } from '../app/js/pipeline/extract.js';
import { CANONICAL_WARNING } from '../app/js/pipeline/compare.js';

// --- parseAbv ---------------------------------------------------------------

test('parseAbv: spirits format with proof', () => {
  assert.deepEqual(parseAbv('45% Alc./Vol. (90 Proof)'), { percent: 45, proof: 90 });
});

test('parseAbv: wine % VOL. format, no proof', () => {
  assert.deepEqual(parseAbv('14.8% VOL.'), { percent: 14.8, proof: null });
});

test('parseAbv: beer format', () => {
  assert.deepEqual(parseAbv('7.2% Alc./Vol.'), { percent: 7.2, proof: null });
});

test('parseAbv: tolerates garbled proof, keeps percent', () => {
  assert.deepEqual(parseAbv('45% Alc,/Vol. (90 poo)'), { percent: 45, proof: null });
});

test('parseAbv: ignores "100% Blue Agave", picks the real ABV', () => {
  const r = parseAbv('100% Blue Agave Tequila — 40% Alc./Vol. (80 Proof)');
  assert.equal(r.percent, 40);
  assert.equal(r.proof, 80);
});

test('parseAbv: no alcohol content', () => {
  assert.deepEqual(parseAbv('Just a brand name'), { percent: null, proof: null });
});

// --- parseNetContents -------------------------------------------------------

test('parseNetContents: milliliters', () => {
  assert.deepEqual(parseNetContents('750 mL'), { value: 750, unit: 'mL', ml: 750 });
});

test('parseNetContents: liters', () => {
  assert.deepEqual(parseNetContents('1 L'), { value: 1, unit: 'L', ml: 1000 });
});

test('parseNetContents: prefers the parenthetical mL over fl oz', () => {
  assert.equal(parseNetContents('12 FL. OZ. (355 mL)').ml, 355);
  assert.equal(parseNetContents('1 PINT 6 FL. OZ. (750 mL)').ml, 750);
});

test('parseNetContents: fluid ounces only -> ~mL', () => {
  const r = parseNetContents('12 FL. OZ.');
  assert.equal(r.unit, 'fl oz');
  assert.ok(Math.abs(r.ml - 355) < 1, `got ${r.ml}`);
});

test('parseNetContents: none', () => {
  assert.deepEqual(parseNetContents('no volume here'), { value: null, unit: null, ml: null });
});

// --- locateWarning ----------------------------------------------------------

test('locateWarning: canonical all-caps warning', () => {
  const r = locateWarning(`Some label text\n${CANONICAL_WARNING}`);
  assert.equal(r.found, true);
  assert.equal(r.allCaps, true);
  assert.ok(r.warningText.startsWith('GOVERNMENT WARNING:'));
});

test('locateWarning: title-case lead-in fails the all-caps check', () => {
  const r = locateWarning('Government Warning: (1) According to the Surgeon General...');
  assert.equal(r.found, true);
  assert.equal(r.allCaps, false);
});

test('locateWarning: missing warning', () => {
  assert.deepEqual(locateWarning('OLD TOM DISTILLERY 750 mL'), {
    warningText: null, allCaps: false, found: false,
  });
});

// --- extractFields ----------------------------------------------------------

test('extractFields: surfaces structured fields + raw text/lines', () => {
  const ocr = {
    text: `OLD TOM DISTILLERY\nKentucky Straight Bourbon Whiskey\n45% Alc./Vol. (90 Proof)\n750 mL\n${CANONICAL_WARNING}`,
    words: [],
    confidence: 88,
  };
  const f = extractFields(ocr);
  assert.equal(f.abv.percent, 45);
  assert.equal(f.netContents.ml, 750);
  assert.equal(f.warningAllCaps, true);
  assert.equal(f.ocrConfidence, 88);
  assert.ok(f.lines.length >= 4);
  // free-text fields are deferred to the fuzzy compare step
  assert.equal(f.brandName, null);
});
