import { PAGES, CHARACTERS, SHEETS, SECTIONS, STATUS, stageOf } from './data.js';

/* ═══════════════════════════════════════════════════════════
   Every block below runs inside its own guard. A missing node
   costs one panel, never the router — this file is flat module
   code, so one uncaught TypeError would take navigation, the
   reader and the galleries down together.
   ═══════════════════════════════════════════════════════════ */

const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => motionQ.matches;

const $  = id => document.getElementById(id);
const el = document.documentElement;

function boot(name, fn){
  try { fn(); } catch (e) { console.error(`[fp] ${name}:`, e); }
}

const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const pad = i => String(i + 1).padStart(2, '0');

/* ── derived counts ─────────────────────────────────────── */

const castSheets = CHARACTERS.filter(f => SHEETS[f]?.cast);
const castCount  = castSheets.reduce((a, f) => a + (SHEETS[f]?.n || 0), 0);

/* ── starfield ──────────────────────────────────────────── */

let stars = () => {};

boot('starfield', () => {
  const cv = $('starfield');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  stars = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = Math.max(innerHeight, document.body.scrollHeight);
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const count = Math.round((w * h) / 5200);
    for (let i = 0; i < count; i++){
      const x = Math.random() * w, y = Math.random() * h;
      const r = Math.random() < .88 ? Math.random() * .9 + .3 : Math.random() * 1.5 + 1;
      ctx.globalAlpha = r > 1.4 ? .95 : Math.random() * .55 + .25;
      ctx.fillStyle = r > 1.4 && Math.random() < .35 ? '#82D5ED' : '#fff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  stars();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(stars, 220); });
});

/* ── readout ────────────────────────────────────────────── */

boot('readout', () => {
  if ($('ro-pages'))  $('ro-pages').textContent  = PAGES.length;
  if ($('ro-cast'))   $('ro-cast').textContent   = castCount;
  if ($('pg-all'))    $('pg-all').textContent    = PAGES.length;
  if ($('cast-all'))  $('cast-all').textContent  = castCount;
});

/* ── hero ───────────────────────────────────────────────── */

boot('hero', () => {
  const img = $('ch-read-img');
  if (!img || !PAGES.length) return;
  img.src = 'assets/pages/' + PAGES[0];
  img.alt = '';
});

/* ── galleries ──────────────────────────────────────────── */

boot('galleries', () => {
  const fill = (node, files, base) => {
    if (!node) return;
    node.innerHTML = files.map(f => {
      const d = esc(SHEETS[f]?.desc || '');
      return `<figure>
        <img src="${base}${f}" alt="${d}" loading="lazy" decoding="async" width="900" height="1350">
        <figcaption>${d}</figcaption>
      </figure>`;
    }).join('');
  };
  fill($('cast'), castSheets, 'assets/characters/');
  fill($('art'), CHARACTERS.filter(f => !SHEETS[f]?.cast), 'assets/characters/');
});

/* ═══ DASHBOARD ══════════════════════════════════════════
   Nothing here is invented. The order is the file order, the
   stage chip is the pencil colour recorded in art-analysis,
   and the status rows are quoted from README.
   ═══════════════════════════════════════════════════════ */

boot('start-here', () => {
  const node = $('rank');
  if (!node) return;
  node.innerHTML = PAGES.slice(0, 5).map((f, i) => `
    <li>
      <a class="rank__row" href="#/read/${i + 1}">
        <span class="rank__n">${pad(i)}</span>
        <img class="rank__thumb" src="assets/pages/thumb/${f}" alt=""
             loading="lazy" decoding="async" width="38" height="57">
        <span class="rank__label">Draft ${pad(i)}</span>
        <span class="rank__chip">${esc(stageOf(f))}</span>
      </a>
    </li>`).join('');
});

boot('draft-cards', () => {
  const node = $('cardrow');
  if (!node) return;
  node.innerHTML = PAGES.map((f, i) => `
    <a class="card" href="#/read/${i + 1}" aria-label="Draft ${pad(i)} of ${PAGES.length}">
      ${i === 0 ? '<span class="badge">Start</span>' : ''}
      <img src="assets/pages/thumb/${f}" alt="" loading="lazy" decoding="async" width="144" height="216">
      <span class="card__foot">
        <span class="card__n">${pad(i)}</span>
        <span class="card__stage">${esc(stageOf(f))}</span>
      </span>
    </a>`).join('');
});

boot('build-status', () => {
  const node = $('status');
  if (!node) return;
  const MARK = {
    done: '<path d="M2 6.5 5 9.5 10 3"/>',
    wip:  '<path d="M2 6h8"/>',
    none: '<circle cx="6" cy="6" r="3.6"/>',
  };
  const WORD = { done:'Done', wip:'In progress', none:'Not started' };
  node.innerHTML = STATUS.map(s => `
    <li>
      <span class="status__mark status__mark--${s.state}" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MARK[s.state]}</svg>
      </span>
      <span class="status__label">${esc(s.label)}</span>
      <span class="sr-only">${WORD[s.state]}.</span>
      <span class="status__note">${esc(s.note)}</span>
      <span class="status__chip${s.state === 'done' ? ' status__chip--done' : ''}">${esc(s.chip)}</span>
    </li>`).join('');
});

/* quick-access rail arrow */
boot('quick-rail', () => {
  const rail = $('quick-rail'), btn = $('quick-next');
  if (!rail || !btn) return;

  const atEnd = () => rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  const sync  = () => { btn.disabled = rail.scrollWidth <= rail.clientWidth + 4; };

  btn.addEventListener('click', () => {
    const by = rail.clientWidth * .8;
    rail.scrollBy({ left: atEnd() ? -rail.scrollWidth : by,
                    behavior: reduced() ? 'auto' : 'smooth' });
  });
  rail.addEventListener('scroll', sync, { passive:true });
  addEventListener('resize', sync);
  sync();
});

/* ── reader ─────────────────────────────────────────────── */

let showPage = () => {};

boot('reader', () => {
  const pgImg = $('pg-img'), pgNow = $('pg-now');
  const prev  = $('prev'),   next  = $('next'), strip = $('filmstrip');
  if (!pgImg || !prev || !next || !strip) return;

  strip.innerHTML = PAGES.map((f, i) => `
    <button type="button" data-i="${i}" aria-label="Page ${i + 1}">
      <img src="assets/pages/thumb/${f}" alt="" loading="lazy" decoding="async" width="52" height="78">
    </button>`).join('');

  let idx = 0;

  showPage = (i, scroll = true) => {
    idx = Math.max(0, Math.min(PAGES.length - 1, i));
    pgImg.src = 'assets/pages/' + PAGES[idx];
    pgImg.alt = `Page ${idx + 1} of ${PAGES.length} — rough draft. Dialogue is lettered into the artwork and cannot be read as text.`;
    if (pgNow) pgNow.textContent = idx + 1;
    prev.disabled = idx === 0;
    next.disabled = idx === PAGES.length - 1;

    strip.querySelectorAll('button').forEach((b, n) => {
      const on = n === idx;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && scroll) b.scrollIntoView({ inline:'center', block:'nearest',
                                           behavior: reduced() ? 'auto' : 'smooth' });
    });
  };

  const step = d => { showPage(idx + d); syncHash(idx); };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  strip.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (b){ showPage(+b.dataset.i); syncHash(+b.dataset.i); }
  });

  addEventListener('keydown', e => {
    if (current !== 'read') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft'  && !prev.disabled) step(-1);
    if (e.key === 'ArrowRight' && !next.disabled) step(1);
  });

  showPage(0, false);
});

/* keep the URL on the page being read, without re-running the router */
let syncing = false;
function syncHash(i){
  syncing = true;
  history.replaceState(null, '', `#/read/${i + 1}`);
  syncing = false;
}

/* ── drawer (phones) ────────────────────────────────────── */

let closeDrawer = () => {};

boot('drawer', () => {
  const rail = $('rail'), burger = $('burger'), scrim = $('scrim');
  if (!rail || !burger || !scrim) return;

  let lastFocus = null;

  const open = () => {
    lastFocus = document.activeElement;
    el.dataset.drawer = 'open';
    burger.setAttribute('aria-expanded', 'true');
    void rail.offsetWidth;               // flush the visibility flip before focusing
    rail.querySelector('a')?.focus();
  };

  closeDrawer = (restore = false) => {
    if (el.dataset.drawer !== 'open') return;
    delete el.dataset.drawer;
    burger.setAttribute('aria-expanded', 'false');
    if (restore) lastFocus?.focus?.();
  };

  burger.addEventListener('click', () =>
    el.dataset.drawer === 'open' ? closeDrawer(true) : open());
  scrim.addEventListener('click', () => closeDrawer(true));

  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || el.dataset.drawer !== 'open') return;
    closeDrawer(true);
  });

  /* keep focus inside the open drawer */
  addEventListener('focusin', e => {
    if (el.dataset.drawer !== 'open') return;
    if (rail.contains(e.target) || burger === e.target) return;
    rail.querySelector('a')?.focus();
  });
});

/* ═══ ROUTING ════════════════════════════════════════════
   Three modes. Opening a channel from the dashboard zooms the
   tile into the panel it becomes; going back reverses it;
   panel-to-panel from the rail is a short lateral swap,
   because nothing zoomed.
   ═══════════════════════════════════════════════════════ */

const views  = [...document.querySelectorAll('#main > [data-view]')];
const TITLES = Object.fromEntries(SECTIONS.map(s => [s.id, s.title]));
const STEP   = Object.fromEntries(SECTIONS.map((s, i) => [s.id, pad(i)]));
const LABEL  = Object.fromEntries(SECTIONS.map(s => [s.id, s.label]));

let current = 'home';
let first   = true;

function paint(name){
  views.forEach(v => { v.hidden = v.dataset.view !== name; });
  current = name;
  el.dataset.section = name;

  document.querySelectorAll('[data-nav]').forEach(n =>
    n.setAttribute('aria-current', n.dataset.nav === name ? 'page' : 'false'));

  if ($('crumb-step'))  $('crumb-step').textContent  = STEP[name] || '';
  if ($('crumb-title')) $('crumb-title').textContent = LABEL[name] || '';

  document.title = name === 'home' ? TITLES.home : `${TITLES[name]} — Fruit Pop Comic`;

  closeDrawer();
  scrollTo({ top:0, behavior:'auto' });

  if (!first) views.find(v => v.dataset.view === name)?.focus({ preventScroll:true });
  stars();
}

function route(){
  if (syncing) return;

  const parts  = location.hash.replace(/^#\/?/, '').split('/');
  const target = TITLES[parts[0]] ? parts[0] : 'home';
  const arg    = parseInt(parts[1], 10);

  if (target === 'read' && Number.isFinite(arg)) showPage(arg - 1, false);

  if (target === current && !first) return;

  const from = current;
  const tile  = document.querySelector(`[data-ch="${target}"]`);
  const panel = document.querySelector(`[data-view="${target}"] .panel`);
  const back  = document.querySelector(`[data-view="${from}"] .panel`);
  const home  = document.querySelector(`[data-ch="${from}"]`);

  const skip = first || !document.startViewTransition || reduced();
  if (skip){ paint(target); first = false; return; }

  let named = [];
  if (from === 'home' && tile && panel){
    named = [tile, panel];                 // zoom the channel open
  } else if (target === 'home' && back && home){
    named = [back, home];                  // and closed again
  } else {
    el.dataset.vt = 'lateral';             // panel to panel: swap in the frame
  }
  named.forEach(n => { n.style.viewTransitionName = 'panel'; });

  const t = document.startViewTransition(() => paint(target));
  t.finished.finally(() => {
    named.forEach(n => { n.style.viewTransitionName = ''; });
    delete el.dataset.vt;
  });
}

addEventListener('hashchange', route);
route();
