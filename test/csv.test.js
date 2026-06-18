import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../app/js/pipeline/csv.js';

test('parseCsv: header + rows into objects', () => {
  const { headers, rows } = parseCsv('filename,beverageType\na.png,wine\nb.png,beer\n');
  assert.deepEqual(headers, ['filename', 'beverageType']);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { filename: 'a.png', beverageType: 'wine' });
});

test('parseCsv: quoted field with commas (producer line)', () => {
  const text = 'filename,producer\nx.png,"Bottled by Acme, Inc., Reno, NV"\n';
  const { rows } = parseCsv(text);
  assert.equal(rows[0].producer, 'Bottled by Acme, Inc., Reno, NV');
});

test('parseCsv: escaped quotes and trailing row without newline', () => {
  const { rows } = parseCsv('a,b\n"she said ""hi""",2');
  assert.equal(rows[0].a, 'she said "hi"');
  assert.equal(rows[0].b, '2');
});

test('parseCsv: empty input', () => {
  assert.deepEqual(parseCsv(''), { headers: [], rows: [] });
});

test('toCsv: quotes fields containing commas/quotes/newlines; round-trips', () => {
  const headers = ['filename', 'producer'];
  const rows = [{ filename: 'x.png', producer: 'Bottled by Acme, "Inc."' }];
  const csv = toCsv(headers, rows);
  assert.equal(csv.split('\n')[0], 'filename,producer');
  assert.deepEqual(parseCsv(csv).rows[0], rows[0]);
});
