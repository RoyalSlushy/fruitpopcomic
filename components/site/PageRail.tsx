'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { ListAdd } from '../cms/ListControls.tsx';
import { ListDrag } from '../cms/ListDrag.tsx';
import { isScriptPage } from '../../lib/chapters.ts';
import { mediaURL, pad } from '../../lib/media.ts';
import type { Placed } from '../../lib/chapters.ts';

/* The chapter's pages, as a carousel of screenfuls.
 *
 * It was one grid that scrolled, and scrolling is the wrong verb for this: a
 * chapter is a small, countable thing, and a reader wants to know how much of
 * it there is. A carousel says so twice — a group is exactly what fits, so
 * nothing is ever half in view, and the dots underneath are the chapter's
 * length at a glance.
 *
 * HOW MANY FIT IS MEASURED, NOT ASSUMED. The drawer is a fixed share of the
 * viewport and a thumbnail is a fixed size, so the number that fits is a
 * division — but it is a division of numbers only the browser knows, and it
 * changes when the phone turns. A ResizeObserver does it, and the groups are
 * re-chunked from the answer.
 *
 * The dots are derived from the same number, so they cannot disagree with the
 * groups they index. */

/* The grid's own numbers, and they have to stay in step with .film__grid in
   globals.css — `auto-fill minmax(MIN_COL, 1fr)` with GAP between, thumbnails
   at 2:3 inside a BORDER-thick keyline. */
const MIN_COL = 52;
const GAP = 10;
const BORDER = 6;
const RATIO = 3 / 2;
/** Never fewer than this, however cramped: one page per swipe is not a group. */
const FLOOR = 4;

export function PageRail({ pages, at, total, onPick, stripRef }: {
  /** the chapter's pages, each with its index in the flat running order */
  pages: Placed[];
  /** the flat index of the page being read */
  at: number;
  /** how many pages the flat list holds, for the editor's empty-state add */
  total: number;
  onPick: (flat: number) => void;
  stripRef: React.RefObject<HTMLElement | null>;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [per, setPer] = useState(10);
  const [group, setGroup] = useState(0);

  /* Measured off the track rather than off the viewport: the drawer's height is
     a dvh share, its padding is a clamp, and the rail lives inside a panel on a
     desktop and a sheet on a phone. Only the box itself knows. */
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    /* Derived rather than read off a rendered cell. Asking the DOM how tall a
       thumbnail is would be circular — its height comes from its width, which
       comes from the column count, which is what is being solved for — and a
       measurement that feeds itself oscillates when the box is near a
       boundary. These are the same three numbers .film__grid is written with,
       so the arithmetic is the stylesheet's, done twice. */
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const cols = Math.max(1, Math.floor((w + GAP) / (MIN_COL + GAP)));
      const cell = (w - (cols - 1) * GAP) / cols;
      /* The keyline is INSIDE the cell, so the picture is the cell less its
         border and the row is that picture plus the border back again. Taking
         the ratio off the whole cell overstated a row by 9px, which is the
         difference between two rows fitting a 199px drawer and one. */
      const rowH = (cell - BORDER) * RATIO + BORDER;
      const rows = Math.max(1, Math.floor((h + GAP) / (rowH + GAP)));
      setPer(Math.max(FLOOR, cols * rows));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groups: Placed[][] = [];
  for (let i = 0; i < pages.length; i += per) groups.push(pages.slice(i, i + per));
  if (!groups.length) groups.push([]);

  /* The group holding the page being read. Followed rather than remembered:
     turning a page from the dock while the drawer is open should bring the
     strip with it, and the reader may be several groups away. */
  const home = Math.max(0, Math.floor(pages.findIndex((p) => p.index === at) / per));

  const scrollTo = useCallback((n: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({
      left: n * el.clientWidth,
      behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'smooth' : 'auto',
    });
  }, []);

  /* Not smooth: this fires when the page changed under the strip, and easing
     across four groups to catch up is a longer animation than the page turn
     that caused it. */
  useEffect(() => { setGroup(home); scrollTo(home, false); }, [home, per, scrollTo]);

  /* Which group is showing, read off the scroller itself rather than set when a
     dot is pressed — a swipe moves it too, and the dots have to follow both. */
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    setGroup((g) => (g === n ? g : n));
  };

  return (
    <>
      <div className="film" ref={track} onScroll={onScroll}>
        <ul className="film__track" ref={stripRef as React.RefObject<HTMLUListElement>}>
          {groups.map((g, gi) => (
            <li className="film__group" key={gi}>
              <ul className="film__grid">
                {g.map((p) => {
                  const n = pages.findIndex((q) => q.index === p.index);
                  return (
                    <li key={p.page.id}>
                      <button
                        type="button"
                        data-i={p.index}
                        /* Everything past the page being read is dimmed — the
                           strip is a record of how far in you are, and a
                           chapter you have not opened yet should not look the
                           same as one you have read. Decorative only: the
                           label still says which page it is, and aria-current
                           still says which one you are on. */
                        data-ahead={p.index > at ? 'true' : 'false'}
                        aria-label={`Page ${n + 1}`}
                        aria-current={p.index === at ? 'true' : 'false'}
                        /* Both, and deliberately. The drawer is nested several
                           levels inside the panel, and Chromium hit-tests the
                           real pointer stream and the compatibility mouse
                           events it synthesises after touchend differently:
                           pointerdown/up land on the thumbnail, the click that
                           follows falls through to the page behind. onClick
                           alone was therefore dead to a finger while working
                           from a keyboard; onPointerUp alone would be dead to
                           a keyboard. onPick is idempotent, so when both fire
                           the second is a no-op. */
                        onPointerUp={() => onPick(p.index)}
                        onClick={() => onPick(p.index)}
                      >
                        {isScriptPage(p.page) ? (
                          <span className="thumb__blank" aria-hidden="true">
                            <Glyph name="script" width={5} />
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaURL(p.page.thumb || p.page.image)}
                            alt="" width={52} height={78} loading="lazy"
                          />
                        )}
                        <span className="film__n" aria-hidden="true">{pad(n)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}

          {/* Only when there is nothing to hold. Everything a page can be asked
              is asked by holding it — but an empty chapter has no page to hold,
              so it keeps the one button that can end that. */}
          {total === 0 && (
            <li className="filmstrip__add">
              <ListAdd listPath="pages.items" length={0} />
            </li>
          )}

          {/* Press-and-hold on the list above: hold and move to reorder, hold
              and let go to be asked what else this page can do. Renders nothing
              for a visitor, and the list needs to know nothing about either. */}
          <ListDrag listPath="pages.items" />
        </ul>
      </div>

      {/* One dot per group, and only where there is more than one — a single
          dot is a claim about position with nothing to compare it to. */}
      {groups.length > 1 && (
        <div className="film__dots" role="tablist" aria-label="Pages, in groups">
          {groups.map((g, gi) => (
            <button
              key={gi}
              type="button"
              role="tab"
              className="film__dot"
              aria-selected={gi === group}
              aria-label={`Pages ${gi * per + 1} to ${gi * per + g.length}`}
              onClick={() => { setGroup(gi); scrollTo(gi); }}
            />
          ))}
        </div>
      )}
    </>
  );
}
