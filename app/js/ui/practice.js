/**
 * Guided Practice: a leveled trainer over the clean label set. Each level
 * pre-loads a real label, runs the REAL offline pipeline, and ends in an
 * Approve / Request-review call that gates progression. Progress is saved in
 * localStorage. See app/js/practice/levels.js for the curriculum and the
 * gating rationale.
 */
import { runVerification } from '../pipeline/run.js';
import { renderReport } from './render.js';
import { normalize } from '../pipeline/text.js';
import { LEVELS, FIELD_LABELS, CALLS, isCorrectCall, isCorrectField } from '../practice/levels.js';

const STORE = 'ttb-guided-practice-v1';
const TEXT_FIELDS = ['brandName', 'classType', 'abv', 'netContents', 'producer'];
const SCROLL = (typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

function loadCompleted() {
  try {
    const n = parseInt(localStorage.getItem(STORE), 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(LEVELS.length, n)) : 0;
  } catch { return 0; }
}
function saveCompleted(n) {
  try { localStorage.setItem(STORE, String(n)); } catch { /* private mode */ }
}

export function initPractice(doc) {
  const mapEl = doc.getElementById('level-map');
  const panelEl = doc.getElementById('level-panel');
  const progressEl = doc.getElementById('practice-progress');
  const resetBtn = doc.getElementById('reset-progress');
  if (!mapEl || !panelEl) return;

  let completed = loadCompleted();
  let current = -1;

  function unlocked(idx) { return idx <= completed; }

  function renderProgress() {
    if (!progressEl) return;
    progressEl.textContent = completed >= LEVELS.length
      ? `All ${LEVELS.length} levels complete — nicely done.`
      : `${completed} of ${LEVELS.length} levels cleared.`;
  }

  function renderMap() {
    mapEl.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'level-chip';
      const done = idx < completed;
      const locked = !unlocked(idx);
      if (done) b.classList.add('done');
      if (locked) b.classList.add('locked');
      if (idx === current) b.classList.add('active');
      b.disabled = locked;
      const mark = done ? '✓' : locked ? '🔒' : '';
      b.innerHTML = `<span class="level-num">${idx + 1}</span>`
        + `<span class="level-name">${lvl.product}</span>`
        + `<span class="level-mark">${mark}</span>`;
      b.setAttribute('aria-label',
        `Level ${idx + 1}: ${lvl.product}. ${done ? 'Completed.' : locked ? 'Locked.' : 'Available.'}`);
      if (!locked) b.addEventListener('click', () => openLevel(idx));
      mapEl.appendChild(b);
    });
    renderProgress();
  }

  function buildForm(level) {
    const form = doc.createElement('form');
    form.className = 'practice-form';
    form.noValidate = true;
    form.innerHTML = `
      <div class="grid">
        <label class="checkbox import-checkbox">
          <input type="checkbox" name="isImport" disabled>
          Imported (requires country of origin)
        </label>
        <label>Country of origin
          <input type="text" name="countryOfOrigin" autocomplete="off" placeholder="imports only">
        </label>
        <label>Brand name<input type="text" name="brandName" autocomplete="off"></label>
        <label>Class / type<input type="text" name="classType" autocomplete="off"></label>
        <label>Alcohol content<input type="text" name="abv" autocomplete="off"></label>
        <label>Net contents<input type="text" name="netContents" autocomplete="off"></label>
        <label class="full-row">Producer / bottler<input type="text" name="producer" autocomplete="off"></label>
      </div>`;

    const get = (n) => form.querySelector(`[name="${n}"]`);
    get('isImport').checked = level.isImport;
    get('countryOfOrigin').disabled = !level.isImport;

    if (level.type === 'judge') {
      // Pre-filled, as if another agent entered it; locked so the learner judges.
      for (const f of TEXT_FIELDS) get(f).value = level.values[f];
      get('countryOfOrigin').value = level.values.countryOfOrigin || '';
      form.querySelectorAll('input').forEach((i) => { i.disabled = true; });
    }
    return form;
  }

  function readForm(form) {
    const v = (n) => form.querySelector(`[name="${n}"]`).value.trim();
    return {
      brandName: v('brandName'), classType: v('classType'), abv: v('abv'),
      netContents: v('netContents'), producer: v('producer'), countryOfOrigin: v('countryOfOrigin'),
    };
  }

  // For 'enter' levels, the learner must transcribe the paperwork faithfully
  // before running (tolerant of case/punctuation/spacing via normalize).
  function transcriptionErrors(level, entered) {
    const wrong = [];
    for (const f of [...TEXT_FIELDS, 'countryOfOrigin']) {
      const want = level.values[f] || '';
      if (!level.isImport && f === 'countryOfOrigin') continue;
      if (normalize(entered[f]) !== normalize(want)) wrong.push(f);
    }
    return wrong;
  }

  function openLevel(idx) {
    current = idx;
    const level = LEVELS[idx];
    panelEl.hidden = false;
    panelEl.innerHTML = '';

    const head = doc.createElement('div');
    head.className = 'level-head';
    head.innerHTML = `
      <p class="level-eyebrow">Level ${idx + 1} of ${LEVELS.length}
        <span class="type-badge ${level.type}">${level.type === 'enter' ? 'Enter the values' : 'Judge the entry'}</span></p>
      <h2 class="level-title" tabindex="-1">${level.product}</h2>`;
    panelEl.appendChild(head);

    const brief = doc.createElement('p');
    brief.className = 'level-brief';
    brief.textContent = level.type === 'enter'
      ? 'You’re the agent. Read the application paperwork below, type those values into the form exactly, then run the check and make your call.'
      : 'Another agent already entered these values (you can’t edit them). Run the check, read the verdict, and decide whether to approve or send it back.';
    panelEl.appendChild(brief);

    // Paperwork card (the application values to transcribe / that were entered).
    const paper = doc.createElement('div');
    paper.className = 'paperwork';
    const rows = [...TEXT_FIELDS, ...(level.isImport ? ['countryOfOrigin'] : [])]
      .map((f) => `<div class="paper-row"><dt>${FIELD_LABELS[f]}</dt><dd>${level.values[f] ? escapeHtml(level.values[f]) : '<em>(left blank)</em>'}</dd></div>`)
      .join('');
    paper.innerHTML = `<p class="paper-head">Application paperwork${level.isImport ? ' · imported product' : ''}</p><dl>${rows}</dl>`;
    panelEl.appendChild(paper);

    // Label image + form side by side.
    const work = doc.createElement('div');
    work.className = 'practice-work';
    const figure = doc.createElement('figure');
    figure.className = 'practice-figure';
    figure.innerHTML = `<img src="${level.image}" alt="Label for ${escapeHtml(level.product)}" class="preview">`
      + `<figcaption>The label image the tool will read</figcaption>`;
    const form = buildForm(level);
    work.append(figure, form);
    panelEl.appendChild(work);

    const runBtn = doc.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'primary';
    runBtn.textContent = 'Run the check';
    panelEl.appendChild(runBtn);

    const status = doc.createElement('p');
    status.className = 'status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const result = doc.createElement('section');
    result.setAttribute('aria-live', 'polite');
    const judge = doc.createElement('div');
    judge.className = 'judgment';
    judge.hidden = true;
    panelEl.append(status, result, judge);

    runBtn.addEventListener('click', () => runLevel(level, { form, runBtn, status, result, judge }));
    head.querySelector('.level-title').focus();
    head.scrollIntoView({ block: 'start', behavior: SCROLL });
    renderMap();
  }

  async function runLevel(level, els) {
    const { form, runBtn, status, result, judge } = els;
    result.innerHTML = '';
    judge.hidden = true;
    judge.innerHTML = '';

    const entered = readForm(form);

    if (level.type === 'enter') {
      const wrong = transcriptionErrors(level, entered);
      if (wrong.length) {
        status.className = 'status status-warn';
        status.textContent = `Check these against the paperwork before running: ${wrong.map((f) => FIELD_LABELS[f]).join(', ')}.`;
        form.querySelector(`[name="${wrong[0]}"]`).focus();
        return;
      }
    }

    runBtn.disabled = true;
    status.className = 'status';
    status.textContent = 'Reading the label and checking it… (the first run also loads the reader)';
    try {
      const resp = await fetch(level.image);
      const blob = await resp.blob();
      const { ocr, report, ms } = await runVerification(blob, {
        expected: entered, isImport: level.isImport, binarize: true, labelId: level.label,
      });
      const conf = Number.isFinite(ocr.confidence) ? `${Math.round(ocr.confidence)}%` : 'n/a';
      status.textContent = `Done in ${ms} ms · label-text confidence ${conf}. Now make your call.`;
      result.appendChild(renderReport(report));
      showJudgment(level, els);
    } catch (err) {
      status.className = 'status status-warn';
      status.textContent = `Couldn’t read this label: ${err && err.message ? err.message : err}. Try again.`;
    } finally {
      runBtn.disabled = false;
    }
  }

  function showJudgment(level, els) {
    const { judge } = els;
    judge.hidden = false;
    judge.innerHTML = `
      <p class="judge-q">Your call — does this label match the application?</p>
      <div class="judge-buttons">
        <button type="button" class="judge-approve" data-call="approve">✓ Approve</button>
        <button type="button" class="judge-review" data-call="review">⚑ Request review</button>
      </div>
      <div class="judge-feedback" aria-live="polite"></div>`;
    judge.querySelectorAll('[data-call]').forEach((btn) => {
      btn.addEventListener('click', () => onCall(level, btn.dataset.call, els));
    });
    judge.querySelector('.judge-q').scrollIntoView({ block: 'center', behavior: SCROLL });
  }

  function onCall(level, call, els) {
    const { judge } = els;
    const fb = judge.querySelector('.judge-feedback');
    const correct = isCorrectCall(level, call);

    if (!correct) {
      fb.className = 'judge-feedback bad';
      fb.innerHTML = `<strong>Not quite.</strong> ${level.answer === 'approve'
        ? 'This one actually checks out — look again at the verdict above; every required field is a match or only a minor difference.'
        : 'Look again — the verdict above flags a required field. ' + escapeHtml(level.teach)}<br>
        <button type="button" class="ghost-btn judge-retry">Try the call again</button>`;
      fb.querySelector('.judge-retry').addEventListener('click', () => {
        fb.innerHTML = '';
        fb.className = 'judge-feedback';
        judge.querySelectorAll('[data-call]').forEach((b) => { b.disabled = false; });
      });
      judge.querySelectorAll('[data-call]').forEach((b) => { b.disabled = true; });
      return;
    }

    judge.querySelectorAll('[data-call]').forEach((b) => { b.disabled = true; });

    // Correct call. On a review, offer the optional "which field?" follow-up.
    if (call === 'review' && level.badFields.length) {
      const chips = [...TEXT_FIELDS, ...(level.isImport ? ['countryOfOrigin'] : [])]
        .map((f) => `<button type="button" class="field-chip" data-field="${f}">${FIELD_LABELS[f]}</button>`).join('');
      fb.className = 'judge-feedback ok';
      fb.innerHTML = `<strong>Right call.</strong> Bonus — which field is the problem?<div class="field-chips">${chips}</div>`;
      fb.querySelectorAll('[data-field]').forEach((chip) => {
        chip.addEventListener('click', () => {
          const good = isCorrectField(level, chip.dataset.field);
          fb.querySelectorAll('[data-field]').forEach((c) => { c.disabled = true; });
          chip.classList.add(good ? 'right' : 'wrong');
          finish(level, els, good
            ? 'Exactly right. '
            : `The flagged field was ${level.badFields.map((f) => FIELD_LABELS[f]).join(' / ')}. `);
        });
      });
      return;
    }

    finish(level, els, 'Right call. ');
  }

  function finish(level, els, prefix) {
    const { judge } = els;
    const fb = judge.querySelector('.judge-feedback');
    fb.className = 'judge-feedback ok';
    const idx = LEVELS.indexOf(level);
    const justUnlocked = idx === completed;
    if (justUnlocked) { completed = idx + 1; saveCompleted(completed); }

    const last = idx === LEVELS.length - 1;
    const nextLabel = last ? 'Back to the level map' : 'Next level →';
    fb.innerHTML = `<p><strong>${prefix}</strong>${escapeHtml(level.teach)}</p>
      <button type="button" class="primary judge-next">${nextLabel}</button>`;
    fb.querySelector('.judge-next').addEventListener('click', () => {
      if (last || completed >= LEVELS.length) {
        panelEl.hidden = true;
        current = -1;
        renderMap();
        mapEl.scrollIntoView({ block: 'start', behavior: SCROLL });
      } else {
        openLevel(Math.min(idx + 1, LEVELS.length - 1));
      }
    });
    renderMap();
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      completed = 0;
      saveCompleted(0);
      current = -1;
      panelEl.hidden = true;
      renderMap();
    });
  }

  renderMap();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
