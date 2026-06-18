# Treasury Take-Home — AI-Powered Alcohol Label Verification

Prototype that verifies TTB alcohol-beverage labels against application data.
**Offline-first** recognition — HTML-canvas preprocessing + Tesseract.js OCR +
heuristic field extraction + deterministic comparison with beverage-specific
rules — with an **optional online** Claude Sonnet 4.6 verification layer.

The offline core is deliberate: TTB's network blocks outbound AI endpoints, so
the tool must work standalone and treat the LLM as a booster, not a dependency.

**Status:** in development. Planning docs in [`docs/`](./docs):
- [PLAN.md](./docs/PLAN.md) — product & architecture plan
- [diagrams.md](./docs/diagrams.md) — UML / architecture diagrams
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) — build plan & milestones

A build journal, authored as the project progresses, lives in [`blog/`](./blog).

Setup / run / deploy instructions will be completed here at the deploy milestone.

## Limitations & known issues

Observed while testing real generated labels. The offline OCR (Tesseract) is the
source of most of these; the optional AI vision layer is intended to cover the
hard cases.

- **Decorative / 3-D display fonts are unreadable.** Ornate display type — e.g.
  the carved runic "Viking Blood" title — defeats the offline OCR entirely (it
  isn't trained on such fonts), even with no preprocessing. Body text on the same
  label reads fine. These are exactly the cases for the optional AI layer.
- **Low-contrast colored text is hard.** Gold text on a dark crimson background
  (e.g. a stylized "13.5% VOL.") has low *luminance* contrast and reads poorly;
  the optional "clean up image" step (binarization) helps some labels and hurts
  others, so it's a toggle rather than always-on.
- **Full-scene product photos read poorly.** When the label is a small part of a
  larger photo (a bottle on a shelf), OCR mostly reads the background. Controlled,
  label-filling images work best. Imperfect photos (angle, glare, lighting) are a
  stretch per the brief; the tool flags low confidence and asks for a clearer
  image rather than guessing — matching the current human "reject and request a
  better image" workflow.
- **"Unreadable" vs "wrong" is coarse.** The verdict currently uses an overall OCR
  confidence number, so a field that is legible to a human but in a font the OCR
  can't read may show as "does not match" rather than "couldn't read." Per-field
  confidence is a planned improvement.
- **The warning check is coverage-based, not literal.** Because OCR is lossy, the
  government warning is verified by an all-caps lead-in plus near-complete token
  coverage of the canonical statement — not an exact character match. Font weight
  and size can't be judged from OCR text.
- **The AI layer needs outbound network** — the part TTB's firewall blocks. It is
  optional by design; the offline core stands alone.
- **Prototype scope.** No persistence of label images or PII; not integrated with
  COLA. The TTB/Treasury logo is used for presentation only — this is a prototype,
  **not an official TTB system**, and its use here does not imply endorsement.

## Tests

```
npm test        # node --test (pure logic: rules, comparison, parsers)
```
