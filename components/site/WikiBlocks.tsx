'use client';

import { EditableText } from '../cms/EditableText.tsx';
import { EditableRich } from '../cms/EditableRich.tsx';
import { EditableFigure } from '../cms/EditableFigure.tsx';
import { ListControls, ListAdd } from '../cms/ListControls.tsx';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { blocksOf, isBlankBlock } from '../../lib/wiki.ts';
import type { WikiBlock } from '../../content/wiki.ts';

/* An entry's sections, one panel each.
 *
 * A client component, and that is load-bearing for the same reason Chapters
 * and Gallery are: this list can change LENGTH in the editor, and a
 * server-rendered list cannot grow a node in response to a draft. Adding a
 * section would silently do nothing while reordering appeared to work — which
 * is exactly what it did before this file existed.
 *
 * Every panel on this site is rotated a fraction of a degree, and a rotation
 * pivots about the centre, so one tall box swings its far corners out of the
 * column. A section per panel keeps each box short enough for the tilt to
 * read as a tilt. */

export function WikiBlocks({ entryIndex, blocks, body, style }: {
  entryIndex: number;
  blocks: WikiBlock[];
  /** the legacy one-string body, rendered when the entry has no blocks */
  body: string;
  style?: React.CSSProperties;
}) {
  const listPath = `wiki.entries.${entryIndex}.blocks`;
  const live = useCmsValue<WikiBlock[]>(listPath, blocks);
  const editing = useEditMode();

  const all = blocksOf({ blocks: live, body });

  /* The block list is only addressable when the entry actually STORES blocks.
     An entry still on the legacy body renders sections derived from it, and
     offering to reorder rows that do not exist in the data would write
     nonsense — so those get no controls. */
  const stored = live.length > 0;

  /* Index preserved through the filter: `n` is the position in the stored
     array and therefore the position in every path below. */
  const rows = all
    .map((b, n) => ({ b, n }))
    .filter(({ b }) => editing || !isBlankBlock(b));

  return (
    <>
      {rows.map(({ b, n }) => (
        <div className="slab slab--bare wiki__section" key={b.id || `b${n}`} style={style}>
          <div className="panel">
            <div className="panel__in">
              <div className="prose wiki__block">
                <div className="wiki__block-head">
                  {/* A section is allowed no heading — the opening block of
                      every entry has none. `placeholder` is what makes that
                      render as nothing for a reader and as something to aim
                      at for the editor. */}
                  <EditableText
                    as="h3" className="wiki__block-title"
                    path={`${listPath}.${n}.heading`}
                    value={b.heading}
                    placeholder="Section heading"
                  />
                  {stored && <ListControls listPath={listPath} index={n} length={all.length} />}
                </div>
                <EditableFigure
                  className="wiki__fig"
                  path={`${listPath}.${n}.image`}
                  value={b.image}
                  captionPath={`${listPath}.${n}.caption`}
                  captionValue={b.caption}
                  alt={b.caption}
                />
                <EditableRich path={`${listPath}.${n}.html`} value={b.html} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {stored && (
        <p className="wiki__add">
          <ListAdd listPath={listPath} length={all.length} />
        </p>
      )}
    </>
  );
}
