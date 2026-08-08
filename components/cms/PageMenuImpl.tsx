'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCms } from '../../lib/cms-context.tsx';
import { templateForList, labelFor } from '../../lib/cms-schema.ts';

/* What a held page offers.
 *
 * The filmstrip used to carry three buttons per page — ↑ ↓ × — which is thirty
 * controls on a ten-page chapter, in a drawer that is 300px tall on a phone.
 * They were also the wrong three: reordering is what the press-and-hold drag
 * already does better than any pair of arrows, and the two things it could not
 * do (make a page, unmake one) were not there at all.
 *
 * So the gesture that reorders also asks. Hold a page and move, and you are
 * dragging it; hold a page and let go, and this opens on it. One press, and
 * which of the two you meant is decided by what you did next — see the
 * `cms:hold` event in ListDragImpl.
 *
 * Portalled to <body> for the reason PageTools is: the strip lives inside a
 * filtered, clipped, contained subtree, and every previous attempt to put a
 * positioned box in there produced something that could be seen and not
 * touched.
 */

export default function PageMenuImpl({
  listPath, index, page, chapter, onEdit, onClose,
}: {
  listPath: string;
  index: number;
  page: number;
  /** the held page's chapter id, so a page added after it joins the same one */
  chapter: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { listInsert, listRemove } = useCms();
  const sheet = useRef<HTMLDivElement>(null);
  const what = labelFor(`${listPath}.0`) ?? 'page';

  /* Same dismissal as the reader's drawers and PageTools, and for the same
     reason: pointerdown cannot race the compatibility mouse events a touch
     screen synthesises after a tap. The press that opened this was dispatched
     before the listener existed, so it cannot close itself on the way up. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!sheet.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();                  // the reader must not also act on it
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const addAfter = () => {
    const item = templateForList(listPath) as Record<string, unknown>;
    /* Ids are what let the merge match items across a reorder, so every new
       one gets its own rather than relying on where it happens to sit. */
    if (item && typeof item === 'object' && 'id' in item) {
      item.id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
      /* The template's chapter is blank, which puts a new page in the trailing
         Unsorted group — so `Add blank page after` added one that was not
         after anything, and the strip it was added from could not show it at
         all. It joins the chapter it was added inside. */
      if ('chapter' in item) item.chapter = chapter;
    }
    listInsert(listPath, index + 1, item);
    onClose();
  };

  const remove = () => {
    if (!confirm(`Delete this ${what}? It stays deleted — the code default will not bring it back.`)) return;
    listRemove(listPath, index);
    onClose();
  };

  return createPortal(
    <div className="pgm" ref={sheet} role="dialog" aria-label={`Page ${page} options`}>
      <p className="pgm__tag">Page {String(page).padStart(2, '0')}</p>

      <button className="pgm__item" type="button" onClick={() => { onClose(); onEdit(); }}>
        Change image &amp; script…
      </button>
      <button className="pgm__item" type="button" onClick={addAfter}>
        Add blank page after
      </button>
      <button className="pgm__item pgm__item--bad" type="button" onClick={remove}>
        Delete page
      </button>

      <p className="pgm__note">Drag a page to reorder it. Held as a draft until you press Save.</p>
    </div>,
    /* An element outside the full-screen one is not rendered at all, so in
       cinematic mode <body> is the one place this must not go. */
    document.fullscreenElement ?? document.body,
  );
}
