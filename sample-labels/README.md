# Sample labels

Test inputs, assembled across milestones (finalized at M9).

- **AI-generated edge cases** (Gemini/ChatGPT): title-case warning, missing
  warning, reworded warning, `% Alc./Vol.` vs `Proof` mismatch, `STONE'S THROW`
  vs `Stone's Throw`, wrong net contents, missing country of origin on an import.
- **Real photos** (~10–20, varying quality: glare, angle, curvature) to exercise
  preprocessing + OCR confidence.
- **`expected-values.csv`** — one row per image for batch pairing.
