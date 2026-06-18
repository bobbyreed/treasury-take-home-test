# Architecture review — consolidation phase, step 1

A look at the code as it stands after the first full prototype (M5), to guide the
tidy-first refactor, the coverage push, and the requirements pass.

## Module map & data flow

```
Browser (offline core)
  ui/main.js → ui/single.js ──┐
                              │  pipeline/preprocess.js (canvas: grayscale, Otsu)  [browser]
                              │  pipeline/ocr.js        (Tesseract.js worker)       [browser]
                              ▼
  pipeline/extract.js  (parse ABV / net / warning; surface rawText)  [pure]
  pipeline/compare.js  (normalize, free-text/fuzzy/coverage, ABV/net, warning) [pure]
  pipeline/fuzzy.js    (Fuse windowing)                              [pure]
  pipeline/rules.js    (beverage required-field table)               [pure]
  pipeline/report.js   (buildReport → verdict)                       [pure]
                              ▼
  ui/render.js (verdict card)  [browser]

Optional online: ui/ai/verifyClient.js → functions/verifyLabel → Claude (M7, stub)
```

The **pure** modules carry the risk and hold all 47 tests; the **browser** modules
(preprocess, ocr, ui) are thin adapters.

## What's working well
- Clean **offline-first** split; the LLM is an isolated, optional booster.
- Pure, deterministic core that's fully unit-testable without a browser.
- Vendored OCR + fuzzy (no CDN) — survives the firewall.
- Verdict logic driven by an explicit beverage-rule table.

## Seams & smells (structural — tidy-first candidates)
1. **Status strings duplicated.** `'MATCH' | 'MINOR_DIFFERENCE' | ...` appear as
   literals in `compare.js`, `report.js`, and `render.js` (STATUS_META). Three
   sources of truth for one enum.
2. **Scattered constants.** `CANONICAL_WARNING`, `LOW_CONFIDENCE_BELOW`, the
   coverage thresholds (0.9 / 0.78 / 0.7), and the fuzzy thresholds live as
   literals inside functions.
3. **Overlapping text utilities.** `normalize` / `tokens` / `coverage` live in
   `compare.js`; `fuzzy.js` has its own windowing and Fuse options. A shared
   `text-utils` module would de-duplicate and clarify ownership.
4. **Implicit data shapes.** `ExtractedFields` / `FieldComparison` /
   `VerificationReport` exist only as prose JSDoc spread across files; one
   typedef module would centralize the contract.
5. **Pure/browser boundary is implicit.** `pipeline/` mixes pure modules with
   `preprocess`/`ocr` (browser-only). Worth at least documenting; possibly a
   `pipeline/` (pure) vs `io/` (browser adapters) split — low priority.

## Behavioral needs surfaced by testing (after tidy, not during)
- **Per-field confidence ("unreadable vs wrong").** `ocr.js` already returns
  per-word confidence (`words[].confidence`); extract/compare only use the
  overall mean. Threading field-level confidence is the main behavioral change
  the testing surfaced (Viking Blood brand vs a true mismatch).
- **Preprocessing for low-contrast colored labels** (binarize default / adaptive).
  Decision pending the "clean up off" experiment. Behavioral.
- *(Latency is explicitly out of scope — see `testing-findings.md`.)*

## Coverage gaps (for step 3)
- Untested: `preprocess` (but `otsuThreshold` is pure and could be exported +
  tested), `ocr` (worker config — browser), `ui/single` + `ui/render` (DOM),
  `ai/verifyClient` (stub).
- Well-covered: rules, extract parsers, fuzzy, compare, report.

## Recommended sequence
1. **Tidy-first (structural, behavior-preserving, each its own commit):**
   status-constant module → constants module (warning + thresholds) → shared
   `text-utils` → typedefs. No test should change behavior; the 47 stay green.
2. **Coverage:** export pure helpers (e.g. `otsuThreshold`), add tests toward 80%.
3. **Behavioral:** per-field confidence; preprocessing decision.
4. **Requirements:** personas + user stories from the interviews; trace features.

The tidy-first items (1) are low-risk and make the behavioral change (per-field
confidence) and the requirements traceability easier to land cleanly.
