import { PAGES, CHARACTERS } from './data.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────────────
   Descriptions, not names. Only one name exists in the
   drafts (Ronnie) and it is not tied to a specific design,
   so nothing here claims an identity.
   ───────────────────────────────────────────────────────── */
const SHEETS = {
  'penup_20250418_074701.jpg':   { cast:true,  n:2, desc:'Two characters — gold hoodie and green headband; green turtleneck and glasses' },
  'penup_20250527_133813.jpg':   { cast:true,  n:1, desc:'Cropped denim jacket, bantu knots, teal sneakers' },
  'penup_20250527_143006-1-1.jpg':{ cast:true, n:1, desc:'Pointed ears, rust beret, marigold sweater' },
  'penup_20250527_150240.jpg':   { cast:true,  n:1, desc:'Long blonde hair, school uniform, closed umbrella' },
  'penup_20251219_145410.jpg':   { cast:false, n:0, desc:'Sketch page — poses and expression studies' },
};

/* ── starfield ──────────────────────────────────────────── */

const cv = document.getElementById('starfield');
const ctx = cv.getContext('2d');

function stars(){
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
}
stars();

let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(stars, 220); });

/* ── readout ────────────────────────────────────────────── */

const castSheets = CHARACTERS.filter(f => SHEETS[f]?.cast);
const castCount  = castSheets.reduce((a, f) => a + (SHEETS[f]?.n || 0), 0);

document.getElementById('ro-pages').textContent = PAGES.length;
document.getElementById('ro-cast').textContent  = castCount;
document.getElementById('pg-all').textContent   = PAGES.length;
document.getElementById('cast-all').textContent = castCount;

/* ── channel previews ───────────────────────────────────── */

const readImg = document.getElementById('ch-read-img');
readImg.src = 'assets/pages/' + PAGES[0];
readImg.alt = '';

const castImg = document.getElementById('ch-cast-img');
castImg.src = 'assets/characters/' + castSheets[1];
castImg.alt = '';

/* ── galleries ──────────────────────────────────────────── */

function fill(node, files, base){
  node.innerHTML = files.map(f => `
    <figure>
      <img src="${base}${f}" alt="${SHEETS[f]?.desc || ''}" loading="lazy" decoding="async" width="900" height="1350">
      <figcaption>${SHEETS[f]?.desc || ''}</figcaption>
    </figure>`).join('');
}
fill(document.getElementById('cast'), castSheets, 'assets/characters/');
fill(document.getElementById('art'),
     CHARACTERS.filter(f => !SHEETS[f]?.cast), 'assets/characters/');

/* ── reader ─────────────────────────────────────────────── */

const pgImg  = document.getElementById('pg-img');
const pgNow  = document.getElementById('pg-now');
const prev   = document.getElementById('prev');
const next   = document.getElementById('next');
const strip  = document.getElementById('filmstrip');

strip.innerHTML = PAGES.map((f, i) => `
  <button type="button" data-i="${i}" aria-label="Page ${i + 1}">
    <img src="assets/pages/thumb/${f}" alt="" loading="lazy" decoding="async" width="52" height="78">
  </button>`).join('');

let idx = 0;

function showPage(i, scroll = true){
  idx = Math.max(0, Math.min(PAGES.length - 1, i));
  pgImg.src = 'assets/pages/' + PAGES[idx];
  pgImg.alt = `Page ${idx + 1} of ${PAGES.length} — rough draft. Dialogue is lettered into the artwork and cannot be read as text.`;
  pgNow.textContent = idx + 1;
  prev.disabled = idx === 0;
  next.disabled = idx === PAGES.length - 1;

  strip.querySelectorAll('button').forEach((b, n) => {
    const on = n === idx;
    b.setAttribute('aria-current', on ? 'true' : 'false');
    if (on && scroll) b.scrollIntoView({ inline:'center', block:'nearest',
                                         behavior: reduced ? 'auto' : 'smooth' });
  });
}

prev.addEventListener('click', () => showPage(idx - 1));
next.addEventListener('click', () => showPage(idx + 1));
strip.addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (b) showPage(+b.dataset.i);
});

addEventListener('keydown', e => {
  if (current !== 'read') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowLeft')  { prev.disabled || showPage(idx - 1); }
  if (e.key === 'ArrowRight') { next.disabled || showPage(idx + 1); }
});

showPage(0, false);

/* ── routing, with the channel-zoom as the one moment ───── */

const views = [...document.querySelectorAll('[data-view]')];
const TITLES = { home:'Fruit Pop Comic', read:'Read', cast:'Cast',
                 wiki:'Wiki', art:'Art', about:'About' };
let current = 'home';

function paint(name){
  views.forEach(v => { v.hidden = v.dataset.view !== name; });
  current = name;
  document.title = name === 'home' ? TITLES.home : `${TITLES[name]} — Fruit Pop Comic`;
  scrollTo({ top:0, behavior:'auto' });
  stars();
}

function route(){
  const name = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  const target = TITLES[name] ? name : 'home';
  if (target === current) return;

  const tile  = document.querySelector(`.ch[data-ch="${target}"]`);
  const panel = document.querySelector(`[data-view="${target}"] .panel`);

  if (!document.startViewTransition || reduced || !tile || !panel){
    paint(target);
    return;
  }
  // morph the tile into the panel it opens — the form's native motion
  tile.style.viewTransitionName = 'panel';
  panel.style.viewTransitionName = 'panel';
  const t = document.startViewTransition(() => paint(target));
  t.finished.finally(() => {
    tile.style.viewTransitionName = '';
    panel.style.viewTransitionName = '';
  });
}

addEventListener('hashchange', route);
route();
