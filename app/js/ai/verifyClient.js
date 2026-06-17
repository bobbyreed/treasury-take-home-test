/**
 * Optional online verification client. POSTs to the `verifyLabel` Cloud Function
 * and returns revised ExtractedFields (source: "AI"); the caller re-runs the
 * comparison and flags differences from the offline read.
 *
 * Gated on connectivity and opt-in; the offline pipeline never depends on this. (M7)
 *
 * @param {{
 *   image: { mediaType: string, dataBase64: string },
 *   ocrText: string,
 *   extracted: object,
 *   expected: object,
 *   beverageType: string
 * }} payload
 * @returns {Promise<{ extracted: object, confidence: object, notes: string }>}
 */
export async function verifyWithAI(payload) {
  throw new Error('verifyWithAI: not implemented (M7)');
}
