/**
 * First-visit welcome. Introduces the tool and points out the four nav buttons,
 * reusing the coachmark tour engine. Shows once per browser (localStorage), then
 * never again. Browser-only.
 */
import { createTour } from './tour.js';

const STORE = 'ttb-welcomed-v1';

const STEPS = [
  {
    target: null,
    title: 'Welcome',
    body: 'This tool helps you check an alcohol-beverage label against the '
      + 'application — brand, class/type, alcohol content, net contents, producer, '
      + 'country of origin, and the government warning. Add a label, enter the '
      + 'values, and get a PASS or NEEDS REVIEW result.',
  },
  {
    target: '.app-nav',
    title: 'Four ways in',
    body: 'Single label checks one label. Batch checks many from a CSV. '
      + 'Instructions walks you through the screen. Guided practice lets you train '
      + 'on sample labels. Switch between them any time with these buttons.',
    placement: 'bottom',
  },
];

export function initWelcome(doc) {
  try {
    if (localStorage.getItem(STORE) === '1') return;
    // Mark as shown up front so it only ever appears on the first visit.
    localStorage.setItem(STORE, '1');
  } catch (e) {
    return; // storage blocked — skip rather than risk showing every load
  }
  createTour(STEPS, { root: doc }).start();
}
