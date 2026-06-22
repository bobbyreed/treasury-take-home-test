# TTB Alcohol-Label Verification — Prototype

A prototype that checks an alcohol-beverage label against the data an applicant
entered, the way a TTB compliance agent does by eye today: does the brand,
class/type, alcohol content, net contents, producer, country of origin (for
imports), and the **government health warning** on the label match the
application?

It is **offline-first**: recognition and the pass / needs-review verdict run
entirely in the browser, with **no network**. An **optional** online step can ask
Claude for a second reading of hard labels, but the tool is fully correct without
it — by design.

**Deployed app:** https://treasury-take-home-test.web.app
**Build journal (separate site):** https://treasury-take-home-test-blog.web.app

> Prototype for evaluation only — **not** an official TTB system. It processes
> images in memory and stores nothing.

## Why offline-first

Three things from the discovery interviews drove the architecture:

- **The firewall.** TTB's network blocks outbound traffic to many domains; a prior
  vendor's ML features "half died" when its endpoints were blocked. So the core
  cannot depend on a cloud API.
- **Speed.** A 30–40s vendor tool went unused — "if we can't get results back in
  about 5 seconds, nobody's going to use it." Local OCR keeps the round trip
  short and predictable.
- **No PII / no storage.** Prototype scope: nothing sensitive is persisted, which
  is trivially true when everything happens in the browser tab.

The optional AI layer exists only for the hard cases the interviewees flagged
(ornate fonts, glare, bad angles) and is isolated so its absence changes nothing
about the core verdict.

## How it addresses the brief

This prototype is a direct answer to the discovery interviews in
[`instructions/README.md`](./instructions/README.md). Each concern raised there,
and how the tool responds:

**Sarah Chen (Deputy Director) — throughput & adoption**
- *"If we can't get results back in about 5 seconds, nobody's going to use it"*
  (a prior vendor took 30–40s) → OCR runs **locally**; a typical clean label
  verifies in a few seconds. ~5s is treated as an average across a representative
  set, not a hard per-image cap (see *testing-findings*).
- *"Something my 73-year-old mother could figure out … no hunting for buttons"*
  (half the team is 50+) → one obvious top-to-bottom flow, large targets, high
  contrast, keyboard navigation, plain-language **words + icon** verdicts, plus an
  **Instructions** tour and a **Guided Practice** trainer.
- *"Importers dump 200–300 applications at once"* → the **Batch** screen: many
  images + a CSV, progress, a needs-review filter, and CSV export.

**Marcus Williams (IT) — the constraints that killed the last vendor**
- *"Our network blocks outbound traffic … half their features died"* → recognition
  and the verdict run **entirely in the browser**; the AI step is optional,
  isolated, and times out instead of hanging.
- *"We're not storing anything sensitive"* → in-memory only; nothing is persisted
  or uploaded on the offline path.
- *"Standalone proof-of-concept, not COLA"* → no COLA dependency.

**Dave Morrison (28-year agent) — judgment, and don't make it harder**
- *"'STONE'S THROW' vs 'Stone's Throw' … obviously the same thing"* →
  case/punctuation-only differences read as a **minor difference**, not a mismatch.
- *"Don't make my life harder / don't be slower than my eyes"* → a minimal flow, a
  fast local read, and a verdict that explains itself in plain language.

**Jenny Park (junior agent) — the warning, and imperfect photos**
- *"Word-for-word, and 'GOVERNMENT WARNING:' in all caps"* (she's rejected a
  title-case one) → the warning is verified by an **all-caps lead-in** plus
  near-complete token coverage of the canonical statement; a title-case lead-in
  fails, as does a missing warning.
- *"Labels shot at weird angles, bad lighting, glare … it can't read them"* →
  degraded images **fail gracefully** to *"couldn't read — try a clearer image"*
  (never a silent wrong pass), matching today's reject-and-request workflow; the
  optional AI layer covers some hard cases. *Honest limit:* font weight/size of
  the warning can't be judged from OCR text.

**TTB required label fields** (brand, class/type, alcohol content, net contents,
bottler/producer, country of origin for imports, government health warning) are
all checked — the warning on every label, country of origin additionally for
imports. Full feature→user-story→status mapping is in
[`docs/requirements.md`](./docs/requirements.md).

## What's in it

Four screens, linked from the top nav:

| Screen | What it does |
|---|---|
| **Single label** | Upload one label, enter the application values, get a per-field PASS / NEEDS REVIEW verdict. Optional "Double-check with AI" button. |
| **Batch** | Upload many labels + a CSV of expected values (paired by filename); a worker pool runs them with a progress bar, a needs-review filter, and CSV export. For peak-season importer dumps. |
| **Instructions** | A guided coachmark tour laid over the *real* single-label screen — you can type and click as it explains each control. |
| **Guided practice** | An 18-level trainer over the sample labels: enter or judge the application values, run the real checker, and make the approve / request-review call. Progress saves locally. |

### Mobile

Phones are auto-detected and redirected to a dedicated mobile build under `/m/`
(all four screens), with a **View desktop version** escape that's remembered for
the session. It reuses the same offline pipeline but in a one-thing-per-screen,
large-target layout, and the verdict opens as a full-screen overlay.

**On a phone the tool is built around photo capture, not file upload** — the
primary action is *Take a photo of the label* (the device camera), with *Choose
from library* as the secondary option. This matches the field reality of an agent
with a bottle in hand rather than a scan on a desktop.

## Quick start

The app is plain HTML/CSS/JS with **no build step**. Serve the `app/` folder over
HTTP (ES modules don't load from `file://`):

```bash
npx serve app          # or: python3 -m http.server -d app 8080
# then open the printed URL
```

The first label read also downloads the vendored OCR engine (WASM + English
data, both shipped in `app/vendor/` — no CDN), so it takes a few seconds; later
reads are faster. Everything after that works with the network off.

### Tests

```bash
npm test               # node --test — pure logic: rules, comparison, extraction,
                       # CSV, the practice curriculum, the AI client's error paths
npm run coverage       # same, with V8 coverage
```

105 tests, no external dependencies.

## The optional AI layer (setup)

The "Double-check with AI" button POSTs the image + the OCR text to a Firebase
Cloud Function (`functions/index.js`) that makes one call to **Claude Sonnet 4.6**
(vision, forced structured output). The function reads the label *cold* — it is
never told the expected values — and its reading is poured back through the
**same** comparison engine the offline path uses, so there is one definition of
"match." The UI then shows which fields the second reading changed.

The API key is a **server-side secret**, never in the browser or the repo:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
cd functions && npm install && cd ..
firebase deploy --only functions
```

If the call fails — offline, or on a network that blocks the endpoint — the
button says so and the offline verdict stands. (The request also self-aborts
after 30s so it can't hang.)

## Deploy

Firebase Hosting, two targets (app + the build-journal blog), plus the function:

```bash
firebase deploy                       # everything
firebase deploy --only hosting:app    # just the app
```

Targets and project are wired in `.firebaserc` / `firebase.json`.

## Approach & key decisions

- **Pipeline:** image → canvas preprocess (grayscale, optional Otsu binarize) →
  Tesseract.js OCR → heuristic field extraction → a deterministic, unit-tested
  comparison engine → verdict. The comparison engine is pure and the bulk of the
  tests live there.
- **Three ideas of "match", not one.** Free-text fields use normalization + fuzzy
  tolerance (so Dave's `STONE'S THROW` vs `Stone's Throw` is a *minor difference*,
  not a failure); ABV and net contents are parsed to numbers/units and compared
  numerically; the government warning is checked for an all-caps `GOVERNMENT
  WARNING:` lead-in plus near-complete token coverage of the canonical statement.
- **"Couldn't read" ≠ "wrong."** A garbled-word ratio lowers a field's effective
  confidence so an unreadable field surfaces as *couldn't read — try a clearer
  image* (matching the human "reject and request a better image" workflow) rather
  than a false mismatch.
- **Fixed required-field set.** Every label requires brand, class/type, ABV, net
  contents, producer, and the warning; imports also require country of origin. An
  earlier per-beverage-type variant was removed — it added a form field and a code
  branch without changing any outcome a reviewer cares about.
- **Accessibility:** one top-to-bottom flow, large targets, high contrast,
  keyboard-navigable, verdicts communicated with words + icon (never color
  alone), and `prefers-reduced-motion` honored.

### Tools

Vanilla ES modules (no framework/bundler) · [Tesseract.js](https://tesseract.projectnaptha.com/)
(WASM OCR, vendored) · [Fuse.js](https://fusejs.io/) (fuzzy matching, vendored) ·
Firebase Hosting + Cloud Functions · `@anthropic-ai/sdk` (Claude Sonnet 4.6) ·
Node's built-in test runner. USWDS-inspired styling, no web-font fetch.

### Assumptions & trade-offs

- Targeted at clean, label-filling images (what an agent would attach). Full-scene
  bottle photos and badly-shot images degrade gracefully to "couldn't read" rather
  than guessing.
- The warning is verified by coverage, not a literal character match (OCR is
  lossy); font weight/size can't be judged from OCR text — a documented limitation
  the AI layer partially addresses.
- The sample labels are AI-generated fictional products (see `sample-labels/`).
- `~5s` is an average target across a representative set, not a hard per-image cap.

## Limitations & known issues

- **Decorative / 3-D display fonts** (e.g. a carved runic title) defeat the offline
  OCR; body text on the same label reads fine. These are the cases for the AI layer.
- **Low-contrast colored text** (gold on dark crimson — e.g. Viking Blood's ABV /
  net contents) reads poorly **regardless** of the "clean up image" toggle; it's an
  AI-layer case. (The toggle itself is net-positive — see *Does "clean up the image"
  help?* below.)
- **Full-scene product photos** read the background, not the label; controlled,
  label-filling images work best.
- **Warning font weight/size** can't be judged from OCR text.
- **The AI layer needs outbound network** — the part TTB's firewall blocks. Optional
  by design; the offline core stands alone.
- **Prototype scope:** no persistence; not integrated with COLA. The Treasury/TTB
  mark is presentation only and implies no endorsement.

### Does "clean up the image" help? (measured)

Each of the 18 clean sample labels was run through the pipeline twice — grayscale
only vs. grayscale + Otsu binarization (what the toggle does) — with the same OCR
engine, then the verdicts and per-field statuses were compared. Results were
identical across repeated runs.

**Cleanup is net-positive: it produced the only verdict improvement and never
broke a label that already passed.** Effects with cleanup *on* (all expected
values are the correct ones, so "couldn't read" / "misread" are OCR failures):

| Label | Effect of turning cleanup on |
|---|---|
| **IslandHeat** | **NEEDS REVIEW → PASS** — net contents went from *couldn't read* to a match; class/type and producer also improved |
| **PioneerCellars** (angled) | 5 fields flipped from *confidently wrong* to an honest *couldn't read* (clearer signal to re-shoot) |
| **VikingBlood** | stylized class line: *misread → correct* (the gold-on-crimson ABV/net stay unreadable either way) |
| **HighlandCask** | producer read more completely (minor → match) |
| **BlackbeardCove** | government-warning coverage improved (minor → match) |
| **RioAzul** | the one regression — a stylized class line went from *couldn't read* to *misread* |
| other 12 | no change (every clean PASS stayed PASS) |

**Conclusion:** leave cleanup on by default. The only observed downside was one
stylized class line (RioAzul) reading as a wrong value rather than "couldn't
read." Note this corrects an earlier *speculation* that global binarization hurts
low-contrast colored text: in practice that text (Viking Blood's gold-on-crimson)
is unreadable with or without cleanup — an AI-layer case, not a cleanup-toggle one.

## Repository layout

```
app/            the application (static; deployed as the "app" hosting target)
  js/pipeline/  pure recognition + comparison logic (unit-tested)
  js/ui/        DOM glue: single, batch, instructions tour, guided practice
  js/practice/  the guided-practice curriculum (pure data)
  vendor/       Tesseract + Fuse, vendored (no CDN)
  practice/     downsized sample images served for guided practice
functions/      the optional verifyLabel Cloud Function
sample-labels/  AI-generated test labels + expected-values.csv
docs/           plan, architecture review, requirements/traceability, findings
blog/           build journal (separate hosting target; not linked from the app)
test/           node --test suites
```

More detail in [`docs/`](./docs): [PLAN.md](./docs/PLAN.md),
[requirements.md](./docs/requirements.md) (user stories + traceability),
[architecture-review.md](./docs/architecture-review.md),
[testing-findings.md](./docs/testing-findings.md),
[diagrams.md](./docs/diagrams.md).

## Credits & acknowledgements

Built with these open tools and services — thanks to all of them:

- [![Tesseract.js](https://img.shields.io/badge/Tesseract.js-in--browser%20OCR-4E9A06)](https://github.com/naptha/tesseract.js)
  — the offline OCR engine (a WASM port of [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)), vendored so it runs with no network.
- [![Fuse.js](https://img.shields.io/badge/Fuse.js-fuzzy%20matching-8A2BE2)](https://www.fusejs.io/)
  — lightweight fuzzy matching for the tolerant field comparison, vendored.
- [![Firebase](https://img.shields.io/badge/Firebase-hosting%20%2B%20functions-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  — static hosting (app + blog) and the optional Cloud Function.
- [![Anthropic Claude](https://img.shields.io/badge/Anthropic-Claude-D4A27F?logo=anthropic&logoColor=white)](https://www.anthropic.com/)
  — **Claude Sonnet 4.6** powers the optional AI second-read, and **Claude Opus 4.8**
  (via [Claude Code](https://claude.com/claude-code)) was the development collaborator on this project.
- [![Pillow](https://img.shields.io/badge/Pillow-image%20resize-3776AB?logo=python&logoColor=white)](https://python-pillow.github.io/)
  — [Pillow](https://python-pillow.github.io/) (Python) for build-time downscaling of the practice label images.
- [![Node.js](https://img.shields.io/badge/Node.js-test%20runner-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  — the built-in `node --test` runner; no test framework dependency.
- [![USWDS](https://img.shields.io/badge/U.S.%20Web%20Design%20System-design%20tokens-005EA2)](https://designsystem.digital.gov/)
  — palette and type inspiration (fallback font stacks only — no web-font fetch).
- Sample labels generated with
  [![Google Gemini](https://img.shields.io/badge/Google%20Gemini-image%20gen-8E75B2?logo=googlegemini&logoColor=white)](https://gemini.google.com/)
  and [![OpenAI](https://img.shields.io/badge/OpenAI-image%20gen-412991?logo=openai&logoColor=white)](https://openai.com/)
  — fictional products created only for testing.
