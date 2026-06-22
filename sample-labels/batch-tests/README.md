# Batch test scenarios

Input fixtures for the **Batch** screen, to demo and QA the verdict engine
across the clean label set — both the happy path and deliberately wrong
application data ("incorrect reads").

The batch screen pairs each uploaded image to a CSV row **by filename**, so a
run is just: pick the image folder, then pick one of these CSVs.

## How to run

1. Open the app → **Batch**.
2. **Images:** select all of `sample-labels/ai-generated/clean/` (18 labels).
3. **CSV:** pick one of:
   - **All-correct baseline →** `../expected-values.csv` (the canonical correct
     values; the batch ignores rows whose filename isn't in your image set).
   - **Incorrect reads →** `mismatches.csv` (this folder).
4. Run, then use the **needs-review filter** and **Export CSV**.

> The expected outcomes below assume OCR reads the clean labels well (it does for
> this set). OCR is not perfectly deterministic — a hard clean label (e.g. the
> angled Pioneer Cellars) may occasionally route a field to *"couldn't read"*
> (LOW_CONFIDENCE) instead of the listed verdict. That's still a NEEDS_REVIEW.

## Baseline (`../expected-values.csv` over `clean/`)

All 18 PASS **except Viking Blood**, whose ABV and net contents are gold-on-dark
text OCR can't see — it comes back NEEDS_REVIEW offline and flips to PASS via the
single-label **Double-check with AI** button. (This is the M7 showcase case.)

## Incorrect reads (`mismatches.csv` over `clean/`)

Each row mutates **one** field from the correct value (except where noted), to
exercise a different comparison branch and the import rule. Expected result of an
**offline** batch run:

| Label | Injected change | Field caught | Overall |
|---|---|---|---|
| BlackbeardCove | ABV 35% → **40%** | alcohol content | NEEDS_REVIEW |
| CityCenter | net 355 mL → **473 mL** | net contents | NEEDS_REVIEW |
| GoldenHarvest | brand → **Sunrise Fields** | brand name | NEEDS_REVIEW |
| HighDesert | import, **country left blank** | country of origin (missing) | NEEDS_REVIEW |
| HighlandCask | country SCOTLAND → **FRANCE** | country of origin | NEEDS_REVIEW |
| IslandHeat | class → **Coconut Flavored Rum** | class / type | NEEDS_REVIEW |
| JuniperGrove | ABV 43% → **50%** | alcohol content | NEEDS_REVIEW |
| LakesideMeadery | net 500 mL → **750 mL** | net contents | NEEDS_REVIEW |
| MadScientist | brand → **"the mad scientist"** (lowercase) | brand name = MINOR_DIFFERENCE | **PASS** (tolerance) |
| MountainPeak | producer → **Summit Craft Ales, Aspen, CO** | producer / bottler | NEEDS_REVIEW |
| OldPort | net 440 mL → **355 mL** | net contents | NEEDS_REVIEW |
| PacificCoastDistillers | ABV 25% → **40%** | alcohol content | NEEDS_REVIEW |
| PioneerCellars | class → **Dry Red Table Wine** | class / type | NEEDS_REVIEW |
| PrairieDew | brand → **Meadow Brook Cellars** | brand name | NEEDS_REVIEW |
| RioAzul | country MEXICO → **SPAIN** | country of origin | NEEDS_REVIEW |
| SmokyMountain | net 375 mL → **750 mL** | net contents | NEEDS_REVIEW |
| SpicyBadger | ABV 14.5% → **9.0%** | alcohol content | NEEDS_REVIEW |
| VikingBlood | *(values correct)* | ABV + net *couldn't read* (gold-on-crimson) | NEEDS_REVIEW → PASS w/ AI |

So a correct offline run yields **16 NEEDS_REVIEW, 1 PASS (MadScientist), and
Viking Blood NEEDS_REVIEW** — every required-field comparison and the import
country rule is exercised, plus the two intentional non-failures: a case-only
brand (MINOR_DIFFERENCE still passes) and the AI-rescue case.

### A known fuzzy boundary

A wrong value that is *lexically close* to text on the label can read as
MINOR_DIFFERENCE (a pass) rather than MISMATCH — e.g. country **IRELAND** on a
Scotch scores a fuzzy 0.41 against the label and slips through. That's why
HighlandCask uses **FRANCE** (clearly distant) for a clean catch. It's an honest
trade-off of fuzzy matching: tolerant of OCR slips, but a near-miss wrong value
can land in the "verify by hand" middle rather than a hard fail. The verdict is
still NEEDS_REVIEW whenever the difference is large enough to matter.

### What this set intentionally does *not* cover

The government-warning checks (missing / title-case "Government Warning" /
reworded text) are judged from the **image**, not the CSV, so they can't be
injected here — they need purpose-built label images and are exercised on the
single-label page. (Required fields are now the same for every label — brand,
class/type, ABV, net contents, producer, warning, plus country of origin for
imports — so there's no beverage-type column and ABV is required for all.)
