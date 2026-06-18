import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  compareFreeText,
  compareAbv,
  compareNetContents,
  compareWarning,
  warningCoverage,
  CANONICAL_WARNING,
} from '../app/js/pipeline/compare.js';

// --- normalize --------------------------------------------------------------

test('normalize strips diacritics and folds case/punct', () => {
  assert.equal(normalize('Château de la Roche'), 'chateau de la roche');
  assert.equal(normalize("STONE'S THROW"), normalize("Stone's Throw"));
});

// --- compareFreeText --------------------------------------------------------

test('free-text: exact (case) containment is MATCH', () => {
  const r = compareFreeText('brandName', 'Silver Creek Vineyard', 'Estate\nSilver Creek Vineyard Reserve\n750 mL');
  assert.equal(r.status, 'MATCH');
});

test('free-text: case-only difference is MINOR_DIFFERENCE (STONE\'S THROW)', () => {
  const r = compareFreeText('brandName', 'Stone\'s Throw', 'STONE\'S THROW VINEYARD');
  assert.equal(r.status, 'MINOR_DIFFERENCE');
});

test('free-text: garbled OCR fuzzy-matches as MINOR_DIFFERENCE', () => {
  const r = compareFreeText('classType', 'Kentucky Straight Bourbon Whiskey', 'Fo KENTUCKY STRAIGHT\nBOURBON WHISK E)');
  assert.equal(r.status, 'MINOR_DIFFERENCE');
});

test('free-text: not found with good OCR is MISMATCH', () => {
  const r = compareFreeText('brandName', 'Silver Creek Vineyard', 'Mountain Peak Brewing IPA', 85);
  assert.equal(r.status, 'MISMATCH');
});

test('free-text: not found with poor OCR is LOW_CONFIDENCE', () => {
  const r = compareFreeText('brandName', 'Silver Creek Vineyard', 'Mountain Peak Brewing IPA', 30);
  assert.equal(r.status, 'LOW_CONFIDENCE');
});

test('free-text: multi-line producer with OCR noise between lines is MATCH (token coverage)', () => {
  const text = 'Product of Mexico. Pr\nBottled by Mezcal de Oaxaca, S.A. de C.V. a AN\nImported by Border Crossings Imports, El Paso, TX 2D';
  const expected = 'Product of Mexico. Bottled by Mezcal de Oaxaca, S.A. de C.V. Imported by Border Crossings Imports, El Paso, TX';
  assert.equal(compareFreeText('producer', expected, text, 80).status, 'MATCH');
});

test('free-text: a different producer is not a false coverage match', () => {
  const text = 'DISTILLED & BOTTLED BY SMOKY MOUNTAIN DISTILLERY, GATLINBURG, TN';
  const expected = 'Distilled & Bottled by Old Tom Distillery, Lexington, KY';
  assert.equal(compareFreeText('producer', expected, text, 85).status, 'MISMATCH');
});

// --- compareAbv -------------------------------------------------------------

test('abv: equal percent is MATCH (string or number expected)', () => {
  assert.equal(compareAbv('45% Alc./Vol. (90 Proof)', { percent: 45, proof: 90 }).status, 'MATCH');
  assert.equal(compareAbv(45, { percent: 45 }).status, 'MATCH');
});

test('abv: different percent is MISMATCH', () => {
  assert.equal(compareAbv('45% Alc./Vol. (90 Proof)', { percent: 40 }).status, 'MISMATCH');
});

test('abv: unreadable with low confidence is LOW_CONFIDENCE', () => {
  assert.equal(compareAbv('14.8% VOL.', { percent: null }, 30).status, 'LOW_CONFIDENCE');
});

// --- compareNetContents -----------------------------------------------------

test('net contents: equal is MATCH', () => {
  assert.equal(compareNetContents('750 mL', { ml: 750 }).status, 'MATCH');
});

test('net contents: fl-oz rounding within tolerance is MATCH', () => {
  assert.equal(compareNetContents('355 mL (12 fl. oz.)', { ml: 354.88 }).status, 'MATCH');
});

test('net contents: different volume is MISMATCH', () => {
  assert.equal(compareNetContents('750 mL', { ml: 1000 }).status, 'MISMATCH');
});

// --- compareWarning ---------------------------------------------------------

test('warning: full canonical, all caps is MATCH', () => {
  assert.equal(warningCoverage(CANONICAL_WARNING), 1);
  const r = compareWarning({ warningText: CANONICAL_WARNING, allCaps: true });
  assert.equal(r.status, 'MATCH');
});

test('warning: title-case lead-in is MISMATCH', () => {
  const r = compareWarning({ warningText: 'Government Warning: (1) According to the Surgeon General...', allCaps: false });
  assert.equal(r.status, 'MISMATCH');
});

test('warning: reworded/short is MISMATCH', () => {
  const r = compareWarning({ warningText: 'GOVERNMENT WARNING: do not drink and drive', allCaps: true });
  assert.equal(r.status, 'MISMATCH');
});

test('warning: missing is MISSING', () => {
  assert.equal(compareWarning({ warningText: null, allCaps: false }).status, 'MISSING');
});

test('free-text: empty expected → MISSING', () => {
  assert.equal(compareFreeText('brandName', '', 'anything').status, 'MISSING');
});

test('free-text: single-typo fuzzy match → MATCH', () => {
  const r = compareFreeText('brandName', 'Silver Creek Vineyard', 'Estate\nSilver Creek Vinyard\n750 mL');
  assert.equal(r.status, 'MATCH');
});

test('net contents: unreadable with low confidence → LOW_CONFIDENCE', () => {
  assert.equal(compareNetContents('750 mL', { ml: null }, 30).status, 'LOW_CONFIDENCE');
});

test('net contents: unreadable with good confidence → MISMATCH', () => {
  assert.equal(compareNetContents('750 mL', { ml: null }, 85).status, 'MISMATCH');
});
