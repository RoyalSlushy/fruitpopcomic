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
    chapter: '', script: '',
  },

  'pages.chapters.*': { id: '', title: 'New chapter', blurb: '' },

  'sheets.items.*': {
    id: '', kind: 'cast', image: '', figures: 1, description: '', name: '',
  },

  'wiki.entries.*': {
    id: '', slug: '', title: 'Untitled', category: 'lore',
    summary: '', body: '', image: '', published: false,
  },
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

  'home.ribbons.hot': 'Hero ribbon',
  'home.ribbons.start': 'Start-here ribbon',
  'home.ribbons.drafts': 'Drafts ribbon',
  'home.ribbons.status': 'Status ribbon',
  'home.ribbons.quick': 'Quick-access ribbon',
  'home.hero.badge': 'Hero badge',
  'home.hero.title': 'Hero headline',
  'home.hero.sub': 'Hero standfirst',
  'home.hero.cta': 'Hero button',
  'home.startHere.seeAll': '"See all" link',
  'home.quick.*.label': 'Tile name',
  'home.quick.*.sub': 'Tile subtitle',

  'pages.chapters.*.title': 'Chapter title',
  'pages.chapters.*.blurb': 'Chapter blurb',
  'pages.items.*.chapter': 'Chapter id — must match one in the chapter list',
  'pages.items.*.stage': 'Pencil stage',
  'pages.items.*.alt': 'Alt text',
  'pages.items.*.script': 'Page script — one beat per line, "NAME: line" for dialogue',
  'pages.items.*.image': 'Page image',
  'pages.items.*.thumb': 'Thumbnail',

  'sheets.items.*.description': 'Description (also the alt text)',
  'sheets.items.*.name': 'Name — leave blank unless it is genuinely known',
  'sheets.items.*.figures': 'Figures on the sheet',
  'sheets.items.*.image': 'Sheet image',

  'wiki.entries.*.title': 'Entry title',
  'wiki.entries.*.slug': 'URL slug',
  'wiki.entries.*.summary': 'Index summary',
  'wiki.entries.*.body': 'Body',
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
