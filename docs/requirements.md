# Requirements — users, personas, and user stories

Consolidation phase, step 4. Derived from the stakeholder interviews in
[`../instructions/README.md`](../instructions/README.md). Closes with a
traceability matrix mapping every built/planned feature to a story, and the gaps
and over-builds that fall out of it.

## Users & roles

| Role | Who | Relationship to the tool |
|---|---|---|
| **Compliance agent** | Dave, Jenny (and ~47 agents) | Primary daily users — run label checks |
| **Compliance leadership** | Sarah Chen (Deputy Director) | Sponsor — cares about throughput, adoption, peak-season batch |
| **IT / infrastructure** | Marcus Williams | Owns the constraints — network, security, retention |
| **Field office (batch)** | Janet (Seattle) | Heavy importer volume — wants bulk processing |

## Personas

### P1 — Dave, the veteran agent (primary)
28 years in; **low tech comfort** ("still prints his emails"); skeptical of
"modernization" that has burned him before. Fast on his queue by eye. Values
**judgment** over rote pattern-matching: `STONE'S THROW` vs `Stone's Throw` is
"obviously the same thing." Bar: *don't make my life harder, don't make me hunt
for buttons, don't be slower than my eyes.*

### P2 — Jenny, the junior agent (primary)
8 months in; tech-comfortable. Works a printed checklist (brand / ABV / warning,
by eye). Expert on the **warning**: it must be exact, word-for-word, with
`GOVERNMENT WARNING:` in all caps and bold — she's rejected a title-case one.
Wishes the tool could cope with **imperfectly shot** labels (angle, glare,
lighting) instead of just rejecting them.

### P3 — Sarah, the deputy director (sponsor)
Runs 150k applications/year through 47 agents who are "drowning in routine."
Two hard adoption gates: **~5-second** results ("nobody's going to use it"
otherwise — a vendor at 30–40s failed) and **anyone-can-use-it** simplicity (her
73-year-old mother as the benchmark; half the team is 50+). Wants **batch** for
peak-season importer dumps of 200–300.

### P4 — Marcus, the IT admin (constraints)
Azure shop; COLA is legacy .NET and **out of scope** (standalone POC). The
network **blocks outbound traffic to many domains** — the last vendor's ML
endpoints were firewall-blocked and half its features died. Production has PII /
retention rules, but for the prototype: **don't store anything sensitive**.

## User stories

Format: *As a … I want … so that …* — with acceptance criteria (AC) and the
interview evidence.

### Core verification
- **US-1 (P1/P2):** check a label's fields against the application in one place.
  *AC:* upload a label + enter expected brand, class/type, ABV, net contents,
  producer, country; get a per-field PASS/NEEDS-REVIEW result. *Evidence:* "looks
  at the label artwork and checks that what's on the label matches the
  application."
- **US-2 (P2):** verify the **government warning is present and exact** — wording
  verbatim and `GOVERNMENT WARNING:` in all caps. *AC:* exact wording matches;
  title-case lead-in fails; missing warning fails. *Evidence:* Jenny on
  word-for-word / all-caps / the title-case rejection.
- **US-3 (P1/P2):** have the right fields required **per beverage type**. *AC:*
  ABV required for spirits, conditional for beer; imports require country of
  origin. *Evidence:* README — requirements vary by type; ABV has wine/beer
  exceptions.

### Judgment & trust
- **US-4 (P1):** treat trivial differences as matches, not failures. *AC:*
  case/punctuation-only differences read as "minor difference," not "mismatch."
  *Evidence:* Dave's `STONE'S THROW`.
- **US-5 (P1):** see *why* something was flagged, in plain language. *AC:* each
  field shows expected vs on-label and a plain note; result uses words+icon, not
  color alone. *Evidence:* Dave needs judgment/visibility; Sarah's simplicity bar.
- **US-6 (P1/P2):** when the tool **can't read** a field, be told to get a better
  image — not given a false "mismatch." *AC:* low-confidence reads surface as
  "couldn't read — try a clearer image," distinct from a real mismatch.
  *Evidence:* Jenny — agents reject and ask for a better image.

### Usability & speed (adoption gates)
- **US-7 (P3):** results fast enough to beat doing it by eye. *AC:* typical label
  verifies in ~5s (average across a representative set; complex/poor images may
  run longer). *Evidence:* Sarah's 5-second gate.
- **US-8 (P3):** usable by a non-technical 73-year-old; no hunting for buttons.
  *AC:* one obvious top-to-bottom flow, large targets, high contrast,
  keyboard-navigable, plain language. *Evidence:* Sarah's "my mother" benchmark;
  half the team 50+.

### Batch (peak season)
- **US-9 (P3/Janet):** process a large batch of labels at once with progress and
  an exportable result list. *AC:* upload many, see progress, filter to
  needs-review, export. *Evidence:* Sarah/Janet — importers dump 200–300.

### Image quality (stretch / robustness)
- **US-10 (P2):** get usable results from imperfectly shot labels (angle, glare,
  lighting), or a clear "send a better image." *AC:* degraded images either read
  or fail gracefully via US-6 — never a silent wrong pass. *Evidence:* Jenny
  (flagged "maybe out of scope for a prototype").

### Infrastructure & security (constraints)
- **US-11 (P4):** the core must work **without outbound internet** (behind the
  firewall). *AC:* recognition + verdict run fully client-side; any cloud/AI step
  is optional and isolated. *Evidence:* Marcus — firewall killed the vendor's ML.
- **US-12 (P4):** the prototype must **not store** label images or PII. *AC:*
  in-memory processing, no persistence. *Evidence:* Marcus — "not storing
  anything sensitive."
- **US-13 (P4):** standalone, not integrated with COLA. *AC:* no COLA dependency.
  *Evidence:* Marcus — standalone POC.

## Traceability — feature → story → status

| Feature | Stories | Status |
|---|---|---|
| Single-label verify (7 fields) + per-field result | US-1, US-5 | ✅ Done (M5) |
| Verbatim warning + all-caps check | US-2 | ✅ Done |
| Beverage-type required-field rules | US-3 | ✅ Done |
| Fuzzy / normalization (case-punct tolerance) | US-4 | ✅ Done |
| Words+icon, plain-language verdict card | US-5, US-8 | ✅ Done |
| Offline-first pipeline (vendored OCR, no CDN) | US-11 | ✅ Done |
| No persistence / in-memory | US-12 | ✅ Done |
| Standalone (no COLA) | US-13 | ✅ Done |
| Accessible single-page flow + image preview | US-8 | ✅ Done |
| ~5s latency | US-7 | ◐ Partial — avg target accepted; slow tail OK (see testing-findings) |
| Low-confidence → "request better image" (per-field) | US-6 | ✅ Done — garbled-word ratio lowers effective confidence (`effectiveConfidence`) |
| Batch mode | US-9 | ⬜ Planned (M6) |
| Optional AI verification (hard fonts/contrast) | US-10, US-6 | ⬜ Planned (M7) |
| Robustness test set (degraded images) | US-10 | ⬜ To create (small, derived from the 25) |

## Gaps (unmet or partial needs)
1. ~~**Per-field "unreadable vs wrong" (US-6).**~~ **Resolved** — `extract` computes
   a garbled-word ratio and `effectiveConfidence` routes a not-found field on a
   garbled read to LOW_CONFIDENCE instead of a false MISMATCH.
2. **Warning *bold / font-size* (US-2).** Jenny also requires the warning be
   **bold** and not in tiny font. OCR text can't judge weight/size — documented
   limitation; partially addressable only by the AI layer.
3. **Batch (US-9).** Not yet built — M6.
4. **Robustness on degraded images (US-10).** Needs the small degraded set + the
   AI layer; depends on US-6 to fail gracefully.

## Over-builds (features no story strictly requires)
- **Treasury/USWDS restyle** — presentation polish. Not required by a story, but
  indirectly serves adoption/credibility (US-8). Keep; low cost.
- **Dev OCR harness (`app/dev/`)** — a developer tool, not user-facing. Should be
  excluded from a production build (or removed) before delivery.
- **Optional AI layer** — only justified by US-10/US-6 hard cases; correctly the
  *lowest* priority and isolated, not a core dependency (respects US-11).

## Recommended priority for resuming feature work
1. ~~Per-field confidence (US-6)~~ — **done.**
2. **Batch mode, M6 (US-9)** — the biggest unmet stakeholder ask (Sarah/Janet). ← next
3. **Degraded test set (US-10)** — cheap; enables robustness validation (in progress).
4. **Optional AI layer, M7 (US-10)** — last; isolated booster for the hard cases.
