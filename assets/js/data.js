import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SCHEMA, SUPABASE_BUCKET, USE_REMOTE }
  from './config.js';

/* ═══════════════════════════════════════════════════════════
   Fruit Pop Comic — content

   Content lives in Supabase and is fetched over PostgREST. No
   SDK: plain fetch keeps the site's no-build-step, no-dependency
   property intact.

   If Supabase is unreachable, unconfigured, or the schema is not
   exposed, the site falls back to BUNDLED below and still works.
   That fallback is the ten drafts and five sheets as shipped —
   a comic site should not go blank because a database is down.

   Nothing here is invented. Page order is file order, the stage
   is the pencil colour recorded in docs/art-analysis.md, and the
   status rows are quoted from README.md.
   ═══════════════════════════════════════════════════════════ */

/* Repo root, resolved from this module's own URL, so `assets/…`
   paths work from /admin/ as well as from the site root. */
const ROOT = new URL('../../', import.meta.url).href;

/* image_path convention, shared with the database:
     https://…   absolute, used as-is
     assets/…    committed to this repository
     anything else → an object in the public storage bucket        */
export function mediaURL(path){
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  if (path.startsWith('assets/')) return ROOT + path;
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

/* ── the REST call ──────────────────────────────────────── */

export const restURL = table => `${SUPABASE_URL}/rest/v1/${table}`;

export function restHeaders(extra = {}){
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Accept-Profile': SUPABASE_SCHEMA,
    ...extra,
  };
}

async function select(table, query = ''){
  const res = await fetch(`${restURL(table)}?${query}`, { headers: restHeaders() });
  if (!res.ok){
    const body = await res.text().catch(() => '');
    /* PGRST106 is the one worth naming: the schema exists but PostgREST
       has not been told to serve it. Everything looks broken until the
       Exposed schemas setting is changed, so say so out loud. */
    if (body.includes('PGRST106')){
      throw new Error(
        `Supabase is reachable but the "${SUPABASE_SCHEMA}" schema is not exposed. ` +
        `Add it under Settings → API → Exposed schemas. (${table})`);
    }
    throw new Error(`${res.status} on ${table}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/* ── bundled fallback ───────────────────────────────────── */

const PAGE_FILES = [
  ['penup_20250622_210654.jpg', 'magenta'],
  ['penup_20250624_145454.jpg', 'sanguine'],
  ['penup_20250624_155904.jpg', 'sanguine'],
  ['penup_20250626_174754.jpg', 'blue'],
  ['penup_20250626_185451.jpg', 'blue'],
  ['penup_20250626_192949.jpg', 'blue'],
  ['penup_20250626_204003.jpg', 'blue'],
  ['penup_20250630_140938.jpg', 'blue'],
  ['penup_20250630_145111.jpg', 'blue'],
  ['penup_20250701_201734.jpg', 'blue'],
];

export const BUNDLED = {
  pages: PAGE_FILES.map(([f, stage], i) => ({
    id: 'bundled-page-' + i, position: i + 1, stage, is_draft: true,
    image_path: 'assets/pages/' + f,
    thumb_path: 'assets/pages/thumb/' + f,
    alt: null,
  })),
  sheets: [
    { id:'b1', position:1, kind:'cast', figures:2, image_path:'assets/characters/penup_20250418_074701.jpg',    description:'Two characters — gold hoodie and green headband; green turtleneck and glasses' },
    { id:'b2', position:2, kind:'cast', figures:1, image_path:'assets/characters/penup_20250527_133813.jpg',    description:'Cropped denim jacket, bantu knots, teal sneakers' },
    { id:'b3', position:3, kind:'cast', figures:1, image_path:'assets/characters/penup_20250527_143006-1-1.jpg', description:'Pointed ears, rust beret, marigold sweater' },
    { id:'b4', position:4, kind:'cast', figures:1, image_path:'assets/characters/penup_20250527_150240.jpg',    description:'Long blonde hair, school uniform, closed umbrella' },
    { id:'b5', position:1, kind:'art',  figures:0, image_path:'assets/characters/penup_20251219_145410.jpg',    description:'Sketch page — poses and expression studies' },
  ],
  wiki: [],
  status: [
    { id:'s1', position:1, label:'Character art', state:'done', note:'Finished',     chip:'5 sheets' },
    { id:'s2', position:2, label:'Comic pages',   state:'wip',  note:'Rough drafts', chip:'10' },
    { id:'s3', position:3, label:'Reading order', state:'wip',  note:'Provisional',  chip:'unset' },
    { id:'s4', position:4, label:'Wiki',          state:'none', note:'Not started',  chip:'empty' },
    { id:'s5', position:5, label:'Logo',          state:'wip',  note:'Raster only',  chip:'SVG wanted' },
  ],
  text: {
    'hero.kicker': 'Page one',
    'hero.title' : 'Start at the beginning',
    'hero.sub'   : 'Ten rough pages, in the order they were drawn. Arrows, filmstrip, or the keyboard.',
    'hero.cta'   : 'Read now →',
    'read.notice': '<strong>These are rough drafts.</strong> Working pencils, not finished pages — no final linework, colour or lettering. Order is provisional.',
    'cast.notice': '<strong>Names not recorded yet.</strong> Only one is known from the drafts — Ronnie. The rest are described, not named, until the creator says otherwise.',
    'wiki.empty.title': 'Nothing written yet',
    'wiki.empty.body' : 'The wiki is real and it is empty. Characters, places, and lore go here once the creator writes them — an empty shelf is honest, an invented one isn’t.',
    'promo.title': 'Draft build',
    'promo.body' : 'The pages here are working roughs — pencils, not finished art. The wiki is genuinely empty.',
    'foot.copyright': 'Art and characters © the creator of Fruit Pop Comic.',
    'foot.build'    : 'Draft build · pages are working roughs',
  },
};

/* ── load ───────────────────────────────────────────────── */

export const CONTENT = {
  pages: [], sheets: [], wiki: [], status: [], text: {},
  source: 'bundled', error: null,
};

function adopt(src){
  CONTENT.pages  = src.pages;
  CONTENT.sheets = src.sheets;
  CONTENT.wiki   = src.wiki;
  CONTENT.status = src.status;
  CONTENT.text   = src.text;
  return CONTENT;
}

export async function load(){
  if (!USE_REMOTE || !SUPABASE_URL){
    return adopt(BUNDLED);
  }
  try {
    const [pages, sheets, wiki, status, text] = await Promise.all([
      select('pages',        'select=*&published=eq.true&order=position.asc,created_at.asc'),
      select('sheets',       'select=*&published=eq.true&order=position.asc,created_at.asc'),
      select('wiki_entries', 'select=*&published=eq.true&order=position.asc,title.asc'),
      select('build_status', 'select=*&order=position.asc'),
      select('site_text',    'select=key,value'),
    ]);

    /* An empty pages table means the database is configured but not
       populated. Keep the bundled drafts rather than showing an empty
       comic — the fallback is content, not a placeholder. */
    if (!pages.length){
      adopt({ ...BUNDLED, wiki, status: status.length ? status : BUNDLED.status });
      CONTENT.source = 'mixed';
      return CONTENT;
    }

    adopt({
      pages, sheets, wiki,
      status: status.length ? status : BUNDLED.status,
      text: { ...BUNDLED.text, ...Object.fromEntries(text.map(r => [r.key, r.value])) },
    });
    CONTENT.source = 'supabase';
    return CONTENT;
  } catch (e){
    console.warn('[fp] falling back to bundled content —', e.message);
    adopt(BUNDLED);
    CONTENT.source = 'bundled';
    CONTENT.error  = e.message;
    return CONTENT;
  }
}

/* ── shared helpers ─────────────────────────────────────── */

export const txt = (key, fallback = '') =>
  CONTENT.text[key] ?? BUNDLED.text[key] ?? fallback;

export const castSheets = () => CONTENT.sheets.filter(s => s.kind === 'cast');
export const artSheets  = () => CONTENT.sheets.filter(s => s.kind === 'art');
export const castCount  = () => castSheets().reduce((a, s) => a + (s.figures || 0), 0);

/* ── sections ───────────────────────────────────────────────
   Single source for the router's titles and the numbered strip.
   The rail, the tab bar and the quick-access tiles are written
   into index.html so navigation survives a JS failure.
   ─────────────────────────────────────────────────────────── */
export const SECTIONS = [
  { id:'home',  label:'Home',  title:'Fruit Pop Comic' },
  { id:'read',  label:'Read',  title:'Read'  },
  { id:'cast',  label:'Cast',  title:'Cast'  },
  { id:'wiki',  label:'Wiki',  title:'Wiki'  },
  { id:'art',   label:'Art',   title:'Art'   },
  { id:'about', label:'About', title:'About' },
];
