/**
 * Guards the batch-test fixtures: builds an *ideal* OCR read from the correct
 * values in expected-values.csv, then runs each deliberately-wrong row of
 * batch-tests/mismatches.csv through the real engine and asserts the documented
 * catch. This cross-checks the two CSVs against each other and against the
 * comparison logic, so an edit to either that breaks the scenario table fails CI.
 *
 * It does NOT run OCR — it assumes a clean read (high confidence, no garble), so
 * Viking Blood PASSES here (in reality its gold-on-crimson ABV/net are
 * unreadable offline → NEEDS_REVIEW → PASS via the AI double-check).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCsv } from '../app/js/pipeline/csv.js';
import { extractFields } from '../app/js/pipeline/extract.js';
import { buildReport } from '../app/js/pipeline/report.js';
import { CANONICAL_WARNING } from '../app/js/pipeline/compare.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'sample-labels');
const load = (p) => parseCsv(readFileSync(join(root, p), 'utf8')).rows;

const correctByFile = new Map(load('expected-values.csv').map((r) => [r.filename, r]));
const mismatchRows = load('batch-tests/mismatches.csv');

// Ideal OCR text = exactly what a perfect read of the correct label yields.
function idealText(correct) {
  return [
    correct.brandName, correct.classType, correct.abv, correct.netContents,
    correct.producer, correct.countryOfOrigin, CANONICAL_WARNING,
  ].filter(Boolean).join('\n');
}

// Expected catch per filename: [field, status, overall].
const EXPECT = {
  'BlackbeardCove.png': ['abv', 'MISMATCH', 'NEEDS_REVIEW'],
  'CityCenter.png': ['netContents', 'MISMATCH', 'NEEDS_REVIEW'],
  'GoldenHarvest.png': ['brandName', 'MISMATCH', 'NEEDS_REVIEW'],
  'HighDesert.png': ['countryOfOrigin', 'MISSING', 'NEEDS_REVIEW'],
  'HighlandCask.png': ['countryOfOrigin', 'MISMATCH', 'NEEDS_REVIEW'],
  'IslandHeat.png': ['classType', 'MISMATCH', 'NEEDS_REVIEW'],
  'JuniperGrove.png': ['abv', 'MISMATCH', 'NEEDS_REVIEW'],
  'LakesideMeadery.png': ['netContents', 'MISMATCH', 'NEEDS_REVIEW'],
  'MadScientist.png': ['brandName', 'MINOR_DIFFERENCE', 'PASS'],
  'MountainPeak.png': ['producer', 'MISMATCH', 'NEEDS_REVIEW'],
  'OldPort.png': ['netContents', 'MISMATCH', 'NEEDS_REVIEW'],
  'PacificCoastDistillers.png': ['abv', 'MISMATCH', 'NEEDS_REVIEW'],
  'PioneerCellars.png': ['classType', 'MISMATCH', 'NEEDS_REVIEW'],
  'PrairieDew.png': ['brandName', 'MISMATCH', 'NEEDS_REVIEW'],
  'RioAzul.png': ['countryOfOrigin', 'MISMATCH', 'NEEDS_REVIEW'],
  'SmokyMountain.png': ['netContents', 'MISMATCH', 'NEEDS_REVIEW'],
  'SpicyBadger.png': ['abv', 'MISMATCH', 'NEEDS_REVIEW'],
  'VikingBlood.png': [null, null, 'PASS'], // correct values; passes on an ideal read
};

test('every mismatch row pairs with a correct expected-values row', () => {
  for (const r of mismatchRows) {
    assert.ok(correctByFile.has(r.filename), `no expected-values row for ${r.filename}`);
    assert.ok(EXPECT[r.filename], `no documented expectation for ${r.filename}`);
  }
  assert.equal(mismatchRows.length, Object.keys(EXPECT).length);
});

for (const r of mismatchRows) {
  test(`mismatches.csv: ${r.filename}`, () => {
    const correct = correctByFile.get(r.filename);
    const extracted = extractFields({ text: idealText(correct), confidence: 90 });
    const report = buildReport({
      labelId: r.filename,
      expected: {
        brandName: r.brandName, classType: r.classType, abv: r.abv,
        netContents: r.netContents, producer: r.producer, countryOfOrigin: r.countryOfOrigin,
      },
      extracted,
      beverageType: r.beverageType,
      isImport: r.isImport === 'true',
    });

    const [field, status, overall] = EXPECT[r.filename];
    assert.equal(report.overall, overall, `overall for ${r.filename}`);
    if (field) {
      const fc = report.fields.find((f) => f.field === field);
      assert.ok(fc, `field ${field} present for ${r.filename}`);
      assert.equal(fc.status, status, `${field} status for ${r.filename}`);
    }
  });
}
