# Sample labels

Test inputs, organized by **render condition** rather than by which AI tool drew
them. Every image is one of 25 fictional products defined in
[`ai-generated/labelIdeas.md`](./ai-generated/labelIdeas.md); the prompts that
produced them are in [`image-prompts.md`](./image-prompts.md).

## Layout

```
ai-generated/
  clean/       flat labels filling the frame (the demo / happy-path set)
  distorted/   the same products shot held-in-hand, curved, dark, off-axis
  scene/       bottle-in-environment renders (label is a small part of the frame)
  labelIdeas.md
  label-verification-results-example.csv   (an example batch run, historical)
expected-values.csv
image-prompts.md
```

- **`clean/` (18)** — straight-on, fills the frame, every required field legible.
  This is what the tool is built for and what the batch demo runs against.
- **`distorted/` (24)** — robustness set: held in a hand, bottle curvature,
  glare, low light, rotation. Most share a **basename** with their `clean/` twin
  (e.g. `clean/CityCenter.png` ↔ `distorted/CityCenter.png`) so a single
  `expected-values.csv` row verifies both. `PioneerCellars-2.png` is a second
  distorted take.
- **`scene/` (5)** — bottle-in-scene renders where the label is ~10% of the frame
  (`OldTomDistillery`, `SilverCreekVineyard`, `ChateauDeLaRoche`,
  `PacificCoastDistillers`). These reliably come back NEEDS_REVIEW and exercise
  the "couldn't read" path; kept out of the clean set so it stays clean.

## `expected-values.csv`

One row per product, keyed by **basename** so it pairs with the matching image in
any folder. Columns: `filename, isImport, brandName, classType, abv,
netContents, producer, countryOfOrigin`. The batch UI pairs images to rows by
basename, so folder location does not matter.

## Provenance & coverage notes

- Most labels were generated with Gemini; `PacificCoastDistillers` and the
  `ChateauDeLaRoche` scene render came from ChatGPT.
- Six products have **no clean flat label** (only scene and/or distorted renders):
  Silver Creek Vineyard, Château de la Roche, Red Barrel Cellars, Cider House
  Rules, Old Tom Distillery, Blue Sky Distilling. Profile #4 (Pacific Coast
  Vintners Chardonnay) has no image at all.
- `BlackbeardCove` lists "Product of Guyana & Jamaica"; because it is bottled
  domestically (Caribbean Imports, Miami) and the origin spans two countries, it
  is recorded as **not** an import with no single country of origin.
