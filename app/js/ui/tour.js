/**
 * A tiny coachmark / guided-tour engine (browser-only, no dependencies).
 *
 * It spotlights one element at a time and shows a popover beside it with
 * Back / Next controls. The dimming "spotlight" is a transparent ring with a
 * huge box-shadow, and both the overlay and the ring have pointer-events: none
 * — so the learner can still click and type into the real control underneath
 * while the tour is open.
 *
 * Steps: { target?: string|null, title, body, placement?: 'auto'|'top'|'bottom' }
 *  - target is a CSS selector resolved against the document; null/missing →
 *    a centered modal step (intro / outro).
 */

const PAD = 6; // breathing room around the spotlighted element

/** Honor reduced-motion: skip animated scrolling for users who ask for it. */
const SCROLL = (typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

export function createTour(steps, { onDone, root = document } = {}) {
  let i = -1;
  let els = null;

  function build() {
    const overlay = document.createElement('div');
    overlay.className = 'tour-overlay';

    const ring = document.createElement('div');
    ring.className = 'tour-ring';

    const pop = document.createElement('div');
    pop.className = 'tour-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'false');
    pop.setAttribute('aria-live', 'polite');
    pop.innerHTML = `
      <p class="tour-progress"></p>
      <h3 class="tour-title" tabindex="-1"></h3>
      <p class="tour-body"></p>
      <div class="tour-actions">
        <button type="button" class="tour-skip">Skip tour</button>
        <span class="tour-spacer"></span>
        <button type="button" class="tour-back">Back</button>
        <button type="button" class="tour-next primary"></button>
      </div>`;

    document.body.append(overlay, ring, pop);
    return { overlay, ring, pop };
  }

  function position() {
    const step = steps[i];
    const { ring, pop } = els;
    const target = step.target ? root.querySelector(step.target) : null;

    if (!target) {
      // Centered modal step.
      ring.style.display = 'none';
      pop.classList.add('tour-centered');
      pop.style.top = '';
      pop.style.left = '';
      return;
    }

    pop.classList.remove('tour-centered');
    target.scrollIntoView({ block: 'center', behavior: SCROLL });

    const r = target.getBoundingClientRect();
    ring.style.display = 'block';
    ring.style.top = `${r.top - PAD}px`;
    ring.style.left = `${r.left - PAD}px`;
    ring.style.width = `${r.width + PAD * 2}px`;
    ring.style.height = `${r.height + PAD * 2}px`;

    // Place the popover below the target if there's room, else above.
    const popH = pop.offsetHeight || 160;
    const below = step.placement === 'top'
      ? false
      : step.placement === 'bottom'
        ? true
        : r.bottom + popH + 16 < window.innerHeight;
    const top = below ? r.bottom + PAD + 10 : r.top - PAD - popH - 10;
    let left = r.left;
    const maxLeft = window.innerWidth - (pop.offsetWidth || 320) - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);
    pop.style.top = `${Math.max(12, top)}px`;
    pop.style.left = `${left}px`;
  }

  function render() {
    const step = steps[i];
    const { pop } = els;
    pop.querySelector('.tour-progress').textContent = `Step ${i + 1} of ${steps.length}`;
    pop.querySelector('.tour-title').textContent = step.title;
    pop.querySelector('.tour-body').textContent = step.body;
    pop.querySelector('.tour-back').disabled = i === 0;
    const next = pop.querySelector('.tour-next');
    next.textContent = i === steps.length - 1 ? 'Done' : 'Next';
    position();
    // Re-measure once layout settles (popover height affects placement).
    requestAnimationFrame(position);
    pop.querySelector('.tour-title').focus();
  }

  function go(n) {
    if (n < 0 || n >= steps.length) return;
    i = n;
    render();
  }

  function stop() {
    if (!els) return;
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    document.removeEventListener('keydown', onKey, true);
    els.overlay.remove();
    els.ring.remove();
    els.pop.remove();
    els = null;
    if (typeof onDone === 'function') onDone();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); i === steps.length - 1 ? stop() : go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  }

  function start() {
    if (els) return;
    els = build();
    els.pop.querySelector('.tour-skip').addEventListener('click', stop);
    els.pop.querySelector('.tour-back').addEventListener('click', () => go(i - 1));
    els.pop.querySelector('.tour-next').addEventListener('click', () => {
      i === steps.length - 1 ? stop() : go(i + 1);
    });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('keydown', onKey, true);
    go(0);
  }

  return { start, stop, go };
}
