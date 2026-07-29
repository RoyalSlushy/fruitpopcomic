/* ═══════════════════════════════════════════════════════════
   Fruit Pop Comic — data

   Everything the interface renders comes from this file. Nothing
   here is invented: page order is the file order, character
   descriptions describe what is drawn, and the build status is
   quoted from README.md. No counts, dates, titles or names are
   claimed beyond what the material actually supplies.
   ═══════════════════════════════════════════════════════════ */

/* Generated from assets/. Order is provisional: the drafts carry timestamp
   filenames, no page numbers. Replace with real sequence when known.
   The array IS the reading order — keep it a flat list of filenames. */
export const PAGES = [
  "penup_20250622_210654.jpg",
  "penup_20250624_145454.jpg",
  "penup_20250624_155904.jpg",
  "penup_20250626_174754.jpg",
  "penup_20250626_185451.jpg",
  "penup_20250626_192949.jpg",
  "penup_20250626_204003.jpg",
  "penup_20250630_140938.jpg",
  "penup_20250630_145111.jpg",
  "penup_20250701_201734.jpg"
];

export const CHARACTERS = [
  "penup_20250418_074701.jpg",
  "penup_20250527_133813.jpg",
  "penup_20250527_143006-1-1.jpg",
  "penup_20250527_150240.jpg",
  "penup_20251219_145410.jpg"
];

/* ── character sheets ───────────────────────────────────────
   Descriptions, not names. Only one name exists in the drafts
   (Ronnie) and it is not tied to a specific design, so nothing
   here claims an identity.
   `cast` splits the Cast view from the Art view; `n` is how many
   figures are on the sheet and is summed into the Cast readout.
   ─────────────────────────────────────────────────────────── */
export const SHEETS = {
  'penup_20250418_074701.jpg':    { cast:true,  n:2, desc:'Two characters — gold hoodie and green headband; green turtleneck and glasses' },
  'penup_20250527_133813.jpg':    { cast:true,  n:1, desc:'Cropped denim jacket, bantu knots, teal sneakers' },
  'penup_20250527_143006-1-1.jpg':{ cast:true,  n:1, desc:'Pointed ears, rust beret, marigold sweater' },
  'penup_20250527_150240.jpg':    { cast:true,  n:1, desc:'Long blonde hair, school uniform, closed umbrella' },
  'penup_20251219_145410.jpg':    { cast:false, n:0, desc:'Sketch page — poses and expression studies' },
};

/* ── pencil stage ───────────────────────────────────────────
   The roughs drift in ink colour and then settle, which is the
   only per-page fact the drafts actually establish. Recorded in
   docs/art-analysis.md §3: magenta (Jun 22), sanguine (Jun 24),
   blue from Jun 26 onward. Anything unlisted falls back to the
   settled stage, so adding a page never breaks the dashboard.
   ─────────────────────────────────────────────────────────── */
const STAGES = {
  'penup_20250622_210654.jpg': 'magenta',
  'penup_20250624_145454.jpg': 'sanguine',
  'penup_20250624_155904.jpg': 'sanguine',
};
export const stageOf = file => STAGES[file] || 'blue';

/* ── sections ───────────────────────────────────────────────
   Single source for the router's titles and the numbered strip
   at the top of every view. The rail, the tab bar and the
   quick-access tiles are hand-written in index.html so that
   navigation survives a JS failure — this list orders them.
   ─────────────────────────────────────────────────────────── */
export const SECTIONS = [
  { id:'home',  label:'Home',  title:'Fruit Pop Comic' },
  { id:'read',  label:'Read',  title:'Read'  },
  { id:'cast',  label:'Cast',  title:'Cast'  },
  { id:'wiki',  label:'Wiki',  title:'Wiki'  },
  { id:'art',   label:'Art',   title:'Art'   },
  { id:'about', label:'About', title:'About' },
];

/* ── build status ───────────────────────────────────────────
   Quoted from README.md "What's real, and what's pending" and
   DESIGN.md "Known gaps". This is the honest replacement for a
   gamified mission panel: real state, nothing to collect.
   state: 'done' | 'wip' | 'none'
   ─────────────────────────────────────────────────────────── */
export const STATUS = [
  { label:'Character art',  state:'done', note:'Finished',      chip:'5 sheets' },
  { label:'Comic pages',    state:'wip',  note:'Rough drafts',  chip:'10'       },
  { label:'Reading order',  state:'wip',  note:'Provisional',   chip:'unset'    },
  { label:'Wiki',           state:'none', note:'Not started',   chip:'empty'    },
  { label:'Logo',           state:'wip',  note:'Raster only',   chip:'SVG wanted' },
];
