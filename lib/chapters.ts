/* Grouping pages into chapters.
 *
 * The flat `items` array stays the single running order — it is what reordering
 * moves things within, what /read/[n] indexes into, and what the merge matches
 * by id across an edit. Chapters are a VIEW over it, derived here, rather than
 * a second nested structure that could disagree with it.
 *
 * The one rule that matters: nothing is ever dropped. A page whose `chapter`
 * names a chapter that does not exist — a typo, a deleted chapter, a page added
 * before its chapter was — still appears, in a trailing unsorted group. A
 * reading surface that silently hides a page is worse than one that admits it
 * does not know where the page goes.
 *
 * Pure. No React, no browser API.
 */

import type { Chapter, ComicPage } from '../content/pages.ts';

/** A page together with its position in the flat running order. */
export type Placed = { page: ComicPage; index: number };

export type Group = {
  /** null for the unsorted bucket */
  chapter: Chapter | null;
  pages: Placed[];
};

/** Chapters in declared order, each with its pages in running order. */
export function group(chapters: Chapter[], items: ComicPage[]): Group[] {
  const known = new Map<string, Placed[]>();
  for (const c of chapters) known.set(c.id, []);

  const loose: Placed[] = [];

  items.forEach((page, index) => {
    const bucket = page.chapter ? known.get(page.chapter) : undefined;
    (bucket ?? loose).push({ page, index });
  });

  const out: Group[] = chapters.map((c) => ({
    chapter: c,
    pages: known.get(c.id) ?? [],
  }));

  /* Only when there is something in it. An "Unsorted" heading over nothing is
     an admission with no subject. */
  if (loose.length) out.push({ chapter: null, pages: loose });
  return out;
}

/**
 * Every page sharing a chapter with `index`, in running order.
 *
 * This is what scopes the reader: paging stops at the chapter's edges rather
 * than sliding into the next one, and the counter reads within the chapter.
 * A page in no chapter reads alongside the other unsorted ones.
 */
export function siblings(chapters: Chapter[], items: ComicPage[], index: number): Placed[] {
  const me = items[index];
  if (!me) return [];
  for (const g of group(chapters, items)) {
    if (g.pages.some((p) => p.index === index)) return g.pages;
  }
  return [{ page: me, index }];
}

/** The chapter a page belongs to, or null when it is unsorted. */
export function chapterOf(chapters: Chapter[], page: ComicPage | undefined): Chapter | null {
  if (!page) return null;
  return chapters.find((c) => c.id === page.chapter) ?? null;
}

/** True where the page carries writing but no drawing. */
export const isScriptPage = (p: ComicPage | undefined): boolean =>
  !!p && !p.image.trim();
