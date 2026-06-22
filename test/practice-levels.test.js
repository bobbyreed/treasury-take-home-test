import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LEVELS, FIELD_LABELS, CALLS, isCorrectCall, isCorrectField } from '../app/js/practice/levels.js';
import { parseCsv } from '../app/js/pipeline/csv.js';
import { normalize } from '../app/js/pipeline/text.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

// Canonical correct values, keyed by basename, from the shared corpus CSV.
const canonical = (() => {
  const { rows } = parseCsv(readFileSync(resolve(repo, 'sample-labels/expected-values.csv'), 'utf8'));
  const map = new Map();
  for (const r of rows) map.set(r.filename.replace(/\.png$/i, ''), r);
  return map;
})();

const TEXT_FIELDS = ['brandName', 'classType', 'abv', 'netContents', 'producer'];

test('curriculum is 18 levels with alternating types starting on "enter"', () => {
  assert.equal(LEVELS.length, 18);
  LEVELS.forEach((lvl, i) => {
    assert.equal(lvl.type, i % 2 === 0 ? 'enter' : 'judge', `level ${i + 1} type`);
  });
});

test('every level points at a real, served label image', () => {
  for (const lvl of LEVELS) {
    assert.equal(lvl.image, `/practice/labels/${lvl.label}.jpg`);
    const p = resolve(repo, 'app/practice/labels', `${lvl.label}.jpg`);
    assert.ok(existsSync(p), `missing image for ${lvl.label}`);
  }
});

test('every level references the canonical corpus and has a coherent answer', () => {
  for (const lvl of LEVELS) {
    assert.ok(canonical.has(lvl.label), `${lvl.label} not in expected-values.csv`);
    assert.ok([CALLS.APPROVE, CALLS.REVIEW].includes(lvl.answer), `${lvl.label} bad answer`);
    if (lvl.answer === CALLS.APPROVE) {
      assert.equal(lvl.badFields.length, 0, `${lvl.label} approve must have no bad fields`);
    } else {
      assert.ok(lvl.badFields.length > 0, `${lvl.label} review must name a field`);
      for (const f of lvl.badFields) assert.ok(FIELD_LABELS[f], `${lvl.label} unknown field ${f}`);
    }
  }
});

test('authored values match the label truth for the answer', () => {
  for (const lvl of LEVELS) {
    const truth = canonical.get(lvl.label);
    const diffs = TEXT_FIELDS.concat('countryOfOrigin')
      .filter((f) => normalize(lvl.values[f] || '') !== normalize(truth[f] || ''));

    if (lvl.unreadable) {
      // Couldn't-read case: values are correct, but the tool can't see them.
      assert.equal(diffs.length, 0, `${lvl.label} (unreadable) should carry correct values`);
      assert.equal(lvl.answer, CALLS.REVIEW);
      continue;
    }
    if (lvl.answer === CALLS.APPROVE) {
      assert.deepEqual(diffs, [], `${lvl.label} approve should match the label on every field`);
    } else {
      // The injected error(s) must be exactly the flagged field(s).
      assert.deepEqual(diffs.sort(), [...lvl.badFields].sort(),
        `${lvl.label} review: the differing fields should be the flagged ones`);
    }
  }
});

test('import levels require a country (except the deliberate-blank lesson)', () => {
  for (const lvl of LEVELS) {
    if (lvl.isImport && lvl.answer === CALLS.APPROVE) {
      assert.ok(lvl.values.countryOfOrigin, `${lvl.label} import+approve needs a country`);
    }
  }
});

test('isCorrectCall / isCorrectField', () => {
  const review = LEVELS.find((l) => l.answer === 'review');
  const approve = LEVELS.find((l) => l.answer === 'approve');
  assert.equal(isCorrectCall(review, 'review'), true);
  assert.equal(isCorrectCall(review, 'approve'), false);
  assert.equal(isCorrectCall(approve, 'approve'), true);
  assert.equal(isCorrectField(review, review.badFields[0]), true);
  assert.equal(isCorrectField(review, 'producer'), review.badFields.includes('producer'));
});
