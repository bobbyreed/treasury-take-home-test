# Project brief — for the portfolio / job-application Claude

**Audience:** the Claude process that manages Bobby Reed's portfolio website and
job applications. **Purpose:** give you everything you need to represent this
project accurately when using it as part of an application for a U.S. Treasury
(TTB) role. Written 2026-06-22.

> **Golden rule:** represent this honestly. It's a strong prototype, not a
> production system, and it was built by Bobby in collaboration with Claude Code
> (the build journal and README say so openly). Don't inflate it, don't invent
> metrics, and prefer the numbers and claims already written in the repo.

---

## TL;DR

A working prototype of an **AI-powered alcohol-label verification tool** for TTB
compliance agents: upload (or photograph) a beverage label, enter the values from
the application, and get a per-field **PASS / NEEDS REVIEW** verdict — brand,
class/type, ABV, net contents, producer, country of origin (imports), and the
mandatory government health warning.

It was built as a **take-home assignment** for a Treasury position. The original
prompt and stakeholder interviews live in
[`instructions/README.md`](./instructions/README.md); the project is a direct
answer to them.

- **Repo:** https://github.com/bobbyreed/treasury-take-home-test
- **Live app:** https://treasury-take-home-test.web.app
- **Build journal (separate site):** https://treasury-take-home-test-blog.web.app
- **Primary docs:** [`README.md`](./README.md) (setup, approach, brief-mapping,
  limitations, credits) and [`docs/requirements.md`](./docs/requirements.md)
  (personas, user stories, feature→story traceability).

*(If a URL is ever wrong, the source of truth is `.firebaserc` / `firebase.json`
and the GitHub remote.)*

---

## What it does (five surfaces)

| Surface | What it is |
|---|---|
| **Single label** | Upload one label, enter application values, get a per-field verdict with plain-language reasons. Optional "Double-check with AI" button. |
| **Batch** | Many labels + a CSV of expected values (paired by filename); a worker pool runs them with progress, a needs-review filter, and CSV export — for peak-season importer dumps (200–300 at a time). |
| **Instructions** | A guided coachmark tour laid over the *real* single-label screen (you can type/click as it explains each control). |
| **Guided practice** | An 18-level trainer over the sample labels: enter or judge the application values, run the real checker, then make the approve / request-review call. Progress saves locally. |
| **Mobile build** (`/m/`) | A dedicated, camera-first phone version (all four screens); mobile devices are auto-redirected there, with a "view desktop version" escape. On a phone the primary action is **take a photo of the label**, not file upload. |

---

## Architecture & stack (in plain terms)

- **Offline-first by design.** Image cleanup, OCR, field extraction, and the
  PASS/NEEDS-REVIEW verdict all run **in the browser with no network**. This is
  the central engineering decision (see "Why" below).
- **Optional online AI booster.** A single Firebase Cloud Function can ask
  **Claude Sonnet 4.6** for a second reading of a hard label. It's isolated: the
  offline verdict is fully correct without it, and the call times out rather than
  hanging. The API key is a server-side secret, never in the browser.
- **No build step.** Vanilla HTML/CSS/ES-modules. Libraries are *vendored*
  (Tesseract.js for OCR, Fuse.js for fuzzy matching) so the core needs no CDN.
- **Hosting:** Firebase (two sites — the app, and the build-journal blog).
- **Tests:** Node's built-in runner; ~105 tests over the pure logic (rules,
  comparison engine, extractors, CSV, the practice curriculum, the AI client's
  error paths). `npm test`.

**Why offline-first matters (and why it's the headline talking point):** a TTB
interviewee described a prior vendor whose ML features "half died" because the
agency firewall blocked its endpoints, and another that was abandoned because it
took 30–40s per label. Building the whole core to run locally answers both — it
works behind the firewall and it's fast — and treats the LLM as a help, not a
dependency. That judgment (knowing when *not* to lean on the AI) is the most
impressive thing here.

---

## How it answers the assignment

The README has a dedicated **"How it addresses the brief"** section that maps each
interviewee's concern (Sarah's 5-second + simplicity + batch bars; Marcus's
firewall / no-PII / standalone constraints; Dave's "STONE'S THROW = Stone's Throw"
judgment; Jenny's verbatim all-caps warning + bad-photo handling) to the concrete
feature that addresses it. `docs/requirements.md` carries the full
feature→user-story→status traceability matrix. **Point reviewers at those rather
than re-deriving claims.**

---

## Good talking points for an application

- **Engineering judgment over hype:** chose a deterministic, testable, offline
  pipeline as the core and deliberately demoted the LLM to an optional, isolated
  booster — directly because of the firewall and latency lessons in the interviews.
- **"Couldn't read" ≠ "wrong":** a garbled-text signal routes an unreadable field
  to *"couldn't read — try a clearer image"* instead of a false mismatch, matching
  how agents actually work (reject and request a better photo).
- **Tolerant where it should be:** case/punctuation differences are a "minor
  difference," echoing Dave's point that `STONE'S THROW` and `Stone's Throw` are
  the same thing.
- **Verbatim where it must be:** the government warning is checked for the
  all-caps `GOVERNMENT WARNING:` lead-in plus near-complete coverage of the
  canonical text (Jenny's hard requirement).
- **Took adoption seriously:** an Instructions tour and a leveled Guided Practice
  trainer — built for a team that is half over 50 and includes a self-described
  low-tech veteran.
- **Measured instead of guessed:** when a UI hint about image cleanup was just a
  hunch, it was tested across the label set and the guidance was corrected (see
  README "Does 'clean up the image' help? (measured)" and blog Entry 12). Good
  signal of intellectual honesty.
- **Documented thinking:** a build journal (`blog/`) narrates the decisions
  entry by entry; `docs/` has the plan, an architecture review, requirements, and
  testing findings.

---

## Honest limitations (so the application never overclaims)

- Decorative / 3-D display fonts and gold-on-dark low-contrast text can defeat the
  offline OCR; these are the cases for the optional AI layer.
- Full-scene bottle photos (label is a small part of the frame) read poorly;
  controlled, label-filling images work best.
- Font *weight/size* of the warning can't be judged from OCR text.
- The sample labels are **AI-generated fictional products**, not real TTB filings.
- The AI layer needs outbound network (the firewalled part) — optional by design.
- It's a standalone prototype: no persistence, not integrated with COLA, and the
  Treasury/TTB mark is presentation-only (no endorsement implied).

---

## How it was built (be transparent if asked)

Bobby built this with **Claude Code (Claude Opus 4.8)** as a development
collaborator. The repo is open about it: the README's Credits section names it,
and the build journal is written from that working relationship. If an
application or interviewer asks about AI assistance, the honest framing is: Bobby
directed the product decisions, architecture trade-offs, and scope; Claude helped
implement and document. Don't hide it and don't overstate Bobby's hands-on-keys
share beyond what's true.

---

## Repo map

```
app/            the application (static; Firebase "app" target)
  index/batch/instructions/practice.html   the four desktop screens
  m/            the camera-first mobile build (auto-redirected to)
  js/pipeline/  pure recognition + comparison logic (unit-tested)
  js/ui/        DOM glue + the tour and practice engines
  js/practice/  the guided-practice curriculum (pure data)
  vendor/       Tesseract + Fuse, vendored (no CDN)
functions/      the optional verifyLabel Cloud Function (Claude Sonnet 4.6)
sample-labels/  AI-generated test labels + expected-values.csv
docs/           plan, architecture review, requirements/traceability, findings
blog/           build journal (separate hosting target)
test/           node --test suites
instructions/   the original assignment + stakeholder interviews
```

---

## Guardrails for you (the portfolio/application Claude)

- **Accuracy first.** Prefer claims already in `README.md`, `docs/requirements.md`,
  and the blog. Don't invent performance numbers, accuracy percentages, or
  features. "~5 seconds" is an *average* target across a representative set, not a
  guaranteed per-image cap — phrase it that way.
- **The blog and the app are intentionally separate** and not cross-linked. If you
  surface links, treat them as two distinct artifacts.
- **Don't deploy, rotate secrets, or change infra.** This repo is Bobby's; if the
  application workflow needs changes here, raise it with Bobby — the Claude that
  owns *this* project (with full build context) should make code changes.
- **The API key is server-side only.** Never put it in any application material,
  screenshot, or page.
- **If you need deeper detail**, read `README.md` first, then
  `docs/requirements.md`, then the build journal in `blog/index.html`.
