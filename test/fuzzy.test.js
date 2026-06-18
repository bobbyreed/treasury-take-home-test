import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestMatch, findInText, windows } from '../app/js/pipeline/fuzzy.js';

// Real garbled OCR captured from a Gemini "scene" sample (bourbon bottle in a
// distillery photo) — mean confidence ~36. The point: fuzzy matching still
// recovers the expected values from this noise.
const OCR = `OLD TON | —
° DISTILLERY.
Fo KENTUCKY STRAIGHT
BOURBON WHISK E)
45% Alc,/Vol. (90 poo)`;

test('windows joins adjacent lines and keeps singles', () => {
  const w = windows(['a', 'b', 'c'], 2);
  assert.ok(w.includes('a'));
  assert.ok(w.includes('a b'));
  assert.ok(w.includes('b c'));
  assert.ok(!w.includes('a b c')); // maxSpan = 2
});

test('recovers ABV from garbled OCR', () => {
  const m = findInText('45% Alc./Vol. (90 Proof)', OCR);
  assert.ok(m && m.score < 0.5, `expected ABV match, got ${JSON.stringify(m)}`);
});

test('recovers multi-line class/type via windowing', () => {
  const m = findInText('KENTUCKY STRAIGHT BOURBON WHISKEY', OCR);
  assert.ok(m && m.score < 0.45, `expected class/type match, got ${JSON.stringify(m)}`);
});

test('case/punctuation differences are near-exact (STONE\'S THROW)', () => {
  const m = bestMatch("Stone's Throw", ["STONE'S THROW"]);
  assert.ok(m, 'expected a match');
  assert.ok(m.score < 0.1, `expected near-zero score, got ${m.score}`);
  assert.equal(m.value, "STONE'S THROW");
});

test('an unrelated query does not match at a strict threshold', () => {
  const m = findInText('Cabernet Sauvignon', OCR, { threshold: 0.4 });
  assert.equal(m, null);
});

test('empty inputs return null', () => {
  assert.equal(bestMatch('', ['x']), null);
  assert.equal(bestMatch('x', []), null);
  assert.equal(findInText('x', ''), null);
});
