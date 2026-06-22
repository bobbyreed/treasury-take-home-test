# TTB Alcohol-Label Verification — Prototype

A tool to augment human checks on alcohol-beverage labels for compliance.

## ▶ Use the deployed app

**The deployed app is the full, working version — use it:**
**https://treasury-take-home-test.web.app**

Build journal (separate site): https://treasury-take-home-test-blog.web.app

> A prototype for evaluation only — not an official TTB system. It works in your
> browser and stores nothing.

## What it does

An agent uploads a label, types in the values from the application, and gets a
per-field **PASS** or **NEEDS REVIEW** result. It checks the brand, class/type,
alcohol content, net contents, producer, country of origin (for imports), and the
government health warning.

Four screens, plus a phone version:

- **Single label** — check one label. Optional "Double-check with AI" button.
- **Batch** — check many at once from a CSV, with progress, a needs-review
  filter, and CSV export.
- **Instructions** — a guided tour over the real screen.
- **Guided practice** — an 18-level trainer on the sample labels.
- **Mobile** — on a phone you're sent to a camera-first version. **It's built
  around taking a photo of the label, not uploading a file.**

## How it works

It runs **entirely in your browser, with no network**: clean up the image → read
it with OCR (Tesseract.js) → pull out the fields → compare against what you typed
→ show the verdict.

This offline-first design is deliberate. TTB's network blocks outside services
(a past tool lost half its features to the firewall), and a tool that took 30–40
seconds went unused. Running locally means it works behind the firewall and stays
fast — and nothing sensitive is stored or sent anywhere.

The **AI step is optional**. The "Double-check with AI" button can ask Claude
(server-side) for a second reading of a hard label. The offline result is correct
without it, and the button fails gracefully if the network blocks it.

## How it meets the brief

Built from the stakeholder interviews in
[`instructions/README.md`](./instructions/README.md):

| What they asked for | How it's handled |
|---|---|
| Results in ~5 seconds, or no one uses it | OCR runs locally; a clear label checks in a few seconds (an average target, not a hard cap) |
| Simple enough for a non-technical user | One top-to-bottom flow, large targets, plain-language verdicts, a guided tour, and a practice trainer |
| Handle 200–300 labels at peak | Batch mode: many images + a CSV, progress, filter, export |
| Must work behind a firewall | Reading and verdict run fully in the browser; the AI step is optional and isolated |
| Don't store anything sensitive | In-memory only; nothing saved or uploaded |
| Standalone, not tied to COLA | No COLA dependency |
| Treat trivial differences as matches | "STONE'S THROW" vs "Stone's Throw" reads as a minor difference, not a mismatch |
| Government warning exact and all-caps | Checks the all-caps lead-in and full wording; a title-case or missing warning fails |
| Cope with badly shot photos | An unreadable field says "couldn't read — try a clearer image" instead of guessing wrong |

Full feature → user-story mapping is in
[`docs/requirements.md`](./docs/requirements.md).

## Run it locally (optional)

You don't need this to try the tool — the deployed app above is the working
version. For development, it's plain HTML/CSS/JS with **no build step**:

```bash
npx serve app          # or: python3 -m http.server -d app 8080
```

The first label read loads the OCR engine (a few seconds); after that it works
with the network off.

```bash
npm test               # 105 tests, no extra dependencies
```

### Optional: enable the AI button

The API key is a server-side secret, never in the browser:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy --only functions
```

### Deploy

```bash
firebase deploy        # app + blog + function (see .firebaserc / firebase.json)
```

## Limitations

- Fancy display fonts and low-contrast colored text can defeat the OCR — that's
  what the optional AI layer is for.
- Full-scene photos (a bottle on a shelf) read poorly; clear, label-filling
  images work best.
- The sample labels are AI-generated, fictional products.
- It's a standalone prototype: no storage, not connected to COLA.

More detail — including a measured comparison of the "clean up image" option — is
in [`docs/testing-findings.md`](./docs/testing-findings.md) and the other
[`docs/`](./docs).

## Repository layout

```
app/            the app (static; the "app" hosting target)
  js/pipeline/  reading + comparison logic (unit-tested)
  js/ui/        screens: single, batch, instructions, practice, mobile
  vendor/       Tesseract + Fuse, bundled in (no CDN)
functions/      the optional AI Cloud Function
sample-labels/  AI-generated test labels + expected values
docs/           plan, requirements, architecture review, findings
blog/           build journal (separate site)
test/           node --test suites
```

## Credits

- [![Tesseract.js](https://img.shields.io/badge/Tesseract.js-in--browser%20OCR-4E9A06)](https://github.com/naptha/tesseract.js)
  — offline OCR (a WASM port of [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)), bundled in.
- [![Fuse.js](https://img.shields.io/badge/Fuse.js-fuzzy%20matching-8A2BE2)](https://www.fusejs.io/)
  — fuzzy matching for tolerant comparison.
- [![Firebase](https://img.shields.io/badge/Firebase-hosting%20%2B%20functions-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  — hosting and the Cloud Function.
- [![Anthropic Claude](https://img.shields.io/badge/Anthropic-Claude-D4A27F?logo=anthropic&logoColor=white)](https://www.anthropic.com/)
  — **Claude Sonnet 4.6** for the optional second-read; **Claude Opus 4.8** (via
  [Claude Code](https://claude.com/claude-code)) as the development collaborator.
- [![Pillow](https://img.shields.io/badge/Pillow-image%20resize-3776AB?logo=python&logoColor=white)](https://python-pillow.github.io/)
  — build-time resizing of the practice images.
- [![Node.js](https://img.shields.io/badge/Node.js-test%20runner-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  — the built-in test runner.
- [![USWDS](https://img.shields.io/badge/U.S.%20Web%20Design%20System-design-005EA2)](https://designsystem.digital.gov/)
  — palette and type inspiration (no web-font fetch).
- Sample labels generated with
  [![Google Gemini](https://img.shields.io/badge/Google%20Gemini-image%20gen-8E75B2?logo=googlegemini&logoColor=white)](https://gemini.google.com/)
  and [![OpenAI](https://img.shields.io/badge/OpenAI-image%20gen-412991?logo=openai&logoColor=white)](https://openai.com/).
