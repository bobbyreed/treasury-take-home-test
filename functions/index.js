/**
 * Cloud Functions for the TTB Label Verification prototype.
 *
 * `verifyLabel` is the OPTIONAL online verification endpoint. The offline
 * recognition pipeline in the browser never depends on it. Routed via the
 * Hosting rewrite: POST /api/verifyLabel -> this function.
 *
 * Placeholder (M1): health check only. The real implementation (M7) makes a
 * single Claude Sonnet 4.6 structured-output call to verify/revise the
 * fields extracted offline; the API key is read from a Firebase secret and
 * never reaches the browser.
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");

setGlobalOptions({ maxInstances: 10 });

exports.verifyLabel = onRequest((req, res) => {
  // Same-origin in production (served through the Hosting rewrite); permissive
  // here only to ease direct testing. Tightened when the real handler lands (M7).
  res.set("Access-Control-Allow-Origin", "*");

  res.json({
    ok: true,
    milestone: "M1",
    message: "verifyLabel placeholder. AI verification is implemented at M7.",
  });
});
