import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rulesFor, BEVERAGE_RULES } from '../app/js/pipeline/rules.js';

// Scaffold smoke tests: confirm ESM wiring and the beverage-rules table.
// Feature tests for comparison/extraction arrive at M3/M4.

test('beverage rules table is wired', () => {
  assert.ok(BEVERAGE_RULES.spirits, 'spirits rules exist');
  const r = rulesFor('spirits');
  assert.ok(r.requiredFields.includes('warning'), 'warning is always required');
  assert.equal(r.abvRequired, true, 'spirits require ABV');
});

test('imports additionally require country of origin', () => {
  const r = rulesFor('wine', true);
  assert.ok(r.requiredFields.includes('countryOfOrigin'));
});

test('unknown beverage type falls back to "other"', () => {
  const r = rulesFor('mead');
  assert.equal(r.beverageType, 'other');
});
