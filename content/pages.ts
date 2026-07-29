/* The comic. Order in this array IS the reading order, and it is
   provisional — the drafts carry timestamp filenames and no page numbers.

   `stage` is the pencil colour the rough was drawn in, the one per-page fact
   the drafts actually establish (docs/art-analysis.md §3). Set it to 'final'
   and isDraft to false once a page stops being a rough.

   Images: a path starting with "/" is served from public/. Anything else is
   an object key in the Supabase storage bucket — that is what the CMS writes
   when you upload. */

export type PageStage = 'magenta' | 'sanguine' | 'blue' | 'inked' | 'final';

export type ComicPage = {
  id: string;
  image: string;
  thumb: string;
  stage: PageStage;
  isDraft: boolean;
  /** Lettering is drawn into the artwork, so this describes the page rather
      than transcribing it. Blank falls back to a generated description. */
  alt: string;
};

export type PagesContent = { items: ComicPage[] };

export const pages: PagesContent = {
  items: [
  { id: 'p01', image: '/pages/penup_20250622_210654.jpg',
    thumb: '/pages/thumb/penup_20250622_210654.jpg',
    stage: 'magenta', isDraft: true, alt: '' },
  { id: 'p02', image: '/pages/penup_20250624_145454.jpg',
    thumb: '/pages/thumb/penup_20250624_145454.jpg',
    stage: 'sanguine', isDraft: true, alt: '' },
  { id: 'p03', image: '/pages/penup_20250624_155904.jpg',
    thumb: '/pages/thumb/penup_20250624_155904.jpg',
    stage: 'sanguine', isDraft: true, alt: '' },
  { id: 'p04', image: '/pages/penup_20250626_174754.jpg',
    thumb: '/pages/thumb/penup_20250626_174754.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p05', image: '/pages/penup_20250626_185451.jpg',
    thumb: '/pages/thumb/penup_20250626_185451.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p06', image: '/pages/penup_20250626_192949.jpg',
    thumb: '/pages/thumb/penup_20250626_192949.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p07', image: '/pages/penup_20250626_204003.jpg',
    thumb: '/pages/thumb/penup_20250626_204003.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p08', image: '/pages/penup_20250630_140938.jpg',
    thumb: '/pages/thumb/penup_20250630_140938.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p09', image: '/pages/penup_20250630_145111.jpg',
    thumb: '/pages/thumb/penup_20250630_145111.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  { id: 'p10', image: '/pages/penup_20250701_201734.jpg',
    thumb: '/pages/thumb/penup_20250701_201734.jpg',
    stage: 'blue', isDraft: true, alt: '' },
  ],
};
