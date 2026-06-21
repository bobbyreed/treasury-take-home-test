/**
 * Cloud Functions for the TTB Label Verification prototype.
 *
 * `verifyLabel` is the OPTIONAL online verification endpoint. The offline
 * recognition pipeline in the browser never depends on it — it's a booster for
 * hard labels (decorative fonts, low-contrast colored text) that Tesseract can't
 * read. Routed via the Hosting rewrite: POST /api/verifyLabel -> this function.
 *
 * One Claude Sonnet 4.6 call: vision (the label image) + the offline OCR text as
 * a hint, returning the printed field values through a forced tool call
 * (structured output). The browser then re-runs the same deterministic
 * comparison engine on the AI's reading. The API key is read from a Firebase
 * secret and never reaches the browser.
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

setGlobalOptions({ maxInstances: 10 });

const MODEL = "claude-sonnet-4-6";

const SYSTEM = [
  "You are a TTB alcohol-beverage label reader.",
  "Read the printed text directly from the label image and report each field",
  "exactly as printed. The provided OCR text is a noisy hint only — trust the",
  "image over the OCR. Do not guess or normalize: if a field is not visible on",
  "the label, return an empty string for it. Report the government health",
  "warning verbatim if present, and whether its 'GOVERNMENT WARNING' lead-in is",
  "in all capital letters.",
].join(" ");

// Forced-tool structured output. Strings use "" for absent (kept simple and
// schema-portable); the client treats "" as null.
const FIELD_TOOL = {
  name: "record_label_fields",
  description: "Record the fields read from the alcohol-beverage label image.",
  input_schema: {
    type: "object",
    properties: {
      brandName: { type: "string", description: "Brand name as printed, or \"\" if absent." },
      classType: { type: "string", description: "Class/type or fanciful name (e.g. 'Kentucky Straight Bourbon Whiskey'), or \"\"." },
      abv: { type: "string", description: "Alcohol content exactly as printed, e.g. '45% Alc./Vol. (90 Proof)' or '13.5% VOL.', or \"\"." },
      netContents: { type: "string", description: "Net contents exactly as printed, e.g. '750 mL' or '12 FL. OZ. (355 mL)', or \"\"." },
      producer: { type: "string", description: "Producer/bottler/importer statement as printed, or \"\"." },
      countryOfOrigin: { type: "string", description: "Country of origin if shown (e.g. 'MEXICO'), or \"\"." },
      warningText: { type: "string", description: "The full Government Warning text verbatim if present, else \"\"." },
      warningAllCaps: { type: "boolean", description: "true iff the 'GOVERNMENT WARNING' lead-in is in all capital letters." },
      readable: { type: "boolean", description: "false if the label is too blurry, dark, small, or obstructed to read reliably." },
      confidence: { type: "integer", description: "Overall confidence in this reading, 0-100." },
      notes: { type: "string", description: "Brief note on anything ambiguous or unreadable, or \"\"." },
    },
    required: [
      "brandName", "classType", "abv", "netContents", "producer",
      "countryOfOrigin", "warningText", "warningAllCaps", "readable", "confidence",
    ],
  },
};

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

exports.verifyLabel = onRequest(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: "512MiB", cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST." });
    }

    const { image, ocrText } = req.body || {};
    if (!image || !image.dataBase64 || !ALLOWED_MEDIA.has(image.mediaType)) {
      return res.status(400).json({ error: "Provide image.{mediaType,dataBase64} (jpeg/png/webp/gif)." });
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools: [FIELD_TOOL],
        tool_choice: { type: "tool", name: "record_label_fields" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: image.mediaType, data: image.dataBase64 },
              },
              {
                type: "text",
                text: "Read this alcohol-beverage label and record the fields. OCR hint (may be garbled):\n" +
                  String(ocrText || "(none)").slice(0, 4000),
              },
            ],
          },
        ],
      });

      const tool = (msg.content || []).find((b) => b.type === "tool_use");
      if (!tool || !tool.input) {
        return res.status(502).json({ error: "Model returned no structured output." });
      }
      const f = tool.input;
      const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

      return res.json({
        extracted: {
          brandName: str(f.brandName),
          classType: str(f.classType),
          abv: str(f.abv),
          netContents: str(f.netContents),
          producer: str(f.producer),
          countryOfOrigin: str(f.countryOfOrigin),
          warningText: str(f.warningText),
          warningAllCaps: !!f.warningAllCaps,
          readable: f.readable !== false,
          source: "AI",
        },
        confidence: Number.isFinite(f.confidence) ? f.confidence : null,
        notes: str(f.notes),
      });
    } catch (err) {
      console.error("verifyLabel error:", err);
      const status = err && err.status === 401 ? 500 : 502;
      return res.status(status).json({ error: "AI verification failed.", detail: err && err.message });
    }
  },
);
