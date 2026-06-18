# Vendored Tesseract.js assets

Served from here (our own Hosting site), **not** a CDN, so OCR works offline and
behind the TTB firewall. Loaded by `app/js/pipeline/ocr.js`.

Vendored (from `tesseract.js@7` / `tesseract.js-core@7`):

- `tesseract.esm.min.js` — library (ESM; default export, `Tesseract.createWorker`)
- `worker.min.js` — Tesseract worker script
- `tesseract-core-simd-lstm.wasm.js` + `tesseract-core-simd-lstm.wasm` — the
  SIMD-LSTM core. We force this one variant for determinism; it requires WASM
  SIMD, which all modern desktop browsers support. (Add the non-SIMD `*-lstm`
  core later if a target browser lacks SIMD.)
- `eng.traineddata.gz` — English model, **tessdata_fast** (4.0.0). Fast is chosen
  over `best` for the ~5-second latency budget (quicker load + recognition); the
  optional AI layer covers hard cases. Swapping to `best` is a one-file change.

Total ~8.6 MB. To refresh: `npm pack tesseract.js@7 tesseract.js-core@7`, copy the
files above from the tarballs, and re-download the `eng` data from
`https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz`.
