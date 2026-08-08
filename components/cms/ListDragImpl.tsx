'use client';

import { useEffect, useRef } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { dropTo, gapAt, isNoop } from '../../lib/reorder.ts';

/* The drag itself.
 *
 * Written against the DOM rather than through React state, and deliberately:
 * a pointermove is a per-frame event, and re-rendering the reader on each one
 * is exactly what made the page-turn swipe stutter before it was rewritten the
 * same way. Nothing here calls setState. The only React the drag touches is
 * listMove(), once, on drop.
 *
 * Four things had to be true for this to feel like picking something up:
 *
 *   HOLD, NOT GRAB. A tap on a thumbnail already means "go to that page", so a
 *   drag cannot start on pointerdown. It starts after HOLD_MS, and any real
 *   movement before then cancels it — that is a scroll, not a lift.
 *
 *   CAPTURE ON THE LIST. Once lifted, the pointer is captured by the list, so
 *   every later event retargets there and the thumbnail's own handlers stop
 *   firing. Without it, letting go on a different page would ALSO navigate to
 *   whichever page happened to be under the finger.
 *
 *   THE GAP, NOT THE ITEM. The drop target is the space between two pages, so
 *   the indicator is drawn on the near edge of the page you are next to. See
 *   lib/reorder.ts for the arithmetic, which is where the off-by-one lives.
 *
 *   NO CLICK AFTERWARDS. A drag ends in a pointerup, and a browser follows that
 *   with a click. Swallowed once, or every drop would navigate.
 */

const HOLD_MS = 320;
/** Movement before the hold completes means the pointer is scrolling. */
const SLOP = 8;
/** How close to a scrollable edge before the list starts creeping. */
const EDGE = 44;
const EDGE_SPEED = 14;

export default function ListDragImpl({ listPath }: { listPath: string }) {
  const { listMove } = useCms();
  const anchor = useRef<HTMLSpanElement>(null);

  /* listMove changes identity whenever the draft tree does, which is on every
     keystroke in the editor. Reading it from a ref keeps the listeners
     attached across all of that instead of being torn down and rebuilt. */
  const move = useRef(listMove);
  move.current = listMove;

  useEffect(() => {
    const list = anchor.current?.parentElement;
    if (!list) return;

    list.classList.add('cms-drag-list');

    let timer = 0;
    let dragging = false;
    let pointer = -1;
    let from = -1;
    let box: HTMLElement | null = null;
    let originX = 0;
    let originY = 0;
    let before = -1;
    let raf = 0;
    let edge = 0;
    let edgeY = 0;
    /* Whether the pointer actually went anywhere AFTER the lift. A hold that
       never moved is not a reorder that changed nothing — it is the other
       gesture: the one that asks what else this item can do. */
    let travelled = false;
    /* Scroll containers whose touch-action was suspended for the lift. */
    let frozen: { el: HTMLElement; had: string }[] = [];

    const items = (): HTMLElement[] =>
      [...list.querySelectorAll<HTMLElement>('[data-i]')]
        .map((el) => el.closest<HTMLElement>('li') ?? el);

    const indexOf = (el: HTMLElement): number =>
      Number(el.querySelector<HTMLElement>('[data-i]')?.dataset.i
        ?? el.dataset.i ?? -1);

    const clearMarks = () => {
      for (const el of items()) el.removeAttribute('data-drop');
    };

    /* Creep the list when the pointer sits near an edge, so a page can be
       dragged somewhere that is not currently on screen.
     *
     * Each axis is answered separately and only by a container that actually
     * scrolls on that axis. The first version fell back to scrolling a
     * vertical ancestor by the horizontal amount when the strip did not
     * scroll, which pulled the whole page out from under the pointer and lost
     * the drop. */
    const scroller = (axis: 'x' | 'y'): HTMLElement | null => {
      for (let el: HTMLElement | null = list; el; el = el.parentElement) {
        const room = axis === 'x'
          ? el.scrollWidth > el.clientWidth + 2
          : el.scrollHeight > el.clientHeight + 2;
        if (room) return el;
      }
      return null;
    };

    const creep = () => {
      raf = 0;
      if (!dragging || (!edge && !edgeY)) return;
      if (edge) scroller('x')?.scrollBy(edge, 0);
      if (edgeY) scroller('y')?.scrollBy(0, edgeY);
      raf = requestAnimationFrame(creep);
    };

    const cancelHold = () => { clearTimeout(timer); timer = 0; };

    /* touch-action:none on the thumbnail is not enough. The gesture still
       belongs to whichever ancestor scrolls, and the moment the drag moves,
       that ancestor claims it and the browser answers with pointercancel —
       the lift ends before it has gone anywhere. Every scroll container above
       the list gives its touch-action up for the duration of the drag, and
       gets it back on drop. */
    const freeze = () => {
      frozen = [];
      for (let el: HTMLElement | null = list; el; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) {
          frozen.push({ el, had: el.style.touchAction });
          el.style.touchAction = 'none';
        }
        if (el === document.body) break;
      }
    };
    const thaw = () => {
      for (const f of frozen) f.el.style.touchAction = f.had;
      frozen = [];
    };

    const lift = () => {
      if (!box) return;
      dragging = true;
      freeze();
      list.classList.add('is-dragging');
      box.classList.add('is-lifted');
      try { list.setPointerCapture(pointer); } catch { /* pointer already gone */ }
      navigator.vibrate?.(12);
    };

    const onDown = (e: PointerEvent) => {
      if (dragging || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const target = e.target as HTMLElement | null;
      /* The ↑ ↓ × buttons are controls in their own right. */
      if (!target || target.closest('.cms-list')) return;
      const hit = target.closest<HTMLElement>('[data-i]');
      if (!hit || !list.contains(hit)) return;

      box = hit.closest<HTMLElement>('li') ?? hit;
      from = indexOf(box);
      if (from < 0) { box = null; return; }

      pointer = e.pointerId;
      originX = e.clientX;
      originY = e.clientY;
      before = -1;
      travelled = false;
      cancelHold();
      timer = window.setTimeout(lift, HOLD_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (!box) return;
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;

      if (!dragging) {
        if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) { cancelHold(); box = null; }
        return;
      }

      e.preventDefault();
      if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) travelled = true;
      box.style.translate = `${dx}px ${dy}px`;

      const boxes = items()
        .filter((el) => el !== box)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { index: indexOf(el), x: r.x + r.width / 2, y: r.y + r.height / 2, right: r.right };
        })
        .filter((b) => b.index >= 0);

      const gap = gapAt(boxes, e.clientX, e.clientY);
      clearMarks();
      if (gap) {
        before = gap.before;
        const over = items().find((el) => indexOf(el) === gap.over);
        over?.setAttribute('data-drop', gap.side);
      } else {
        before = -1;
      }

      /* edge creep, per axis, and only where something can actually scroll */
      const sx = scroller('x');
      if (sx) {
        const r = sx.getBoundingClientRect();
        edge = e.clientX < r.left + EDGE ? -EDGE_SPEED
          : e.clientX > r.right - EDGE ? EDGE_SPEED : 0;
      } else edge = 0;

      const sy = scroller('y');
      if (sy) {
        const r = sy.getBoundingClientRect();
        edgeY = e.clientY < r.top + EDGE ? -EDGE_SPEED
          : e.clientY > r.bottom - EDGE ? EDGE_SPEED : 0;
      } else edgeY = 0;

      if ((edge || edgeY) && !raf) raf = requestAnimationFrame(creep);
    };

    const swallowClick = () => {
      const eat = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
      addEventListener('click', eat, { capture: true, once: true });
      /* If no click follows — a cancelled drag, a touch that never produced one
         — the listener must not sit there waiting to eat an unrelated one. */
      setTimeout(() => removeEventListener('click', eat, { capture: true }), 400);
    };

    const finish = (commit: boolean) => {
      cancelHold();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      edge = 0;
      edgeY = 0;

      /* Held, then let go without going anywhere. Read before the reset below,
         because `from` is about to be cleared. */
      const asked = dragging && commit && !travelled;
      const at = from;

      if (dragging) {
        thaw();
        try { list.releasePointerCapture(pointer); } catch { /* already released */ }
        list.classList.remove('is-dragging');
        box?.classList.remove('is-lifted');
        if (box) box.style.translate = '';
        clearMarks();
        swallowClick();
        if (commit && before >= 0 && !isNoop(from, before)) {
          move.current(listPath, from, dropTo(from, before));
        }
      }

      dragging = false;
      box = null;
      from = -1;
      before = -1;
      pointer = -1;
      travelled = false;

      /* The site owns what a hold offers — this file knows how to pick an item
         up and nothing about what one IS. A bubbling event rather than a
         callback prop keeps it that way, and keeps the menu's code out of the
         list's. */
      if (asked && at >= 0) {
        list.dispatchEvent(new CustomEvent('cms:hold', {
          bubbles: true,
          detail: { listPath, index: at },
        }));
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dragging) finish(false); };

    list.addEventListener('pointerdown', onDown);
    list.addEventListener('pointermove', onMove);
    list.addEventListener('pointerup', onUp);
    list.addEventListener('pointercancel', onCancel);
    addEventListener('keydown', onKey);

    return () => {
      finish(false);
      list.classList.remove('cms-drag-list');
      list.removeEventListener('pointerdown', onDown);
      list.removeEventListener('pointermove', onMove);
      list.removeEventListener('pointerup', onUp);
      list.removeEventListener('pointercancel', onCancel);
      removeEventListener('keydown', onKey);
    };
  }, [listPath]);

  /* An anchor, not a wrapper: the element it needs is its own parent, which is
     the list the site already rendered. */
  return <span className="cms-drag" ref={anchor} aria-hidden="true" />;
}
