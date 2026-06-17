# UML / Architecture Diagrams — Label Verification Prototype

> Draft v1 for review. These reflect the **offline-first** architecture in
> [`PLAN.md`](./PLAN.md): a client-side recognition pipeline that works with no
> network, plus an **optional online LLM verification** layer.

---

## 1. Use cases

```mermaid
flowchart LR
  agent([Compliance Agent])

  subgraph App[Label Verification App]
    uc1([Verify a single label])
    uc6([Select / confirm beverage type])
    uc3([Review per-field result])
    uc2([Batch-verify many labels])
    uc4([Export results as CSV])
    uc5([Request AI verification<br/>online only])
  end

  agent --- uc1
  agent --- uc2
  agent --- uc3
  agent --- uc4
  agent --- uc5

  uc1 -.includes.-> uc6
  uc2 -.includes.-> uc6
  uc1 -.optional extends.-> uc5
  uc2 --- uc3
  uc2 --- uc4
```

---

## 2. Component / deployment view

The dashed boundary marks what runs **offline in the browser** (the product) vs
the **optional online** Firebase + Anthropic layer.

```mermaid
flowchart TB
  subgraph Browser["Browser — vanilla HTML/CSS/JS (works offline)"]
    UI["UI Layer<br/>(upload, forms, results, batch table)"]
    PRE["Image Preprocessor<br/>(canvas: grayscale, threshold, deskew)"]
    OCR["OCR Engine<br/>(Tesseract.js / WASM, local)"]
    EXT["Field Extractor<br/>(regex + keyword heuristics)"]
    CMP["Comparison Engine<br/>(normalize, fuzzy, verbatim warning,<br/>beverage rules)"]
    UI --> PRE --> OCR --> EXT --> CMP --> UI
  end

  subgraph FB["Firebase (online, optional)"]
    HOST["Firebase Hosting<br/>(static assets + Tesseract files)"]
    FN["Cloud Function: verifyLabel<br/>(holds API key)"]
  end

  ANT["Anthropic API<br/>Claude Sonnet 4.6 (structured output)"]

  Browser -. loads app .-> HOST
  CMP -. optional 'Verify with AI' .-> FN
  FN --> ANT
  ANT -. revised fields .-> FN
  FN -. revised fields .-> CMP
```

---

## 3. Sequence — single label (offline core path)

```mermaid
sequenceDiagram
  actor Agent
  participant UI
  participant Pre as Preprocessor
  participant OCR as Tesseract.js
  participant Ext as Extractor
  participant Cmp as Comparison Engine

  Agent->>UI: upload image + expected fields + beverage type
  UI->>Pre: preprocess (grayscale, threshold, deskew)
  Pre->>OCR: cleaned image
  OCR-->>Ext: text + word boxes + confidence
  Ext->>Ext: locate brand / class / ABV / net / producer / warning
  Ext->>Cmp: ExtractedFields
  Cmp->>Cmp: normalize, fuzzy-match, verbatim warning, apply beverage rules
  Cmp-->>UI: VerificationReport
  UI-->>Agent: PASS / NEEDS REVIEW + per-field detail
```

---

## 4. Sequence — optional AI verification (online, opt-in)

```mermaid
sequenceDiagram
  actor Agent
  participant UI
  participant Fn as Cloud Function (verifyLabel)
  participant Claude as Claude Sonnet 4.6

  Agent->>UI: "Verify with AI" (online)
  UI->>Fn: image + OCR text + extracted + expected fields
  Fn->>Claude: structured-output extraction/verification prompt
  Claude-->>Fn: revised fields + confidence (JSON)
  Fn-->>UI: revised ExtractedFields
  UI->>UI: re-run comparison, diff vs offline result
  UI-->>Agent: revised report, AI-confirmed / changed fields flagged
```

---

## 5. Sequence — batch mode

```mermaid
sequenceDiagram
  actor Agent
  participant UI
  participant Q as Batch Queue<br/>(bounded concurrency)
  participant P as Per-label pipeline<br/>(pre → OCR → extract → compare)

  Agent->>UI: upload N images (+ optional expected-values file)
  UI->>Q: enqueue N jobs
  loop up to ~6 concurrent
    Q->>P: process one label
    P-->>Q: VerificationReport
    Q-->>UI: update progress + append result row
  end
  UI-->>Agent: results table (filter: needs review) + CSV export
```

---

## 6. Data model (class diagram)

```mermaid
classDiagram
  class LabelImage {
    id
    filename
    blob
    previewUrl
  }
  class ExpectedFields {
    brandName
    classType
    abv
    netContents
    producer
    countryOfOrigin
    beverageType
  }
  class ExtractedFields {
    brandName
    classType
    abv
    netContents
    producer
    countryOfOrigin
    warningText
    warningAllCaps
    rawText
    wordBoxes
    ocrConfidence
    source  : OCR | AI
  }
  class FieldComparison {
    field
    expectedValue
    extractedValue
    status : MATCH | MINOR_DIFFERENCE | MISMATCH | MISSING | LOW_CONFIDENCE
    note
  }
  class VerificationReport {
    labelId
    overall : PASS | NEEDS_REVIEW
    beverageType
    usedAI
    createdAt
  }
  class BeverageRuleSet {
    beverageType
    requiredFields
    abvRequired
    notes
  }

  LabelImage --> ExtractedFields : produced by pipeline
  ExpectedFields --> VerificationReport : input
  ExtractedFields --> VerificationReport : input
  VerificationReport "1" --> "*" FieldComparison : contains
  BeverageRuleSet --> VerificationReport : governs required fields
```

---

## 7. State — verification lifecycle

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Preprocessing: upload image
  Preprocessing --> Ocr: cleaned
  Ocr --> Extracting: text + boxes
  Extracting --> Comparing: fields located
  Comparing --> Pass: all required fields match
  Comparing --> NeedsReview: mismatch / missing
  Comparing --> AiVerifying: low confidence AND online
  NeedsReview --> AiVerifying: agent requests AI (online)
  AiVerifying --> Revised: revised fields returned
  Revised --> Pass
  Revised --> NeedsReview
  Pass --> [*]
  NeedsReview --> [*]
```

---

## 8. Deployment topology (one project, two Hosting sites + blog)

```mermaid
flowchart TB
  agent([Compliance Agent])
  reader([Blog reader])

  subgraph Project["Single Firebase Project"]
    AppSite["Hosting site: app<br/>vanilla webapp + Tesseract.js assets"]
    BlogSite["Hosting site: blog<br/>vanilla static build journal (Claude)"]
    Fn["Cloud Function: verifyLabel<br/>(holds Anthropic API key)"]
  end

  ANT["Anthropic API — Claude Sonnet 4.6"]

  agent --> AppSite
  reader --> BlogSite
  AppSite -. "/api/verifyLabel rewrite (online, optional)" .-> Fn
  Fn --> ANT
```

