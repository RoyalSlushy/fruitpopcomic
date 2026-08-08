/* The comic. Order in this array IS the reading order, and it is
   provisional — the drafts carry timestamp filenames and no page numbers.

   `stage` is the pencil colour the rough was drawn in, the one per-page fact
   the drafts actually establish (docs/art-analysis.md §3). Set it to 'final'
   and isDraft to false once a page stops being a rough.

   Images: a path starting with "/" is served from public/. Anything else is
   an object key in the Supabase storage bucket — that is what the CMS writes
   when you upload. */

export type PageStage = 'magenta' | 'sanguine' | 'blue' | 'inked' | 'final';

/* Chapters are the reading unit. There is exactly one here and its title says
   what the pages actually are, because the drafts carry timestamp filenames,
   no numbers and no grouping — the real chapter breaks are not known yet and
   inventing them would be inventing the story's shape. Add chapters in the
   CMS as they become real, and set each page's `chapter` to one of these ids.
   A page whose chapter matches nothing is not lost: the select screen groups
   it under "Unsorted" so it is always reachable. */
export type Chapter = {
  id: string;
  title: string;
  /** one line under the title on the select screen */
  blurb: string;
};

/* A recording of one script beat, in the creator's own voice.

   `key` is the beat's content key from lib/script.ts, so a clip stays attached
   to its line when lines move around it rather than to a line number.

   `said` is the exact speech text it was recorded against. It is the only
   reason an edit is recoverable: change a line's words and its key changes,
   which would otherwise leave a nameless row pointing at a beat that no longer
   exists. With `said` the editor can show what the orphan says and offer to
   re-attach it, instead of silently losing a take.

   `src` follows the same convention as `image`: a "/" path is served from
   public/, anything else is a Supabase storage object key. See lib/media.ts. */
export type PageClip = { key: string; src: string; said: string };

export type ComicPage = {
  id: string;
  /** Blank for a SCRIPT PAGE — a page that exists in the running order and
      carries writing but no drawing yet. The reader renders it as a page
      rather than as a hole, so the shape of a chapter can be laid out before
      it is drawn. */
  image: string;
  thumb: string;
  stage: PageStage;
  isDraft: boolean;
  /** Lettering is drawn into the artwork, so this describes the page rather
      than transcribing it. Blank falls back to a generated description. */
  alt: string;
  /** which chapter this page belongs to — an id from `chapters` */
  chapter: string;
  /** The page's script, one beat per line — `NAME: line` for dialogue,
      `(parentheses)` or an ALL-CAPS line for a direction, anything else for
      prose. Ships EMPTY on every page and must stay that way until the creator
      writes one: the lettering is drawn into the artwork and cannot be read
      out of it, so an invented transcript would be invented dialogue. The
      reader says plainly when a page has none. */
  script: string;
  /** Recordings for individual beats of `script`, uploaded through the CMS.
      Empty on every page, and partial forever after that: a line with no clip
      falls back to the browser's synthesiser, so one recording is worth making
      without waiting for the other thirty. */
  audio: PageClip[];
};

export type PagesContent = { chapters: Chapter[]; items: ComicPage[] };

export const pages: PagesContent = {
  chapters: [
    { id: 'ch1',
      title: 'The drafts',
      blurb: 'Ten rough pages, in the order they were drawn.' },
  ],
  items: [
  { id: 'p01', image: '/pages/penup_20250622_210654.jpg',
    thumb: '/pages/thumb/penup_20250622_210654.jpg',
    stage: 'magenta', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p02', image: '/pages/penup_20250624_145454.jpg',
    thumb: '/pages/thumb/penup_20250624_145454.jpg',
    stage: 'sanguine', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p03', image: '/pages/penup_20250624_155904.jpg',
    thumb: '/pages/thumb/penup_20250624_155904.jpg',
    stage: 'sanguine', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p04', image: '/pages/penup_20250626_174754.jpg',
    thumb: '/pages/thumb/penup_20250626_174754.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p05', image: '/pages/penup_20250626_185451.jpg',
    thumb: '/pages/thumb/penup_20250626_185451.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p06', image: '/pages/penup_20250626_192949.jpg',
    thumb: '/pages/thumb/penup_20250626_192949.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p07', image: '/pages/penup_20250626_204003.jpg',
    thumb: '/pages/thumb/penup_20250626_204003.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p08', image: '/pages/penup_20250630_140938.jpg',
    thumb: '/pages/thumb/penup_20250630_140938.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p09', image: '/pages/penup_20250630_145111.jpg',
    thumb: '/pages/thumb/penup_20250630_145111.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  { id: 'p10', image: '/pages/penup_20250701_201734.jpg',
    thumb: '/pages/thumb/penup_20250701_201734.jpg',
    stage: 'blue', isDraft: true, alt: '', chapter: 'ch1', script: '', audio: [] },
  ],
};
