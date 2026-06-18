import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, tokens, coverage } from '../app/js/pipeline/text.js';

test('normalize: null/undefined → empty string', () => {
  assert.equal(normalize(null), '');
  assert.equal(normalize(undefined), '');
});

test('normalize: strips diacritics, unifies quotes and dashes', () => {
  assert.equal(normalize('Café'), 'cafe');
  assert.equal(normalize('“Quote”—’s'), 'quote s');
});

test('tokens: splits and drops empties', () => {
  assert.deepEqual(tokens('  Old   Tom  '), ['old', 'tom']);
  assert.deepEqual(tokens(''), []);
});

test('coverage: empty want → 0; partial and full presence', () => {
  assert.equal(coverage([], 'anything'), 0);
  assert.equal(coverage(['old', 'tom'], 'old tom distillery'), 1);
  assert.equal(coverage(['old', 'tom', 'gin'], 'old tom only'), 2 / 3);
});
