/**
 * Single-label flow (M5): read the form, run the offline pipeline
 * (preprocess → OCR → extract → compare), and render the verdict card.
 *
 * M7 adds an OPTIONAL "Double-check with AI" step: it sends the image + OCR
 * text to the verifyLabel function and re-runs the SAME comparison engine on
 * the AI's reading. It's strictly additive — if it's offline/unreachable the
 * offline verdict already stands. Browser-only.
 */
import { runVerification } from '../pipeline/run.js';
import { buildReport } from '../pipeline/report.js';
import { aiFieldsToExtracted, diffFields } from '../pipeline/aiVerify.js';
import { renderReport } from './render.js';
import { fileToPayload, requestVerify } from './verifyClient.js';

const FIELD_LABEL = {
  brandName: 'brand name', classType: 'class/type', abv: 'alcohol content',
  netContents: 'net contents', producer: 'producer', countryOfOrigin: 'country of origin',
  warning: 'government warning',
};

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

  // Results render in a side panel (desktop) that becomes an overlay over the
  // form on narrow screens; `.has-result` drives both. The close button only
  // shows on the mobile overlay.
  const resultCol = byId('result-col');
  const resultsClose = byId('resultsClose');
  if (resultsClose && resultCol) {
    resultsClose.addEventListener('click', () => {
      resultCol.classList.remove('has-result');
      if (btn) btn.focus();
    });
  }

  // Country of origin only applies to imports — keep it disabled (and cleared)
  // until "Imported" is checked, so the field can't carry a stale value.
  const importBox = byId('isImport');
  const countryInput = byId('countryOfOrigin');
  if (importBox && countryInput) {
    const syncCountry = () => {
      countryInput.disabled = !importBox.checked;
      if (!importBox.checked) countryInput.value = '';
    };
    importBox.addEventListener('change', syncCountry);
    syncCountry();
  }

  // Live preview of the chosen label, so the agent can read it while typing the
  // application values.
  const fileInput = byId('labelImage');
  const preview = byId('preview');
  const previewPlaceholder = byId('previewPlaceholder');
  let previewUrl = null;
  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const f = fileInput.files[0];
      if (f) {
        previewUrl = URL.createObjectURL(f);
        preview.src = previewUrl;
        preview.hidden = false;
        if (previewPlaceholder) previewPlaceholder.hidden = true;
      } else {
        preview.hidden = true;
        preview.removeAttribute('src');
        if (previewPlaceholder) previewPlaceholder.hidden = false;
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const file = byId('labelImage').files[0];
    if (!file) {
      statusEl.textContent = 'Please choose a label image first.';
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      statusEl.textContent = 'That doesn’t look like an image file. Choose a photo or scan of the label (PNG, JPG, etc.).';
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
    const isImport = byId('isImport').checked;
    const binarize = byId('binarize').checked;

    resultEl.innerHTML = '';
    if (resultCol) resultCol.classList.remove('has-result');
    btn.disabled = true;

    try {
      statusEl.textContent = 'Reading the label and checking it… (the first run also loads the reader)';
      const { ocr, report, ms } = await runVerification(file, {
        expected, isImport, binarize, labelId: file.name,
      });

      const conf = Number.isFinite(ocr.confidence) ? `${Math.round(ocr.confidence)}%` : 'n/a';
      statusEl.textContent = `Done in ${ms} ms · label-text confidence ${conf}`;

      const card = renderReport(report);
      resultEl.appendChild(card);
      if (resultCol) resultCol.classList.add('has-result');
      const banner = card.querySelector('.verdict');
      if (banner) banner.focus();

      appendAiPanel(resultEl, {
        file, ocrText: ocr.text, expected, isImport, offlineReport: report,
      });
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      statusEl.textContent = `Sorry — couldn't read this label: ${message}. Try a clearer, closer image.`;
    } finally {
      btn.disabled = false;
    }
  });
}

/**
 * Render the optional "Double-check with AI" panel below the offline verdict.
 * @param {HTMLElement} container
 * @param {{file: File, ocrText: string, expected: object,
 *          isImport: boolean, offlineReport: object}} ctx
 */
function appendAiPanel(container, ctx) {
  const panel = document.createElement('section');
  panel.className = 'ai-panel';

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'ai-button';
  action.textContent = 'Double-check with AI (online)';

  const note = document.createElement('p');
  note.className = 'ai-note';
  note.textContent = 'Optional: sends the image to a server-side model for a second reading. '
    + 'The offline result above does not depend on it.';

  const out = document.createElement('div');
  out.className = 'ai-result';
  out.setAttribute('aria-live', 'polite');

  panel.append(action, note, out);
  container.appendChild(panel);

  action.addEventListener('click', async () => {
    action.disabled = true;
    out.innerHTML = '';
    note.textContent = 'Asking the AI to read the label…';
    try {
      const image = await fileToPayload(ctx.file);
      const resp = await requestVerify({
        image, ocrText: ctx.ocrText, expected: ctx.expected,
      });

      const aiExtracted = aiFieldsToExtracted(resp.extracted || {}, resp.confidence);
      const aiReport = buildReport({
        labelId: ctx.file.name, expected: ctx.expected, extracted: aiExtracted,
        isImport: ctx.isImport, usedAI: true,
      });
      const deltas = diffFields(ctx.offlineReport, aiReport);

      note.textContent = Number.isFinite(resp.confidence)
        ? `AI reading · confidence ${Math.round(resp.confidence)}%`
        : 'AI reading';

      const heading = document.createElement('h3');
      heading.className = 'ai-heading';
      heading.tabIndex = -1;
      heading.textContent = 'AI verification';
      out.appendChild(heading);
      out.appendChild(renderDeltas(deltas, resp.notes));
      out.appendChild(renderReport(aiReport));
      heading.focus();
    } catch (err) {
      note.textContent = '';
      out.appendChild(renderUnavailable(err && err.message ? err.message : String(err)));
      action.disabled = false; // allow a retry (e.g. transient network)
    }
  });
}

function renderDeltas(deltas, notes) {
  const p = document.createElement('p');
  p.className = 'ai-deltas';
  if (!deltas.length) {
    p.textContent = 'The AI reading agrees with the offline result on every field.';
  } else {
    const list = deltas
      .map((d) => `${FIELD_LABEL[d.field] || d.field} (${d.before} → ${d.after})`)
      .join(', ');
    p.textContent = `AI changed ${deltas.length} field${deltas.length > 1 ? 's' : ''}: ${list}.`;
  }
  if (notes) {
    const small = document.createElement('span');
    small.className = 'ai-model-note';
    small.textContent = ` Note: ${notes}`;
    p.appendChild(small);
  }
  return p;
}

function renderUnavailable(message) {
  const p = document.createElement('p');
  p.className = 'ai-unavailable';
  p.textContent = `AI double-check unavailable — ${message}. `
    + 'This is expected offline or on a network that blocks the model endpoint; '
    + 'the offline verdict above still stands.';
  return p;
}
