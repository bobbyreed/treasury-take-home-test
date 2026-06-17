# Vendored Tesseract.js assets

These are added at **M2**. The OCR engine and its data are served from here
(our own Hosting site), **not** a CDN, so OCR works offline and behind the TTB
firewall. Expected contents:

- the Tesseract.js library + worker script
- the WASM core
- the `eng` trained data (`eng.traineddata.gz`)

`app/js/pipeline/ocr.js` loads these by local path.
