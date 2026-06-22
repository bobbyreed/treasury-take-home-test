# Development Plan — AI-Powered Alcohol Label Verification (Prototype)

> Draft v2 for review. Vanilla HTML/CSS/JS front end on Firebase, **offline-first
> recognition** with an **optional online LLM verification layer**. Companion UML
> diagrams: [`diagrams.md`](./diagrams.md).
>
> Changes from v1: pivoted from LLM-first to a real client-side OCR/heuristic
> pipeline that works standalone; LLM is now an optional online verifier, not the
> core. Model fixed to Sonnet 4.6. Comparison stays client-side. Beverage-specific
> rules are in scope. Demo target 50 labels, then scale toward 400.

## 1. What we're building

A standalone proof-of-concept that lets a TTB compliance agent upload a label
image (or a batch) plus the expected application values, and get back — within
~5 seconds per label — a clear PASS / NEEDS REVIEW verdict, broken down field by
field:

- **Brand name** matches the application
- **Class/type** designation matches
- **Alcohol content (ABV)** matches (subject to beverage-type rules)
- **Net contents** match
- **Name/address of producer/bottler**, **country of origin** (imports)
- **Government Health Warning** present and **verbatim** (`GOVERNMENT WARNING:`
  in all caps, exact wording)

The core recognition + comparison runs **entirely in the browser** and works
offline. When the agent is online and wants a second opinion, the extracted data
(and image) can be sent to a vision LLM for verification/revision.

## 2. Requirements distilled from the stakeholder interviews

| Source | Requirement | Design implication |
|---|---|---|
| Sarah (Deputy Director) | **~5 second** turnaround or "nobody will use it" | Fast local pipeline; OCR runs client-side; no blocking round-trip on the core path. |
| Sarah | **Batch uploads** (200–300 at once) | Client-orchestrated queue, bounded concurrency, progress UI, results table, CSV export. |
| Sarah | Usable by a 73-year-old; half the team is 50+ | Big targets, high contrast, one obvious action, plain-language results, keyboard-navigable. |
| Jenny (Junior Agent) | Warning must be **exact**, caps + bold; people bury/reword it | Verbatim compare vs canonical TTB text; assert all-caps `GOVERNMENT WARNING:`; report styling cues. |
| Dave (Senior Agent) | Needs **judgment** — `STONE'S THROW` vs `Stone's Throw` is the same | Normalize case/punctuation/whitespace; surface "minor difference" distinct from "mismatch." |
| Jenny | Imperfect photos (angle, glare, lighting) | Canvas preprocessing + OCR confidence; degrade gracefully, optionally escalate to AI. |
| **Marcus (IT)** | **Gov network blocks outbound AI endpoints**; the last vendor's ML features broke on the firewall | **This is why the core must not depend on an LLM.** Offline recognition is the product; LLM is an online enhancement, not a crutch. |
| Marcus | PII / retention concerns | No persistence of images or PII in the prototype; process in-memory. |
| README (TTB rules) | Requirements **vary by beverage type**; ABV has exceptions for some wine/beer | Beverage-specific rule set selects required fields + strictness. |

### Scope

**MVP (core deliverable, all offline-capable):**
1. Single-label verification: upload image → preprocess → OCR → extract → compare
   against expected fields + beverage rules → verdict.
2. The field checks above, with verbatim warning logic and fuzzy name/type
   matching, governed by a beverage-type rule set.
3. Clean, accessible, obvious UI.
4. Batch mode (target 50): queue, progress, results table, CSV export.
5. Graceful error/low-confidence handling.
6. Deployed to Firebase + README.

**Optional online layer (build alongside, clearly gated):**
- "Verify with AI" action: send OCR text + extracted fields (+ image) to the
  Cloud Function → Claude Sonnet 4.6 for verification/revision; merge results and
  flag any differences from the offline read. Disabled/handled gracefully when
  offline.
- Confidence-driven suggestion: when OCR/extraction confidence is low *and* we're
  online, suggest AI verification.

**Stretch (documented if not reached):**
- Scale batch from 50 → 400 (tune concurrency, consider Batches API for cost).
- Side-by-side label-crop vs expected-value highlighting using OCR word boxes.
- Smarter deskew/perspective correction for hard photos.
- **Interactive agent-training module** — ✅ **Done** (`instructions.html` +
  `practice.html`). A coachmark tour of the live single-label screen, plus an
  18-level Guided Practice trainer over the clean label pool that gates on the
  learner's approve/needs-review judgment. (Built as two app pages linked into the
  nav — a refinement of the original "standalone like the blog" framing, since the
  trainer is for the tool's own users, not a build journal.)

## 3. Architecture — offline core, optional online booster

**Everything in §3a runs in the browser and works with no network.** §3b is an
optional enhancement that only activates online.

### 3a. Client-side recognition pipeline (vanilla JS)

1. **Image preprocessor** (HTML canvas): grayscale, contrast/threshold, optional
   deskew — improves OCR on real photos (glare, angle).
2. **OCR engine**: **Tesseract.js** (WASM port of Tesseract) — fully local, no
   network, returns text + per-word bounding boxes + confidence. *(This is the
   one substantial library we pull in now; it's the heart of the offline path.)*
3. **Field extractor**: heuristics over OCR output — keyword anchors and regex to
   locate brand name, class/type, ABV (`% Alc./Vol.`, proof), net contents
   (mL/L), producer/address, country of origin, and the warning block.
4. **Comparison engine** (deterministic, unit-tested): normalization + fuzzy
   matching + verbatim warning check + beverage-type rules → `VerificationReport`.
5. **UI**: renders the verdict and per-field detail locally.

### 3b. Optional online verification layer (Firebase)

- **Firebase Hosting** serves the static app.
- **Cloud Function `verifyLabel`** holds the Anthropic API key (never in the
  browser), calls **Claude Sonnet 4.6** with **structured outputs**
  (`output_config.format`) for a single, fast extraction/verification pass, and
  returns revised fields + confidence. One model call, no agent loop → stays in
  the latency budget. Comparison still runs client-side against the revised
  fields, and the UI flags where AI disagreed with the offline read.

```
Browser (offline core)                         Firebase (optional, online)
  upload ─▶ preprocess ─▶ OCR ─▶ extract ─▶ compare ─▶ VERDICT
                                                │
                                  (optional, online + opt-in)
                                                ▼
                                   Cloud Function verifyLabel ─▶ Claude Sonnet 4.6
                                                ◀── revised fields ──┘
                                   re-compare, flag AI deltas ─▶ revised VERDICT
```

See [`diagrams.md`](./diagrams.md) for use-case, component, sequence (offline /
AI / batch), data-model, and state diagrams.

## 4. The comparison engine (the nuanced part)

Deterministic, client-side, unit-testable.

- **Normalization** (brand, class/type, producer): trim, collapse whitespace,
  case-fold, normalize curly/straight quotes + punctuation, strip diacritics.
  - exact after normalization → **MATCH**
  - only case/punctuation differs, or tiny edit distance → **MINOR DIFFERENCE**
    (surfaced, not failed — Dave's `STONE'S THROW`)
  - otherwise → **MISMATCH**
- **ABV**: parse numeric percent both sides; compare with small tolerance; check
  proof/ABV consistency where both appear.
- **Net contents**: normalize units (mL/L), compare.
- **Government warning**: compare extracted warning against the **canonical TTB
  warning string**, normalized for whitespace only (wording must be exact);
  separately assert `GOVERNMENT WARNING:` is all caps. Font weight/size can't be
  derived from OCR text — documented limitation; we report caps + any styling
  cues we can detect.
- **Beverage rules**: a small table keyed by beverage type drives which fields
  are required and how strict each check is (see §5).
- **Overall verdict**: `PASS` only if every *required* field is MATCH (minor
  differences allowed with a flag); else `NEEDS REVIEW` listing the failing
  fields. Low OCR confidence on a required field → `NEEDS REVIEW` (never a silent
  pass).

## 5. Beverage-specific rules (from the requirements)

The README states requirements vary by type and that ABV "has exceptions for
certain wine/beer." Model this as a `BeverageRuleSet`:

| Field | Distilled spirits | Wine | Beer / malt | Imports (any) |
|---|---|---|---|---|
| Brand name | required | required | required | required |
| Class/type | required | required | required | required |
| Net contents | required | required | required | required |
| **ABV** | **required** | required* | **conditional** | per base type |
| Producer/bottler name+address | required | required | required | required |
| **Country of origin** | — | — | — | **required** |
| **Government warning** | required | required | required | required |

\* Simplified for the prototype; refine once your data-structure email comes back.
The agent selects beverage type (or we infer from class/type text); the rule set
selects required fields and strictness. The warning check is universal.

## 6. UX principles (for the actual users)

- One screen, one flow: **Upload → confirm/enter expected values + beverage type
  → Verify → Result.** No nested menus.
- Large fonts/buttons, high contrast, keyboard-navigable, clear focus. Results use
  words + icon + color (never color alone).
- Result card: big PASS / NEEDS REVIEW banner, then plain-language per-field list
  ("Brand name: matches", "Warning: wording differs — see below").
- Batch: results table, progress indicator, filter to "needs review," CSV export.
- Honest errors: "We couldn't read this label clearly — try a better photo,"
  never a silent fail or fake pass.
- Online-only features (AI verify) are visibly gated and degrade cleanly offline.

## 7. Deployment & ops

- **One Firebase project, two Hosting sites:** the `app` site (webapp) and the
  `blog` site (build journal, §11). This shapes the `firebase init` answers — I'll
  provide exact site/target config when we reach init.
- `firebase.json`: Hosting (multi-site) + rewrite of `/api/verifyLabel` to the
  function.
- Anthropic API key as a Functions secret — never in client code or the repo.
- Tesseract.js assets bundled/served locally so OCR works without third-party CDN
  reachability (matters for locked-down networks).
- README: setup, local run (Firebase emulators), deploy, documented
  assumptions/limitations, and the offline-vs-online boundary.

## 8. Security, privacy, and limitations (to document)

- Prototype: **no persistence** of images or PII; in-memory processing.
- Not integrated with COLA; standalone POC.
- Core works behind the firewall; AI layer is the part that needs outbound access
  — explicitly the optional/online piece, by design.
- Warning font weight/size not fully verifiable from OCR text; we verify
  wording + caps and report cues.

## 9. Decisions locked / still open

**Locked from your feedback:**
- Offline-first recognition; LLM is optional online verification. ✅
- Model: **Sonnet 4.6**, upgrade to Opus 4.8 only if needed. ✅
- Comparison logic: **client-side**. ✅ (open to revisiting)
- Demo target **50 labels**, then scale toward 400. ✅
- **Beverage-specific rules in scope.** ✅

**Still open:**
1. **Expected-values input for batch**: pair each image with a row from an
   uploaded CSV/JSON of application data, or manual entry only? (Leaning toward
   CSV pairing for batch.)
2. **Data structures**: pending your email to TTB — may refine §5 and the
   extraction targets.
3. Whether to infer beverage type from the label text or always have the agent
   select it (MVP: agent selects; inference as a nicety).

## 10. Proposed build order (basis for the implementation plan)

1. Repo scaffold + Firebase Hosting config; static app shell.
2. Image preprocessor (canvas) + Tesseract.js OCR integration; show raw OCR +
   confidence for a single image.
3. Field extractor heuristics (brand, class/type, ABV, net contents, producer,
   country, warning block).
4. Comparison engine + `BeverageRuleSet` + **unit tests** (the verbatim warning
   and fuzzy-match logic are the highest-risk pieces — test first).
5. Single-label UI + result rendering (accessible).
6. Batch mode (queue, concurrency, progress, table, CSV export) — target 50.
7. Optional online layer: `verifyLabel` Cloud Function + Claude Sonnet 4.6
   structured output; "Verify with AI" UI with offline-graceful gating.
8. Error/low-confidence handling, accessibility pass, polish.
9. Deploy + README + assemble the test-label set.

The companion blog (§11) is set up early (its own static site) and I author one
entry per milestone as the above progresses, so the journal is contemporaneous
rather than reconstructed.

## 11. Companion blog — build journal (authored by Claude)

A second deliverable: a public build journal I author as we go, modeled on your
example's format and voice.

- **Format / voice:** first-person from me (Claude), as the one doing the keyboard
  work. Entries titled `Entry N — <descriptive title>`, dated, "by Claude";
  numbered sections describing exactly what was done — decisions, reasoning,
  corrections, trade-offs, and reversals — closing with a short "What's next."
  Tedious-and-exact over tidy-and-vague; records commit hashes; honest about
  limitations and abandoned directions.
- **Cadence:** one entry per meaningful milestone (scaffold + OCR spike; field
  extractor; comparison engine + tests; single-label UI; batch mode; AI layer;
  deploy). Pairs naturally with "commit at each meaningful change."
- **Stack:** vanilla, self-contained static site — a single `index.html` with
  minimal inline CSS (serif reading column), no CDN fetches, no build step.
  Matches both the webapp's no-framework approach and your example's actual
  implementation.
- **Progressive enhancement (optional, as in your example):** oldest/newest sort
  toggle, light/dark theme via CSS custom properties + `localStorage`, and
  optionally an in-page viewer that renders the project's Markdown docs
  (`PLAN.md`, `diagrams.md`) with a tiny hand-written converter.
- **Hosting:** the `blog` Firebase Hosting site (§7).
- **Privacy:** documents engineering decisions only — no label PII or images.

*Next: review the diagrams in [`diagrams.md`](./diagrams.md). Once we've revised
both, I'll turn §10 into a detailed implementation plan.*
