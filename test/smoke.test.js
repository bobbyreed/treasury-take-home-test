import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rulesFor, FIELDS } from '../app/js/pipeline/rules.js';

// Confirm ESM wiring and the fixed required-field rule.

test('every label requires the fixed field set, including the warning', () => {
  const r = rulesFor();
  for (const f of ['brandName', 'classType', 'abv', 'netContents', 'producer', 'warning']) {
    assert.ok(r.requiredFields.includes(f), `${f} is required`);
  }
  assert.ok(!r.requiredFields.includes('countryOfOrigin'), 'country not required for domestic');
});

test('imports additionally require country of origin', () => {
  assert.ok(rulesFor(true).requiredFields.includes('countryOfOrigin'));
});

test('FIELDS table is wired', () => {
  assert.ok(FIELDS.includes('warning'));
  assert.ok(FIELDS.includes('countryOfOrigin'));
});
