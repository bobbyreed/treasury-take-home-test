/**
 * App entry point. Wires the single-label verification flow (M5). Batch mode
 * (M6) is added after the engineering-consolidation phase.
 */
import { initSingle } from './ui/single.js';

window.addEventListener('DOMContentLoaded', () => {
  initSingle(document);
});
