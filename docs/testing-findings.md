# M5 testing findings (first-prototype validation)

Empirical observations from running the real generated labels through the
single-label prototype. These are the raw input for the requirements / user-story
pass in the engineering-consolidation phase (IMPLEMENTATION_PLAN §12).

## Results so far
- **City Center** (beer) — full PASS.
- **High Desert** (mezcal, import) — PASS. The 3-line producer matched via token
  coverage; country of origin (MEXICO) matched; class/type minor difference.
- **Smoky Mountain** (spirits) — PASS. The large display class/type
  (`Moonshine (Corn Whiskey)`) read after the PSM fix; brand/producer minor
  differences (case).
- **Viking Blood** (mead) — brand recovered despite the runic 3-D font (OCR read
  "Viking Slood", fuzzy 0.17 → MATCH); class/type and the gold-on-crimson
  ABV/net contents were not read.

## OCR limits observed
- **Decorative / 3-D display fonts** (Viking Blood title): largely unreadable;
  fuzzy recovered a partial read once, but it's unreliable.
- **Low-contrast colored text** (gold on dark crimson — ABV, net contents): not
  read. Our global Otsu binarization can merge the two; worth testing with
  "clean up image" OFF. Candidate fix: adaptive/local thresholding, or defer to
  the AI layer.
- **Large display titles were dropped** until the page-seg mode was set to AUTO
  (PSM 3). Fixed.

## Performance — target the AVERAGE, not the worst case (decision)
- Latency varies widely: **Smoky Mountain ~2s** vs **High Desert ~7s**.
- **Decision (Bobby):** treat Sarah's ~5-second target as the **average across a
  representative set**, not a hard per-image cap. Complex or poor-quality images
  will run longer, and that's acceptable — it mirrors the human workflow. We will
  **not** aggressively optimize OCR for the slow tail: the risk of regressing the
  accuracy we just fixed outweighs the benefit. Measure the average across the
  full label set; only revisit if that average exceeds ~5s.

## UX requests / ideas
- **Image preview while filling the form** so the agent can read the label as
  they type the application values. (Added.)
- Possible **side-by-side** layout (image + form) as a later refinement.
- **"Unreadable" vs "wrong":** per-field confidence so a field that is legible to
  a human but unreadable by OCR reports "couldn't read" rather than "does not
  match" — instead of one blunt overall confidence number.

## Batch run over the gemini folder (M6 validation)
- **Clean labels pass at scale:** the 4 clean labels with CSV rows (CityCenter,
  HighDesert, MountainPeak, SmokyMountain) all PASSED; case-only differences
  correctly read as MINOR_DIFFERENCE.
- **`NO_DATA`** rows = images with no matching CSV row (the example CSV had 8
  rows). Extend `expected-values.csv` to verify the whole set.
- **Scene renders flagged correctly:** the early bottle-in-scene images (label
  ~10% of frame) came back NEEDS_REVIEW with most fields MISMATCH + warning
  MISSING. **Done:** the corpus was reorganized into `clean/` (18), `distorted/`
  (24), and `scene/` (5); distorted twins were renamed to share their clean
  twin's basename, and `expected-values.csv` was extended to one row per product
  (24) keyed by basename so it pairs across all three folders. See
  `sample-labels/README.md`. (Filenames in this doc predate that rename.)
- **Per-field-confidence boundary (key finding):** Viking Blood matched brand
  (fuzzy), producer, and warning, but its **gold-on-crimson ABV/net and decorative
  class line read as MISMATCH, not LOW_CONFIDENCE.** The garbled-word ratio only
  trips on *whole-label* unreadability; a *single* unreadable field on an
  otherwise-clean label still mismatches. Localizing confidence per field is hard
  from OCR alone — this is the **AI-layer (M7)** case. *Possible cheap refinement
  to evaluate:* when a structured field (ABV/net) isn't found **anywhere** in an
  otherwise-readable label, lean toward "couldn't read" rather than mismatch.

## Matching wins to preserve
- Token-coverage matching fixed the multi-line producer false-mismatch.
- Fuzzy "present, not perfect" handled all-caps (Smoky Mountain) and OCR slips
  (Viking "Slood") correctly.
