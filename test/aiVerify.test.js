import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiFieldsToExtracted, diffFields } from '../app/js/pipeline/aiVerify.js';
import { buildReport } from '../app/js/pipeline/report.js';
import { CANONICAL_WARNING } from '../app/js/pipeline/compare.js';

const AI = {
  brandName: 'Viking Blood',
  classType: 'Cherry Mead (Honey Wine with cherries)',
  abv: '13.5% VOL.',
  netContents: '750 mL',
  producer: 'Produced & Bottled by Heritage Meadery, Burlington, VT',
  countryOfOrigin: '',
  warningText: CANONICAL_WARNING,
  warningAllCaps: true,
  readable: true,
  source: 'AI',
};

test('aiFieldsToExtracted: parses ABV/net and synthesizes rawText', () => {
  const ex = aiFieldsToExtracted(AI, 95);
  assert.equal(ex.source, 'AI');
  assert.equal(ex.abv.percent, 13.5);
  assert.equal(ex.netContents.ml, 750);
  assert.equal(ex.ocrConfidence, 95);
  assert.equal(ex.garbledRatio, 0);
  // free-text values are present in rawText so compare.js can match them
  assert.match(ex.rawText, /Viking Blood/);
  assert.match(ex.rawText, /Heritage Meadery/);
  // empty AI fields become null, not ""
  assert.equal(ex.countryOfOrigin, null);
});

test('AI reading flows through buildReport to a PASS', () => {
  const ex = aiFieldsToExtracted(AI, 95);
  const r = buildReport({
    extracted: ex,
    usedAI: true,
    expected: {
      brandName: 'Viking Blood',
      classType: 'Cherry Mead (Honey Wine with cherries)',
      abv: '13.5% VOL.',
      netContents: '750 mL',
      producer: 'Produced & Bottled by Heritage Meadery, Burlington, VT',
    },
  });
  assert.equal(r.overall, 'PASS');
  assert.equal(r.usedAI, true);
  assert.equal(r.fields.find((f) => f.field === 'abv').status, 'MATCH');
});

test('readable:false forces the "couldn\'t read" path (LOW_CONFIDENCE, not MISMATCH)', () => {
  const ex = aiFieldsToExtracted({ ...AI, readable: false, brandName: '' }, 30);
  assert.equal(ex.garbledRatio, 1);
  const r = buildReport({
    extracted: ex,
    usedAI: true,
    expected: { ...AI, brandName: 'Viking Blood' },
  });
  assert.equal(r.fields.find((f) => f.field === 'brandName').status, 'LOW_CONFIDENCE');
});

test('diffFields reports per-field status changes from offline to AI', () => {
  const offline = { fields: [
    { field: 'brandName', status: 'MISMATCH' },
    { field: 'abv', status: 'MATCH' },
  ] };
  const ai = { fields: [
    { field: 'brandName', status: 'MATCH' },
    { field: 'abv', status: 'MATCH' },
  ] };
  const deltas = diffFields(offline, ai);
  assert.equal(deltas.length, 1);
  assert.deepEqual(deltas[0], { field: 'brandName', before: 'MISMATCH', after: 'MATCH' });
});

test('diffFields: empty when readings agree', () => {
  const same = { fields: [{ field: 'abv', status: 'MATCH' }] };
  assert.deepEqual(diffFields(same, same), []);
});
