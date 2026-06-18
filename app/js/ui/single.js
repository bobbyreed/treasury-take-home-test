/**
 * Single-label flow (M5): read the form, run the offline pipeline
 * (preprocess → OCR → extract → compare), and render the verdict card.
 * Browser-only.
 */
import { preprocess } from '../pipeline/preprocess.js';
import { recognize } from '../pipeline/ocr.js';
import { extractFields } from '../pipeline/extract.js';
import { buildReport } from '../pipeline/report.js';
import { renderReport } from './render.js';

/**
 * @param {Document|HTMLElement} root - element with getElementById (pass document)
 */
export function initSingle(root) {
  const byId = (id) => root.getElementById(id);
  const form = byId('verify-form');
  const statusEl = byId('status');
  const resultEl = byId('result');
  const btn = byId('verifyBtn');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const file = byId('labelImage').files[0];
    if (!file) {
      statusEl.textContent = 'Please choose a label image first.';
      return;
    }

    const expected = {
      brandName: byId('brandName').value.trim(),
      classType: byId('classType').value.trim(),
      abv: byId('abv').value.trim(),
      netContents: byId('netContents').value.trim(),
      producer: byId('producer').value.trim(),
      countryOfOrigin: byId('countryOfOrigin').value.trim(),
    };
    const beverageType = byId('beverageType').value;
    const isImport = byId('isImport').checked;
    const binarize = byId('binarize').checked;

    resultEl.innerHTML = '';
    btn.disabled = true;
    const started = performance.now();

    try {
      statusEl.textContent = 'Cleaning up the image…';
      const canvas = await preprocess(file, { binarize });

      statusEl.textContent = 'Reading the label… (the first run also loads the reader)';
      const ocr = await recognize(canvas);

      statusEl.textContent = 'Checking against the application values…';
      const extracted = extractFields(ocr);
      const report = buildReport({ labelId: file.name, expected, extracted, beverageType, isImport });

      const ms = Math.round(performance.now() - started);
      const conf = Number.isFinite(ocr.confidence) ? `${Math.round(ocr.confidence)}%` : 'n/a';
      statusEl.textContent = `Done in ${ms} ms · label-text confidence ${conf}`;

      const card = renderReport(report);
      resultEl.appendChild(card);
      const banner = card.querySelector('.verdict');
      if (banner) banner.focus();
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      statusEl.textContent = `Sorry — couldn't read this label: ${message}. Try a clearer, closer image.`;
    } finally {
      btn.disabled = false;
    }
  });
}
