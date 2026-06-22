# Implementation Plan — Label Verification Prototype

> Draft v1 for agreement. Turns build-order §10 of [`PLAN.md`](./PLAN.md) into a
> concrete, sequenced plan: directory layout, module contracts, milestones with
> acceptance criteria, the exact `firebase init` configuration, and the testing
> approach. **No code is written until this plan is agreed.**
>
> **Planning snapshot.** Two things changed in the build: the per-beverage-type
> rule set became a fixed required-field set (no `beverageType`), and an
> Instructions + Guided Practice training module was added. The
> [README](../README.md) and [`requirements.md`](./requirements.md) reflect what
> shipped.

## 1. Principles

- **Offline core, online booster.** The recognition + comparison pipeline runs
  entirely in the browser with no network. The Claude verification layer is an
  optional, online-only enhancement behind a Cloud Function.
- **No build step for the webapp or blog.** Plain ES modules loaded with
  `<script type="module">`. Anyone can read the source as shipped.
- **Vendored OCR.** Tesseract.js (worker + WASM core + `eng` trained data) is
  served from our own Hosting site, not a CDN — so it works on locked-down
  networks (Marcus's firewall).
- **Pure, testable logic.** Comparison, beverage rules, and text-parsing helpers
  are pure ES modules importable in both the browser and Node, and unit-tested
  with the built-in `node:test` runner (zero test dependencies).
- **Commit + journal per milestone.** Each milestone ends with a git commit and a
  blog `Entry N` authored in the established voice.

## 2. Directory layout

```
/
├── firebase.json            # multi-site Hosting + Functions + rewrite
├── .firebaserc              # project + hosting targets (app, blog)
├── app/                     # Hosting site: "app"  (public dir)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/
│   │   ├── main.js               # wires UI + pipeline
│   │   ├── pipeline/
│   │   │   ├── preprocess.js      # canvas: grayscale, threshold, deskew
│   │   │   ├── ocr.js             # Tesseract.js wrapper → text+boxes+conf
│   │   │   ├── extract.js         # heuristics → ExtractedFields
│   │   │   ├── rules.js           # BeverageRuleSet table
│   │   │   ├── compare.js         # field comparison + normalization
│   │   │   └── report.js          # assemble VerificationReport
│   │   ├── ui/
│   │   │   ├── single.js          # single-label flow + result card
│   │   │   ├── batch.js           # queue, concurrency, table, CSV
│   │   │   └── render.js          # shared DOM rendering helpers
│   │   └── ai/
│   │       └── verifyClient.js    # calls /api/verifyLabel (online, optional)
│   └── vendor/tesseract/         # vendored worker + wasm + eng traineddata
├── blog/                    # Hosting site: "blog" (public dir)
│   └── index.html                # self-contained build journal
├── functions/               # Cloud Functions (Node, JavaScript, ESM)
│   ├── index.js                  # verifyLabel HTTPS function
│   └── package.json
├── test/                    # node:test unit tests
│   ├── compare.test.js
│   ├── rules.test.js
│   └── extract.test.js
├── sample-labels/           # test images + expected-values.csv
└── docs/                    # PLAN.md, diagrams.md, IMPLEMENTATION_PLAN.md
```

Pipeline modules are plain ESM. `preprocess.js` and `ocr.js` touch the DOM/canvas
(browser-only). `rules.js`, `compare.js`, `report.js`, and the pure parsers in
`extract.js` are environment-agnostic so Node can import and test them directly.

## 3. Tooling & conventions

- **Language:** ES2022 modules, no transpiler, no bundler.
- **Tests:** `node --test` against `test/*.test.js`. A `package.json` at repo root
  with `"type": "module"` and a `"test"` script; no runtime dependencies for the
  webapp (Tesseract is vendored static assets, not an npm dep of the app).
- **Functions deps:** `firebase-functions` and `@anthropic-ai/sdk` only.
- **Lint/format:** keep light — match the file style; no heavy config.

## 4. Milestones

Each milestone lists deliverable → key files → acceptance → close-out (commit +
blog entry).

### M0 — Scaffold (me)
- **Deliverable:** directory tree above, root `package.json`, placeholder
  `index.html` for both sites, empty module files with signatures + JSDoc.
- **Acceptance:** `node --test` runs (zero tests yet, exits clean); both
  `index.html` open locally.
- **Close-out:** commit; blog Entry 1 (the planning + scaffold story).

### M1 — Firebase wiring + first deploy ← **firebase init happens here**
- **Deliverable:** `firebase.json` + `.firebaserc` for two Hosting sites and the
  Functions rewrite; a trivial `verifyLabel` returning `{ ok: true }`; both sites
  live.
- **Process:** I'll signal "ready for firebase init" and hand you the exact
  answers (§5). You run init + create the second site + first deploy.
- **Acceptance:** `app` and `blog` sites serve their placeholders; `GET
  /api/verifyLabel` health-checks via the rewrite.
- **Close-out:** commit; blog Entry 2 (wiring + deploy).

### M2 — Preprocess + OCR spike (offline)
- **Deliverable:** `preprocess.js` + `ocr.js` + vendored Tesseract; a dev view
  that takes one image and shows cleaned image, raw OCR text, and per-word
  confidence.
- **Acceptance:** OCR runs fully offline (DevTools offline mode) on a clean
  AI-generated label and on one real photo; confidence surfaced.
- **Close-out:** commit; blog Entry 3 (OCR, preprocessing, what reads well/badly).

### M3 — Field extractor
- **Deliverable:** `extract.js` — locate brand, class/type, ABV (`% Alc./Vol.`,
  proof), net contents (mL/L), producer/address, country of origin, and the
  warning block, from OCR text + boxes. Returns `ExtractedFields` (§6).
- **Acceptance:** extracts the five core fields on the sample set; pure parsers
  (ABV, net-contents, warning-locator) covered by `extract.test.js`.
- **Close-out:** commit; blog Entry 4.

### M4 — Comparison engine + beverage rules + tests
- **Deliverable:** `rules.js`, `compare.js`, `report.js`. Normalization, fuzzy
  matching, verbatim warning check, beverage-type required-field logic, overall
  verdict. **Highest-risk logic — tests written here.**
- **Acceptance:** `compare.test.js` + `rules.test.js` cover MATCH /
  MINOR_DIFFERENCE / MISMATCH / MISSING / LOW_CONFIDENCE, the `STONE'S THROW`
  case, verbatim-vs-reworded warning, all-caps assertion, and per-beverage
  required fields. `node --test` green.
- **Close-out:** commit; blog Entry 5 (the nuance: judgment vs exactness).

### M5 — Single-label UI
- **Deliverable:** `single.js` + `render.js` + `styles.css` — upload → confirm
  expected values + beverage type → Verify → result card (PASS / NEEDS REVIEW +
  per-field plain-language detail). Accessible (large targets, contrast,
  keyboard, words+icon not color alone).
- **Acceptance:** end-to-end offline on a sample label; keyboard-only run; honest
  low-confidence/error states.
- **Close-out:** commit; blog Entry 6.

### M6 — Batch mode (target 50)
- **Deliverable:** `batch.js` — multi-file upload (optionally pair to an
  expected-values CSV), bounded-concurrency queue (~6), progress, results table
  with "needs review" filter, CSV export.
- **Acceptance:** processes 50 labels with streaming progress; export opens in a
  spreadsheet; UI stays responsive.
- **Close-out:** commit; blog Entry 7 (concurrency, throughput, scaling notes).

### M7 — Optional AI verification layer (online)
- **Deliverable:** real `verifyLabel` (§7) calling Claude Sonnet 4.6 with
  structured output; `verifyClient.js` + "Verify with AI" UI that re-runs
  comparison on revised fields and flags AI deltas; gated/graceful offline.
- **Acceptance:** online verify revises a deliberately hard label; offline path
  unaffected; API key only on the server (Firebase secret).
- **Close-out:** commit; blog Entry 8 (the booster, and keeping it non-load-bearing).

### M8 — Hardening & accessibility
- **Deliverable:** error handling (bad image, unreadable, API failure, timeouts),
  low-confidence escalation suggestion, a11y pass, visual polish.
- **Acceptance:** graceful failure on a corrupt file and on a simulated API
  error; basic a11y checks pass.
- **Close-out:** commit; blog Entry 9.

### M9 — Deploy, README, test set
- **Deliverable:** README (setup, local emulators, deploy, assumptions/limits,
  offline-vs-online boundary); finalized `sample-labels/`; production deploy of
  both sites + function.
- **Acceptance:** fresh clone → README → emulator run → deploy works; deliverable
  URLs live.
- **Close-out:** commit; blog Entry 10 (wrap-up, limitations, what's next).

## 5. Firebase init configuration (for M1)

You'll do the browser project setup + `firebase init` + first deploy. Planned
answers (exact keystrokes confirmed when we reach M1):

1. **Browser:** create/confirm the project; it gets a default Hosting site (this
   becomes `app`). Blaze plan enabled (for Functions).
2. **`firebase init`** in the repo root, select **Hosting** and **Functions**
   (and optionally **Emulators** for Hosting + Functions):
   - *Use an existing project* → your project.
   - **Functions:** JavaScript; ESLint **No** (keep minimal); install deps **Yes**.
     Functions dir: `functions`.
   - **Hosting:** public directory **`app`**; single-page app rewrite **No**
     (we define our own rewrites); don't overwrite `app/index.html`.
3. **Second site for the blog:**
   `firebase hosting:sites:create <blog-site-id>`, then targets:
   `firebase target:apply hosting app <app-site-id>` and
   `firebase target:apply hosting blog <blog-site-id>`.
4. I then replace `firebase.json` / `.firebaserc` with the multi-site config
   (two `hosting` entries by target + the `/api/verifyLabel` → function rewrite on
   the `app` target). You won't need to hand-edit those.
5. **First deploy:** `firebase deploy` (Hosting both sites + the placeholder
   function).
6. **Secret (before M7):** `firebase functions:secrets:set ANTHROPIC_API_KEY`.

I'll re-state these precisely, in order, when M0 is committed and we're at M1.

## 6. Data contracts (shared shapes)

```
ExpectedFields  { brandName, classType, abv, netContents, producer,
                  countryOfOrigin, beverageType }

ExtractedFields { brandName, classType, abv, netContents, producer,
                  countryOfOrigin, warningText, warningAllCaps,
                  rawText, wordBoxes, ocrConfidence, source: "OCR"|"AI" }

FieldComparison { field, expectedValue, extractedValue,
                  status: "MATCH"|"MINOR_DIFFERENCE"|"MISMATCH"|"MISSING"|"LOW_CONFIDENCE",
                  note }

VerificationReport { labelId, overall: "PASS"|"NEEDS_REVIEW",
                     beverageType, usedAI, fields: FieldComparison[], createdAt }

BeverageRuleSet { beverageType, requiredFields[], abvRequired, notes }
```

- **Verdict rule:** `PASS` iff every *required* field (per `BeverageRuleSet`) is
  `MATCH` (a `MINOR_DIFFERENCE` is allowed but flagged); any `MISMATCH` /
  `MISSING` / `LOW_CONFIDENCE` on a required field → `NEEDS_REVIEW`.
- **Canonical government warning** (verbatim target; whitespace-normalized
  comparison; `GOVERNMENT WARNING:` asserted all-caps):
  > GOVERNMENT WARNING: (1) According to the Surgeon General, women should not
  > drink alcoholic beverages during pregnancy because of the risk of birth
  > defects. (2) Consumption of alcoholic beverages impairs your ability to drive
  > a car or operate machinery, and may cause health problems.

## 7. Cloud Function contract (`verifyLabel`, M7)

- **Method:** `POST /api/verifyLabel` (Hosting rewrite → function).
- **Request:**
  `{ image: { mediaType, dataBase64 }, ocrText, extracted, expected, beverageType }`
- **Behavior:** one Claude **Sonnet 4.6** call via the official `@anthropic-ai/sdk`,
  **structured outputs** (`output_config.format` with a JSON schema matching
  `ExtractedFields`), vision (image block) + the OCR text as context. No agent
  loop, no thinking — single fast pass for the latency budget. API key from a
  Firebase secret, never client-side.
- **Response:** `{ extracted: ExtractedFields(source:"AI"), confidence, notes }`.
  The browser re-runs `compare.js` on the revised fields and flags differences
  from the offline read.

## 8. Testing strategy

- **Unit (Node, `node --test`):** `compare`, `rules`, and the pure parsers in
  `extract` — normalization, fuzzy thresholds, verbatim warning, beverage rules,
  ABV/net-contents parsing. These carry the correctness risk.
- **Manual/offline:** preprocessing + OCR validated against the sample set in the
  browser (DOM/canvas), including DevTools offline mode to prove the firewall
  story.
- **Function:** exercised via the Firebase emulator with a couple of fixture
  payloads before deploy.

## 9. Test-label set (`sample-labels/`)

- **AI-generated edge cases:** title-case warning, missing warning, reworded
  warning, `% Alc./Vol.` vs `Proof` mismatch, `STONE'S THROW` vs `Stone's Throw`,
  wrong net contents, missing country of origin on an import.
- **Real photos (you):** ~10–20 at varying quality (glare, angle, curvature) to
  exercise preprocessing + OCR confidence.
- **`expected-values.csv`:** one row per image for batch pairing.

## 10. Sequencing notes & risks

- M2's OCR accuracy on real photos is the biggest unknown — that's why M9's test
  set front-loads real photos and M2 surfaces confidence early.
- M4 logic is correctness-critical → tests precede UI.
- The AI layer (M7) is intentionally late and isolated; the product is complete
  and demoable at M6 without it.

## 11. Still-open (non-blocking)
1. Batch expected-values input: CSV pairing vs manual (plan assumes **CSV pairing
   supported, manual fallback**).
2. TTB data-structure email → may refine §5 beverage rules / §6 field set.
3. Beverage type: agent-selected (MVP) with text-inference as a later nicety.

## 12. Engineering-consolidation phase (after M5 — the first full prototype)

Once M5 works end-to-end in the browser (the first full prototype), **pause
feature work** and run a consolidation phase, in order, before M6+:

1. **Architecture analysis** — review the module boundaries, data flow, and the
   offline/online split now that real code exists.
2. **`/tidy-first-refactor`** — Kent Beck "Tidy First?" structural cleanup
   (behavior-preserving), separated from behavior changes.
3. **`/test-coverage`** — raise coverage toward ≥ 80%, focused on the pipeline
   and any thin spots the UI introduced.
4. **Requirements analysis** — from `instructions/README.md`, define **users,
   personas, and user stories** drawn from the stakeholder interviews (Sarah,
   Marcus, Dave, Jenny).
5. **Traceability** — align every built and planned feature to a discovered user
   story; surface gaps (unmet needs) and over-builds (features no story needs).

Then resume **M6 (batch) → M7 (AI) → M8 (hardening) → M9 (deploy)**, reprioritized
by the user stories. (`/tidy-first-refactor` and `/test-coverage` are user-invoked
skills; I'll run them at the pause.)

---

*Milestones M0–M5 build to the first full prototype; then the §12 consolidation
phase runs before the remaining milestones.*
