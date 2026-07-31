'use client';

import dynamic from 'next/dynamic';
import { useEditMode } from '../../lib/cms-context.tsx';

/* Press-and-hold to pick a page up, drag it between two others, let go.
 *
 * Renders nothing at all for visitors — not a wrapper, not an attribute — so
 * the markup they receive is unchanged by the editor existing, and the drag
 * code itself never reaches their bundle. Same split as EditableText.
 *
 * It is a sibling of the list rather than a wrapper around it because the list
 * belongs to the site, not to the CMS: dropping this element in adds dragging
 * to an existing list without any of that list's markup knowing.
 *
 * Dragging is never the ONLY way to reorder. The ↑ ↓ buttons on each item stay
 * exactly where they were, which is what a keyboard uses — a drag has no
 * keyboard equivalent and inventing one out of arrow keys would collide with
 * the reader's own paging. */

const Impl = dynamic(() => import('./ListDragImpl.tsx'), { ssr: false });

export type ListDragProps = {
  /** the LIST path, e.g. "pages.items" */
  listPath: string;
};

export function ListDrag(props: ListDragProps) {
  if (!useEditMode()) return null;
  return <Impl {...props} />;
}
