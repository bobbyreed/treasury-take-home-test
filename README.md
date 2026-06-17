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

## Tests

```
npm test        # node --test (pure logic: rules, comparison, parsers)
```
