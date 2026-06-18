/**
 * Shared DOM rendering for the verdict card (M5). Result is communicated with
 * words + icon + color (never color alone), in plain language.
 * Browser-only.
 */

import { STATUS, OVERALL } from '../pipeline/status.js';

const STATUS_META = {
  [STATUS.MATCH]: { icon: '✓', label: 'Matches', cls: 'ok' },
  [STATUS.MINOR_DIFFERENCE]: { icon: '≈', label: 'Minor difference', cls: 'minor' },
  [STATUS.MISMATCH]: { icon: '✗', label: 'Does not match', cls: 'bad' },
  [STATUS.MISSING]: { icon: '✗', label: 'Missing', cls: 'bad' },
  [STATUS.LOW_CONFIDENCE]: { icon: '?', label: 'Couldn’t read — try a clearer image', cls: 'warn' },
};

const FIELD_LABEL = {
  brandName: 'Brand name',
  classType: 'Class / type',
  abv: 'Alcohol content',
  netContents: 'Net contents',
  producer: 'Producer / bottler',
  countryOfOrigin: 'Country of origin',
  warning: 'Government warning',
};

/**
 * @param {object} report - VerificationReport
 * @returns {HTMLElement}
 */
export function renderReport(report) {
  const root = document.createElement('div');
  root.className = 'report';

  const pass = report.overall === OVERALL.PASS;

  const banner = document.createElement('h2');
  banner.className = `verdict ${pass ? 'verdict-pass' : 'verdict-review'}`;
  banner.tabIndex = -1;
  banner.textContent = pass ? '✓ PASS' : '⚠ NEEDS REVIEW';
  root.appendChild(banner);

  const sub = document.createElement('p');
  sub.className = 'verdict-sub';
  sub.textContent = pass
    ? 'All required fields match the application.'
    : 'One or more required fields need a human check — see below.';
  root.appendChild(sub);

  const list = document.createElement('ul');
  list.className = 'fields';
  for (const f of report.fields) {
    list.appendChild(renderField(f));
  }
  root.appendChild(list);

  return root;
}

function renderField(f) {
  const meta = STATUS_META[f.status] || { icon: '•', label: f.status, cls: '' };
  const li = document.createElement('li');
  li.className = `field ${meta.cls}`;

  const icon = document.createElement('span');
  icon.className = 'field-status';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = meta.icon;
  li.appendChild(icon);

  const body = document.createElement('span');
  body.className = 'field-body';

  body.appendChild(span('field-name', FIELD_LABEL[f.field] || f.field));
  body.appendChild(span('field-verdict', meta.label));
  if (f.note) body.appendChild(span('field-note', f.note));
  if (f.field !== 'warning') {
    body.appendChild(values(f));
  }

  li.appendChild(body);
  return li;
}

function values(f) {
  const wrap = document.createElement('span');
  wrap.className = 'field-values';
  wrap.appendChild(document.createTextNode('expected: '));
  wrap.appendChild(strong(present(f.expectedValue)));
  wrap.appendChild(document.createTextNode('  ·  on label: '));
  wrap.appendChild(strong(present(f.extractedValue)));
  return wrap;
}

const present = (v) => (v != null && String(v) !== '' ? String(v) : '—');

function span(cls, text) {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  return el;
}

function strong(text) {
  const el = document.createElement('b');
  el.textContent = text;
  return el;
}
