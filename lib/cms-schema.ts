/* Schema metadata, keyed by NORMALIZED path (indices replaced with "*").
 *
 * Two jobs:
 *   TEMPLATES — the blank object used for a newly added list item, and the
 *               shape that extra stored items merge over (see lib/cms.ts).
 *   LABELS    — human names for the hover chips shown in edit mode.
 *
 * Templates matter beyond the "+ Add" button: if the database holds more list
 * items than the code defaults do, those extra items have no corresponding
 * default to merge over. Merging them over defaults[0] would leak the first
 * item's real content into blanks, so they merge over the template instead.
 */

import type { Path } from './path.ts';
import { normalizePath } from './path.ts';

export const TEMPLATES: Record<string, unknown> = {
  'site.nav.*': { id: '', label: 'New', sub: '', href: '/', tab: false },

  'home.quick.*': { id: '', label: 'New', sub: '', href: '/', glyph: 'info', hue: 'indigo' },

  /* image blank on purpose: a page added here is a SCRIPT PAGE until a
     drawing is uploaded onto it. */
  'pages.items.*': {
    id: '', image: '', thumb: '', stage: 'blue', isDraft: true, alt: '',
    chapter: '', script: '', snippets: [], audio: [],
  },

  /* Same load-bearing role as the audio template below: page defaults carry
     `snippets: []`, so EVERY stored snippet is past the end of the defaults
     and merges over this rather than over a positional default. Without it
     `mergeArray` warns and passes the row through unmerged, and new code
     fields never appear on snippets that already exist. */
  'pages.items.*.snippets.*': { id: '', title: '', body: '' },

  /* Without this, a stored clip has no template to merge over: `mergeArray`
     falls through to its warn-and-pass-unmerged branch, so the row keeps
     whatever shape the database happened to hold. The page defaults all carry
     `audio: []`, so EVERY clip is past the end of the defaults and takes that
     path — this template is the only shape enforcement clips ever get. */
  'pages.items.*.audio.*': { key: '', src: '', said: '' },

  'pages.chapters.*': { id: '', title: 'New chapter', blurb: '' },

  'sheets.items.*': {
    id: '', kind: 'cast', image: '', figures: 1, description: '', name: '',
  },

  'wiki.entries.*': {
    id: '', slug: '', title: 'Untitled', category: 'lore',
    summary: '', body: '', blocks: [], image: '', published: false,
  },
  /* Load-bearing in the same way the snippet and clip templates are: entry
     defaults that ship with blocks still gain new ones past the end of the
     defaults, and every one of those merges over this rather than over a
     positional default. Without it `mergeArray` warns and passes the row
     through unmerged, so a new field would never reach existing blocks. */
  'wiki.entries.*.blocks.*': { id: '', heading: '', html: '', image: '', caption: '' },
  'wiki.categories.*': { id: 'lore', label: 'New' },

  'status.rows.*': { id: '', label: 'New row', state: 'wip', note: '', chip: '' },

  'about.blocks.*': { kind: 'p', text: 'New paragraph.' },
};

export const LABELS: Record<string, string> = {
  'site.title': 'Site title',
  'site.nav.*.label': 'Nav label',
  'site.nav.*.sub': 'Nav subtitle',
  'site.promo.title': 'Rail card title',
  'site.promo.body': 'Rail card text',
  'site.promo.cta': 'Rail card button',
  'site.footer.copyright': 'Footer copyright',
  'site.footer.build': 'Footer build note',

  'home.ribbons.start': 'Start-here ribbon',
  'home.ribbons.drafts': 'Drafts ribbon',
  'home.ribbons.status': 'Status ribbon',
  'home.ribbons.quick': 'Quick-access ribbon',
  'home.hero.badge': 'Hero badge',
  'home.hero.title': 'Hero headline',
  'home.hero.sub': 'Hero readout',
  'home.hero.cta': 'Hero button',
  'home.startHere.seeAll': '"See all" link',
  'home.quick.*.label': 'Tile name',
  'home.quick.*.sub': 'Tile subtitle',

  'pages.chapters.*.title': 'Chapter title',
  'pages.chapters.*.blurb': 'Chapter blurb',
  'pages.items.*.chapter': 'Chapter id — must match one in the chapter list',
  'pages.items.*.stage': 'Pencil stage',
  'pages.items.*.alt': 'Alt text',
  /* Drives ListControlsImpl's button copy: "+ Add panel", "Delete this panel?" */
  'pages.items.*.snippets.*': 'panel',
  'pages.items.*.snippets.*.title': 'Panel name — for you; readers never see it',
  'pages.items.*.snippets.*.body': 'Panel script — prose splits by sentence, "NAME: line" for dialogue',
  'pages.items.*.script': 'Page script (legacy) — superseded by panels',
  'pages.items.*.image': 'Page image',
  'pages.items.*.thumb': 'Thumbnail',
  'pages.items.*.audio': 'Line recordings',

  'sheets.items.*.description': 'Description (also the alt text)',
  'sheets.items.*.name': 'Name — leave blank unless it is genuinely known',
  'sheets.items.*.figures': 'Figures on the sheet',
  'sheets.items.*.image': 'Sheet image',

  'wiki.entries.*.title': 'Entry title',
  'wiki.entries.*.slug': 'URL slug',
  'wiki.entries.*.summary': 'Index summary',
  'wiki.entries.*.category': 'Category',
  'wiki.categories.*.label': 'Category name',
  'wiki.list.more': '"See all" button — the count is added after it',
  'wiki.list.less': '"Show fewer" button',
  'wiki.entries.*.body': 'Body (legacy) — superseded by sections',
  'wiki.entries.*.image': 'Entry picture',
  /* Drives ListControlsImpl's copy: "+ Add section", "Delete this section?" */
  'wiki.entries.*.blocks.*': 'section',
  'wiki.entries.*.blocks.*.heading': 'Section heading — leave blank for none',
  'wiki.entries.*.blocks.*.html': 'Section text',
  'wiki.entries.*.blocks.*.image': 'Section picture',
  'wiki.entries.*.blocks.*.caption': 'Picture caption',
  'wiki.empty.title': 'Empty-state heading',
  'wiki.empty.body': 'Empty-state text',

  'status.rows.*.label': 'Status label',
  'status.rows.*.note': 'Status note',
  'status.rows.*.chip': 'Status chip',

  'about.reader.notice': 'Reader notice',
  'about.cast.notice': 'Cast notice',
  'about.blocks.*.text': 'Paragraph',
};

/** The blank item for a list, addressed by the LIST path (not the item path). */
export function templateForList(listPath: Path): unknown {
  const key = `${normalizePath(listPath)}.*`;
  const t = TEMPLATES[key];
  return t === undefined ? {} : structuredClone(t);
}

/** The template an out-of-range stored item should merge over. */
export function templateForItem(itemPath: Path): unknown {
  const t = TEMPLATES[normalizePath(itemPath)];
  return t === undefined ? undefined : t;
}

export function labelFor(path: Path): string | undefined {
  return LABELS[normalizePath(path)];
}
