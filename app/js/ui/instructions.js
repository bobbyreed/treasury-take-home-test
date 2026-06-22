/**
 * Instructions page: the REAL single-label checker with a guided coachmark tour
 * laid over it. The tour points at each live control; because the spotlight has
 * pointer-events: none, the learner can actually type and click as they go.
 *
 * To make the final "read the verdict" step concrete, we pre-load a sample label
 * (Mountain Peak) and pre-fill its application values, so clicking Verify at the
 * end produces a real PASS to look at.
 */
import { initSingle } from './single.js';
import { createTour } from './tour.js';

const SAMPLE = {
  image: './practice/labels/MountainPeak.jpg',
  fileName: 'MountainPeak.png',
  values: {
    brandName: 'Mountain Peak Brewing',
    classType: 'India Pale Ale (IPA)',
    abv: '7.2% Alc./Vol.',
    netContents: '12 FL. OZ. (355 mL)',
    producer: 'Brewed & Canned by Mountain Peak Brewing, Denver, CO',
  },
};

const STEPS = [
  {
    target: null,
    title: 'Welcome — let’s learn the label checker',
    body: 'This is the real single-label screen. I’ll point at each part. You can '
      + 'type and click as we go. We’ve pre-loaded an example label and its '
      + 'application values so you can try a real check at the end.',
  },
  {
    target: '#labelImage',
    title: '1. Choose the label image',
    body: 'Pick a photo or scan of the label. Straight-on and filling the frame '
      + 'reads best. (We’ve loaded an example for you here.)',
  },
  {
    target: '#binarize',
    title: '2. Clean up the image',
    body: 'On by default, and a good choice for most real photos: it boosts '
      + 'contrast so the reader copes with glare and uneven lighting. The exception '
      + 'is colored, low-contrast text — like Viking Blood’s gold lettering on dark '
      + 'crimson — where cleanup can merge the colors together. If a field comes '
      + 'back “couldn’t read,” try turning this off and re-running, or use the AI '
      + 'double-check.',
  },
  {
    target: '.import-checkbox',
    title: '3. Imported product?',
    body: 'Check this only for imports. It unlocks the Country of origin field, '
      + 'which the law requires on imported products.',
  },
  {
    target: '#countryOfOrigin',
    title: '4. Country of origin',
    body: 'Stays locked until you check “Imported”. For imports, enter the '
      + 'country the application lists.',
  },
  {
    target: '#brandName',
    title: '5. Enter the application values',
    body: 'Type what the application says for each field — brand, class/type, '
      + 'alcohol content, net contents, producer. The tool reads the label and '
      + 'compares it to what you typed.',
  },
  {
    target: '#abv',
    title: '6. Alcohol content',
    body: 'Include the percentage and proof exactly as the application states, '
      + 'e.g. “45% Alc./Vol. (90 Proof)”. Minor spacing or case differences are '
      + 'treated as a match, not a failure.',
  },
  {
    target: '#producer',
    title: '7. Producer / bottler',
    body: 'The full producer/bottler line as printed. This field gets the whole '
      + 'bottom row because it’s usually the longest.',
  },
  {
    target: '#verifyBtn',
    title: '8. Run the check',
    body: 'Click Verify label. The first run also loads the reader, so it takes a '
      + 'moment; later runs are faster. Go ahead and click it now.',
  },
  {
    target: null,
    title: 'Reading the verdict',
    body: 'PASS means every required field matched. NEEDS REVIEW means something '
      + 'wants a human look — the card shows which field, what was expected vs. '
      + 'what’s on the label, and a plain-language reason. “Couldn’t read” is not '
      + 'a failure — it means take a clearer photo. That’s it! Try Guided practice '
      + 'next to put it to work.',
  },
];

function setNativeValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function preloadSample(doc) {
  const v = SAMPLE.values;
  for (const [id, val] of Object.entries(v)) {
    const el = doc.getElementById(id);
    if (el) setNativeValue(el, val);
  }
  // Drop the bundled sample image into the real file input so Verify works.
  try {
    const resp = await fetch(SAMPLE.image);
    if (!resp.ok) return;
    const blob = await resp.blob();
    const file = new File([blob], SAMPLE.fileName, { type: blob.type || 'image/jpeg' });
    const input = doc.getElementById('labelImage');
    if (input && typeof DataTransfer !== 'undefined') {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch {
    /* offline / not served — the form still works with a user-chosen file */
  }
}

export function initInstructions(doc) {
  initSingle(doc); // real, fully-functional single-label flow
  preloadSample(doc);

  const tour = createTour(STEPS, { root: doc });
  const replay = doc.getElementById('replayTour');
  if (replay) replay.addEventListener('click', () => tour.start());
  // Start automatically on first arrival.
  tour.start();
}
