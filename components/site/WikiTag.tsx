'use client';

import { useCms, useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import type { WikiCategory, WikiContent } from '../../content/wiki.ts';

/* The category tag on an entry — and, in edit mode, the control that moves
 * the entry between categories. There was no such control before: category
 * was a stored field with nothing in the editor able to write it, so grouping
 * an entry meant editing the code. The tag was already the word on screen
 * naming the category, which makes it the honest place for the picker.
 *
 * A select rather than free text because the ids are a closed set: the index
 * shelves by exact match, and a typo would strand the entry on the
 * Uncategorized shelf. */

export function WikiTag({ entryIndex, category, categories }: {
  entryIndex: number;
  category: WikiCategory;
  categories: WikiContent['categories'];
}) {
  const path = `wiki.entries.${entryIndex}.category`;
  const cats = useCmsValue('wiki.categories', categories);
  const value = useCmsValue(path, category);
  const editing = useEditMode();
  const { write } = useCms();

  const current = cats.find((c) => c.id === value);

  if (!editing) {
    return <p className="wiki__tag">{current?.label ?? 'Uncategorized'}</p>;
  }

  return (
    <p className="wiki__tag" data-cms-path={path} data-cms-label="Category">
      <select
        className="cms-cat"
        value={value}
        aria-label="Category"
        onChange={(e) => write(path, e.target.value)}
      >
        {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        {/* A value no listed category owns still has to be selectable, or the
            select would silently display the first option while the data said
            something else. */}
        {!current && <option value={value}>{value || 'Uncategorized'}</option>}
      </select>
    </p>
  );
}
