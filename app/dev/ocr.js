/**
 * Dev harness logic (M2): preprocess a chosen image, run OCR, and show the
 * cleaned canvas, recognized text, mean confidence, and timing. Not part of the
 * product UI — a scratch page for validating the offline pipeline.
 */
import { preprocess } from '../js/pipeline/preprocess.js';
import { recognize } from '../js/pipeline/ocr.js';

const el = (id) => document.getElementById(id);
let file = null;

el('file').addEventListener('change', (e) => {
  file = e.target.files[0] || null;
  el('status').textContent = file ? `Selected: ${file.name}` : 'Pick an image to begin.';
});

el('run').addEventListener('click', async () => {
  if (!file) {
    el('status').textContent = 'Pick an image first.';
    return;
  }
  const t0 = performance.now();
  try {
    el('status').textContent = 'Preprocessing…';
    const canvas = await preprocess(file, { binarize: el('binarize').checked });

    const dst = el('canvas');
    dst.width = canvas.width;
    dst.height = canvas.height;
    dst.getContext('2d').drawImage(canvas, 0, 0);

    el('status').textContent = 'Running OCR (first run also loads the model)…';
    const { text, confidence } = await recognize(canvas);
    const ms = Math.round(performance.now() - t0);
    el('status').textContent =
      `Done in ${ms} ms · mean confidence ${Math.round(confidence)}%`;
    el('text').textContent = text.trim() || '(no text recognized)';
  } catch (err) {
    el('status').textContent = 'OCR error: ' + (err && err.message ? err.message : err);
  }
});
