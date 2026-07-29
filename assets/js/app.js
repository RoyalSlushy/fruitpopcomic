import {
  load, CONTENT, SECTIONS, mediaURL, txt,
  castSheets, artSheets, castCount,
} from './data.js';

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

const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const pad = i => String(i + 1).padStart(2, '0');

/* Content is fetched before anything renders. If Supabase is
   unreachable this resolves to the bundled drafts instead — it
   does not reject, so the site always has something to show. */
await load();

const PAGES = CONTENT.pages;

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

/* ── editable copy ──────────────────────────────────────── */

boot('copy', () => {
  const set  = (id, key) => { const n = $(id); if (n) n.textContent = txt(key); };
  const html = (id, key) => { const n = $(id); if (n) n.innerHTML   = txt(key); };

  set('hero-kicker', 'hero.kicker');
  set('hero-title',  'hero.title');
  set('hero-sub',    'hero.sub');
  set('hero-cta',    'hero.cta');
  html('read-notice', 'read.notice');
  html('cast-notice', 'cast.notice');
  set('promo-title', 'promo.title');
  set('promo-body',  'promo.body');
  set('foot-copy',   'foot.copyright');
  set('foot-build',  'foot.build');
  const about = $('about-body');
  if (about && txt('about.body')) about.innerHTML = txt('about.body');
});

/* ── readout ────────────────────────────────────────────── */

boot('readout', () => {
  const n = castCount();
  if ($('ro-pages'))  $('ro-pages').textContent  = PAGES.length;
  if ($('ro-cast'))   $('ro-cast').textContent   = n;
  if ($('pg-all'))    $('pg-all').textContent    = PAGES.length;
  if ($('cast-all'))  $('cast-all').textContent  = n;
});

/* ── hero ───────────────────────────────────────────────── */

boot('hero', () => {
  const img = $('ch-read-img');
  if (!img || !PAGES.length) return;
  img.src = mediaURL(PAGES[0].image_path);
  img.alt = '';
});

/* ── galleries ──────────────────────────────────────────── */

boot('galleries', () => {
  const fill = (node, rows) => {
    if (!node) return;
    node.innerHTML = rows.map(s => {
      const d = esc(s.description);
      const name = s.display_name ? `<strong>${esc(s.display_name)}</strong> — ` : '';
      return `<figure>
        <img src="${esc(mediaURL(s.image_path))}" alt="${d}" loading="lazy" decoding="async" width="900" height="1350">
        <figcaption>${name}${d}</figcaption>
      </figure>`;
    }).join('');
  };
  fill($('cast'), castSheets());
  fill($('art'),  artSheets());
});

/* ═══ DASHBOARD ══════════════════════════════════════════
   Nothing here is invented. The order is the stored order, the
   stage chip is the pencil colour recorded in art-analysis, and
   the status rows are the build's real state.
   ═══════════════════════════════════════════════════════ */

const thumbOf = p => mediaURL(p.thumb_path || p.image_path);

boot('start-here', () => {
  const node = $('rank');
  if (!node) return;
  node.innerHTML = PAGES.slice(0, 5).map((p, i) => `
    <li>
      <a class="rank__row" href="#/read/${i + 1}">
        <span class="rank__n">${pad(i)}</span>
        <img class="rank__thumb" src="${esc(thumbOf(p))}" alt=""
             loading="lazy" decoding="async" width="38" height="57">
        <span class="rank__label">${p.is_draft ? 'Draft' : 'Page'} ${pad(i)}</span>
        <span class="rank__chip">${esc(p.stage)}</span>
      </a>
    </li>`).join('');
});

boot('draft-cards', () => {
  const node = $('cardrow');
  if (!node) return;
  node.innerHTML = PAGES.map((p, i) => `
    <a class="card" href="#/read/${i + 1}" aria-label="${p.is_draft ? 'Draft' : 'Page'} ${pad(i)} of ${PAGES.length}">
      ${i === 0 ? '<span class="badge">Start</span>' : ''}
      <img src="${esc(thumbOf(p))}" alt="" loading="lazy" decoding="async" width="144" height="216">
      <span class="card__foot">
        <span class="card__n">${pad(i)}</span>
        <span class="card__stage">${esc(p.stage)}</span>
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
  node.innerHTML = CONTENT.status.map(s => `
    <li>
      <span class="status__mark status__mark--${esc(s.state)}" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MARK[s.state] || MARK.none}</svg>
      </span>
      <span class="status__label">${esc(s.label)}</span>
      <span class="sr-only">${WORD[s.state] || ''}.</span>
      <span class="status__note">${esc(s.note)}</span>
      ${s.chip ? `<span class="status__chip${s.state === 'done' ? ' status__chip--done' : ''}">${esc(s.chip)}</span>` : ''}
    </li>`).join('');
});

/* quick-access rail arrow */
boot('quick-rail', () => {
  const rail = $('quick-rail'), btn = $('quick-next');
  if (!rail || !btn) return;

  const atEnd = () => rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  const sync  = () => { btn.disabled = rail.scrollWidth <= rail.clientWidth + 4; };

  btn.addEventListener('click', () => {
    rail.scrollBy({ left: atEnd() ? -rail.scrollWidth : rail.clientWidth * .8,
                    behavior: reduced() ? 'auto' : 'smooth' });
  });
  rail.addEventListener('scroll', sync, { passive:true });
  addEventListener('resize', sync);
  sync();
});

/* ═══ WIKI ═══════════════════════════════════════════════
   Empty until the creator writes something. The empty state is
   shown only when there are genuinely no published entries —
   it reports the shelf, it does not stand in for one.
   ═══════════════════════════════════════════════════════ */

const CATEGORIES = [
  ['character', 'Characters'],
  ['place',     'Places'],
  ['term',      'Terms'],
  ['lore',      'Lore'],
];

/* Bodies are authored by an allowlisted editor, so HTML is allowed.
   Plain text is auto-paragraphed for convenience. */
function bodyHTML(body){
  const s = String(body || '').trim();
  if (!s) return '';
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return s.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

let showWiki = () => {};

boot('wiki', () => {
  const index = $('wiki-index'), entry = $('wiki-entry'), empty = $('wiki-empty');
  if (!index || !entry || !empty) return;

  const entries = CONTENT.wiki;

  index.innerHTML = CATEGORIES.map(([key, label]) => {
    const rows = entries.filter(e => e.category === key);
    if (!rows.length) return '';
    return `
      <section class="wiki__group">
        <h3 class="wiki__cat">${esc(label)}</h3>
        <ul class="wiki__list">
          ${rows.map(e => `
            <li>
              <a class="wiki__card" href="#/wiki/${encodeURIComponent(e.slug)}">
                ${e.image_path
                  ? `<img src="${esc(mediaURL(e.image_path))}" alt="" loading="lazy" decoding="async" width="120" height="120">`
                  : '<span class="wiki__card-mark" aria-hidden="true"></span>'}
                <span class="wiki__card-body">
                  <span class="wiki__card-title">${esc(e.title)}</span>
                  ${e.summary ? `<span class="wiki__card-sum">${esc(e.summary)}</span>` : ''}
                </span>
              </a>
            </li>`).join('')}
        </ul>
      </section>`;
  }).join('');

  showWiki = slug => {
    const found = slug ? entries.find(e => e.slug === slug) : null;

    empty.hidden = entries.length > 0;
    index.hidden = !entries.length || !!found;
    entry.hidden = !found;

    if (!found) return;
    entry.innerHTML = `
      <p class="wiki__back"><a class="btn" href="#/wiki">← All entries</a></p>
      <article class="wiki__article">
        ${found.image_path
          ? `<img class="wiki__hero" src="${esc(mediaURL(found.image_path))}" alt=""
                  loading="lazy" decoding="async">`
          : ''}
        <p class="wiki__tag">${esc((CATEGORIES.find(c => c[0] === found.category) || [,'Lore'])[1])}</p>
        <h2>${esc(found.title)}</h2>
        ${found.summary ? `<p class="wiki__sum">${esc(found.summary)}</p>` : ''}
        <div class="prose">${bodyHTML(found.body)}</div>
      </article>`;
  };

  /* the empty state's own copy is editable too */
  const t = $('wiki-empty-title'), b = $('wiki-empty-body');
  if (t) t.textContent = txt('wiki.empty.title');
  if (b) b.textContent = txt('wiki.empty.body');

  showWiki(null);
});

/* ── reader ─────────────────────────────────────────────── */

let showPage = () => {};

boot('reader', () => {
  const pgImg = $('pg-img'), pgNow = $('pg-now');
  const prev  = $('prev'),   next  = $('next'), strip = $('filmstrip');
  if (!pgImg || !prev || !next || !strip || !PAGES.length) return;

  strip.innerHTML = PAGES.map((p, i) => `
    <button type="button" data-i="${i}" aria-label="Page ${i + 1}">
      <img src="${esc(thumbOf(p))}" alt="" loading="lazy" decoding="async" width="52" height="78">
    </button>`).join('');

  let idx = 0;

  showPage = (i, scroll = true) => {
    idx = Math.max(0, Math.min(PAGES.length - 1, i));
    const p = PAGES[idx];
    pgImg.src = mediaURL(p.image_path);
    pgImg.alt = p.alt || `Page ${idx + 1} of ${PAGES.length}${p.is_draft ? ' — rough draft' : ''}. ` +
                        `Dialogue is lettered into the artwork and cannot be read as text.`;
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

  const step = d => { showPage(idx + d); history.replaceState(null, '', `#/read/${idx + 1}`); };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  strip.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (b){ showPage(+b.dataset.i); history.replaceState(null, '', `#/read/${+b.dataset.i + 1}`); }
  });

  addEventListener('keydown', e => {
    if (current !== 'read') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft'  && !prev.disabled) step(-1);
    if (e.key === 'ArrowRight' && !next.disabled) step(1);
  });

  showPage(0, false);
});

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
  const parts  = location.hash.replace(/^#\/?/, '').split('/');
  const target = TITLES[parts[0]] ? parts[0] : 'home';
  const arg    = parts[1] ? decodeURIComponent(parts[1]) : null;

  if (target === 'read' && arg && Number.isFinite(+arg)) showPage(+arg - 1, false);
  if (target === 'wiki') showWiki(arg);

  if (target === current && !first) return;

  const from  = current;
  const tile  = document.querySelector(`[data-ch="${target}"]`);
  const panel = document.querySelector(`#main > [data-view="${target}"] .panel`);
  const back  = document.querySelector(`#main > [data-view="${from}"] .panel`);
  const home  = document.querySelector(`[data-ch="${from}"]`);

  if (first || !document.startViewTransition || reduced()){
    paint(target); first = false; return;
  }

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
