'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EditableText } from '../cms/EditableText.tsx';
import { EditableImage } from '../cms/EditableImage.tsx';
import { useCmsValue } from '../../lib/cms-context.tsx';
import type { WikiContent, WikiEntry } from '../../content/wiki.ts';

/* The index shelves, grouped by category.
 *
 * A client component for the same reason WikiBlocks is: grouping is derived
 * from each entry's `category`, and the entry page now has a control that
 * CHANGES it. Grouped on the server, an entry moved to another category kept
 * its old shelf until save-and-reload — an edit that appeared not to work.
 * Derived from the draft, it walks across the index the moment the category
 * changes.
 *
 * The one rule carried over from lib/chapters.ts: nothing is ever dropped.
 * An entry whose category matches no listed category — a category deleted in
 * the editor, a stale row — lands on a trailing "Uncategorized" shelf rather
 * than silently vanishing from the index, which is what it used to do.
 *
 * Long shelves FOLD. Twenty-eight character cards in one run buried the
 * World shelf a screen and a half down, so a shelf shows `list.limit` cards
 * and puts the rest behind "See all N". Folded is a starting state, not a
 * navigation: the button expands in place and offers to fold back. */

export function WikiIndexList({ categories, entries, list }: {
  categories: WikiContent['categories'];
  entries: WikiEntry[];
  list: WikiContent['list'];
}) {
  const cats = useCmsValue('wiki.categories', categories);
  const all = useCmsValue('wiki.entries', entries);
  const fold = useCmsValue('wiki.list', list);
  const live = all.filter((e) => e.published);

  /* Which shelves are open, by category id. Session state, deliberately not
     persisted anywhere: a fresh visit starts folded. */
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const known = new Set<string>(cats.map((c) => c.id));
  const loose = live.filter((e) => !known.has(e.category));

  const shelf = (key: string, rows: WikiEntry[]) => {
    /* `limit + 1`, not `limit`: a button standing in for ONE hidden card
       costs a click to save no space — the card is smaller than the button.
       Folding starts where it starts paying. */
    const folds = fold.limit > 0 && rows.length > fold.limit + 1;
    const shown = folds && !open.has(key) ? rows.slice(0, fold.limit) : rows;

    return (
      <>
        <ul className="wiki__list" id={`wiki-shelf-${key}`}>
          {shown.map((e) => {
            /* Index into the FULL stored array — that is what every editor
               path addresses — not into the published subset rendered. */
            const i = all.indexOf(e);
            return (
              <li key={e.id || e.slug}>
                <Link className="wiki__card" href={`/wiki/${encodeURIComponent(e.slug)}`}>
                  {e.image
                    ? <EditableImage path={`wiki.entries.${i}.image`} value={e.image} alt="" width={120} height={120} />
                    : <span className="wiki__card-mark" aria-hidden="true" />}
                  <span className="wiki__card-body">
                    <EditableText as="span" className="wiki__card-title" path={`wiki.entries.${i}.title`} value={e.title} />
                    {e.summary && (
                      <EditableText as="span" className="wiki__card-sum" path={`wiki.entries.${i}.summary`} value={e.summary} multiline />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {folds && (
          <p className="wiki__more">
            <button
              type="button"
              className="btn"
              aria-expanded={open.has(key)}
              aria-controls={`wiki-shelf-${key}`}
              onClick={() => toggle(key)}
            >
              {open.has(key)
                ? <EditableText as="span" path="wiki.list.less" value={fold.less} />
                : <><EditableText as="span" path="wiki.list.more" value={fold.more} /> {rows.length}</>}
            </button>
          </p>
        )}
      </>
    );
  };

  return (
    <div className="wiki">
      {cats.map((cat, ci) => {
        const rows = live.filter((e) => e.category === cat.id);
        if (!rows.length) return null;
        return (
          <section className="wiki__group" key={cat.id}>
            <EditableText as="h3" className="wiki__cat" path={`wiki.categories.${ci}.label`} value={cat.label} />
            {shelf(cat.id, rows)}
          </section>
        );
      })}

      {loose.length > 0 && (
        <section className="wiki__group">
          <h3 className="wiki__cat">Uncategorized</h3>
          {shelf('loose', loose)}
        </section>
      )}
    </div>
  );
}
