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

## Matching wins to preserve
- Token-coverage matching fixed the multi-line producer false-mismatch.
- Fuzzy "present, not perfect" handled all-caps (Smoky Mountain) and OCR slips
  (Viking "Slood") correctly.
