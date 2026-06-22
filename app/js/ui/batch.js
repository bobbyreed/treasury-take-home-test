/**
 * Batch flow (M6): verify many labels at once. Pair uploaded images to rows in
 * an expected-values CSV (by filename), run them through a Tesseract worker pool
 * with bounded concurrency, stream results into a table (filterable to
 * needs-review), and export the results as CSV. Browser-only.
 */
import { preprocess } from '../pipeline/preprocess.js';
import { createPool } from '../pipeline/ocr.js';
import { extractFields } from '../pipeline/extract.js';
import { buildReport } from '../pipeline/report.js';
import { parseCsv, toCsv } from '../pipeline/csv.js';

const FIELDS = ['brandName', 'classType', 'abv', 'netContents', 'producer', 'countryOfOrigin', 'warning'];
const PASSING = new Set(['MATCH', 'MINOR_DIFFERENCE']);

const FIELD_LABEL = {
  brandName: 'Brand', classType: 'Class/type', abv: 'ABV', netContents: 'Net contents',
  producer: 'Producer', countryOfOrigin: 'Country', warning: 'Warning',
};
const STATUS_LABEL = {
  MISMATCH: 'does not match', MISSING: 'missing', LOW_CONFIDENCE: "couldn't read",
};
const OVERALL_LABEL = { PASS: 'PASS', NEEDS_REVIEW: 'NEEDS REVIEW', NO_DATA: 'No application data', ERROR: 'Error' };
const OVERALL_CLS = { PASS: 'ok', NEEDS_REVIEW: 'warn', NO_DATA: 'muted', ERROR: 'bad' };

const basename = (n) => String(n).split(/[\\/]/).pop().trim().toLowerCase();
const truthy = (v) => /^(true|yes|y|1)$/i.test(String(v ?? '').trim());

export function initBatch(root) {
  const byId = (id) => root.getElementById(id);
  const runBtn = byId('run');
  if (!runBtn) return;

  let results = [];

  runBtn.addEventListener('click', async () => {
    const images = Array.from(byId('images').files || []);
    const csvFile = byId('csv').files[0];
    const binarize = byId('binarize').checked;
    const concurrency = Math.max(1, Math.min(8, parseInt(byId('concurrency').value, 10) || 4));
    const statusEl = byId('status');
    const progress = byId('progress');
    const exportBtn = byId('export');
    const resultsEl = byId('results');

    if (!images.length) { statusEl.textContent = 'Choose label images first.'; return; }

    const rowsByFile = new Map();
    if (csvFile) {
      const { rows } = parseCsv(await csvFile.text());
      for (const r of rows) if (r.filename) rowsByFile.set(basename(r.filename), r);
    }

    results = [];
    resultsEl.innerHTML = '';
    exportBtn.disabled = true;
    runBtn.disabled = true;
    progress.max = images.length;
    progress.value = 0;
    progress.hidden = false;
    statusEl.textContent = `Starting ${concurrency} OCR workers…`;

    let scheduler = null;
    let done = 0;
    const t0 = performance.now();

    try {
      scheduler = await createPool(concurrency);
      await runPool(images, concurrency, async (file) => {
        const row = rowsByFile.get(basename(file.name));
        try {
          const canvas = await preprocess(file, { binarize });
          const { data } = await scheduler.addJob('recognize', canvas);
          const extracted = extractFields(data);
          if (!row) {
            return { file: file.name, overall: 'NO_DATA', fields: [], confidence: data.confidence };
          }
          const report = buildReport({
            labelId: file.name,
            expected: {
              brandName: row.brandName, classType: row.classType, abv: row.abv,
              netContents: row.netContents, producer: row.producer, countryOfOrigin: row.countryOfOrigin,
            },
            isImport: truthy(row.isImport),
            extracted,
          });
          return { file: file.name, overall: report.overall, fields: report.fields, confidence: data.confidence };
        } catch (err) {
          return { file: file.name, overall: 'ERROR', fields: [], error: err && err.message ? err.message : String(err) };
        }
      }, (res) => {
        results.push(res);
        done += 1;
        progress.value = done;
        statusEl.textContent = `Processed ${done} / ${images.length}…`;
        appendRow(resultsEl, res, byId('needsReviewOnly').checked);
      });
    } catch (err) {
      statusEl.textContent = `Couldn’t run the batch: ${err && err.message ? err.message : err}. `
        + 'Try again, or reduce the number of OCR workers.';
      progress.hidden = true;
      return;
    } finally {
      if (scheduler) await scheduler.terminate();
      runBtn.disabled = false;
    }

    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    const review = results.filter((r) => r.overall !== 'PASS').length;
    statusEl.textContent = `Done — ${results.length} labels in ${secs}s · ${review} need review.`;
    exportBtn.disabled = results.length === 0;
  });

  byId('needsReviewOnly').addEventListener('change', () => {
    const only = byId('needsReviewOnly').checked;
    root.querySelectorAll('#results tbody tr').forEach((tr) => {
      tr.hidden = only && tr.dataset.overall === 'PASS';
    });
  });

  byId('export').addEventListener('click', () => {
    const headers = ['file', 'overall', ...FIELDS, 'confidence'];
    const rows = results.map((r) => {
      const o = {
        file: r.file,
        overall: r.overall,
        confidence: r.confidence != null ? Math.round(r.confidence) : '',
      };
      for (const f of FIELDS) o[f] = (r.fields.find((x) => x.field === f) || {}).status || '';
      return o;
    });
    download('label-verification-results.csv', toCsv(headers, rows));
  });
}

/** Run `fn` over `items` with at most `n` in flight; `onEach(result)` per finish. */
async function runPool(items, n, fn, onEach) {
  let index = 0;
  async function runner() {
    while (index < items.length) {
      const i = index;
      index += 1;
      const result = await fn(items[i], i);
      onEach(result, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, runner));
}

function ensureTable(container) {
  let table = container.querySelector('table');
  if (!table) {
    table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML =
      '<thead><tr><th>File</th><th>Result</th><th>Flagged fields</th><th>Conf.</th></tr></thead><tbody></tbody>';
    container.appendChild(table);
  }
  return table.querySelector('tbody');
}

function appendRow(container, res, needsReviewOnly) {
  const tbody = ensureTable(container);
  const tr = document.createElement('tr');
  tr.dataset.overall = res.overall;
  tr.className = OVERALL_CLS[res.overall] || '';
  if (needsReviewOnly && res.overall === 'PASS') tr.hidden = true;

  const flaggedText = (res.fields || [])
    .filter((f) => !PASSING.has(f.status))
    .map((f) => `${FIELD_LABEL[f.field] || f.field}: ${STATUS_LABEL[f.status] || f.status}`)
    .join('; ');
  const flagged = flaggedText || res.error || (res.overall === 'PASS' ? '—' : '');

  tr.innerHTML =
    `<td>${esc(res.file)}</td>` +
    `<td>${esc(OVERALL_LABEL[res.overall] || res.overall)}</td>` +
    `<td>${esc(flagged)}</td>` +
    `<td>${res.confidence != null ? Math.round(res.confidence) + '%' : '—'}</td>`;
  tbody.appendChild(tr);
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
