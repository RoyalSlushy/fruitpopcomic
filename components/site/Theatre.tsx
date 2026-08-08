'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { effectiveSnippets, pageLines } from '../../lib/script.ts';
import { tracksOf } from '../../lib/clips.ts';
import { mediaURL } from '../../lib/media.ts';
import { isScriptPage } from '../../lib/chapters.ts';
import {
  hydrate, pause, playable, play, resume, stopIfOwner, unlock, useTts,
} from '../../lib/tts.ts';
import type { ComicPage } from '../../content/pages.ts';

/* The page, its words, and nothing else.
 *
 * The reader is a room full of affordances — a filmstrip, a script column,
 * zoom, chapter arrows, an editor. All of it is for someone deciding what to
 * look at. This is for someone who has decided: the artwork, the part being
 * read under it, and a voice going through the whole thing page after page
 * without being asked again.
 *
 * It is a separate component rather than another `data-` mode on the reader
 * because it shares almost none of the reader's behaviour. Paging here is
 * driven by the QUEUE rather than by the visitor — a page turns when its last
 * beat finishes — and the reader's gestures all mean something else.
 *
 * Three gestures, chosen so nothing needs a label:
 *
 *   - swipe the artwork      → the previous or next page
 *   - swipe the words        → the previous or next part
 *   - press the words        → pause, and press again to carry on
 *
 * A tap anywhere else brings back the way out. Nothing is permanently on
 * screen except the page and the line being spoken, which is the entire point.
 */

/* Far enough that a lazy vertical scroll is not read as a swipe, short enough
   that a deliberate flick on a phone always clears it. The reader uses a
   width-proportional threshold because it drags the page with the thumb; here
   nothing moves until the gesture is over, so a fixed distance is honest. */
const SWIPE = 48;

export function Theatre({ pages, at, onPage, onClose }: {
  pages: ComicPage[];
  /** index into `pages` of the page on screen */
  at: number;
  /** move by a page; the reader clamps and owns the running order */
  onPage: (delta: number) => boolean;
  onClose: () => void;
}) {
  const page = pages[at];
  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;
  const running = mine && tts.speaking;

  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(playable()); hydrate(); }, []);

  /* The way out, and the page count, appear on a tap and leave again. A show
     with a permanent chrome bar is not a show. */
  const [chrome, setChrome] = useState(true);
  const hideAt = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = useCallback(() => {
    setChrome(true);
    if (hideAt.current) clearTimeout(hideAt.current);
    hideAt.current = setTimeout(() => setChrome(false), 2600);
  }, []);
  useEffect(() => {
    reveal();
    return () => { if (hideAt.current) clearTimeout(hideAt.current); };
  }, [reveal]);

  const { lines, sections } = useMemo(
    () => pageLines(effectiveSnippets(page?.snippets, page?.script ?? '')),
    [page?.snippets, page?.script],
  );
  /* Depend on `page.audio` itself, not on a `?? []` written inline — that
     expression is a NEW array every render, which would make `tracks` new
     every render, which would re-fire the start effect below and restart
     playback forever. */
  const tracks = useMemo(() => tracksOf(lines, page?.audio ?? []), [lines, page?.audio]);
  const parts = useMemo(() => sections.filter((s) => s.lines.length > 0), [sections]);

  /* Which part is on screen. While something is playing this follows the live
     beat; otherwise it is wherever the visitor last swiped to, so a paused
     show does not jump back to the top. */
  const [held, setHeld] = useState(0);
  const livePart = running
    ? parts.findIndex((s) => tts.block >= s.from && tts.block < s.from + s.lines.length)
    : -1;
  const shown = livePart >= 0 ? livePart : Math.min(held, Math.max(0, parts.length - 1));
  const part = parts[shown];

  /* A page ends, the next one begins. This is the whole reason theatre mode
     exists, and the reason `play` reports a natural end separately from a
     stop: pressing pause must not turn the page. */
  const advance = useCallback(() => {
    setHeld(0);
    if (!onPage(1)) onClose();
  }, [onPage, onClose]);

  /* Start, and restart on every page change. `from` is 0 because arriving at a
     page in a show means arriving at its beginning. */
  useEffect(() => {
    if (!ok) return;
    setHeld(0);
    /* A page with no words would stall the show waiting for a beat that never
       comes, so it hands straight on. */
    if (!tracks.length) { advance(); return; }
    play(id, tracks, 0, advance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, at, tracks]);

  useEffect(() => () => { stopIfOwner(id); }, [id]);

  /* Escape leaves, as it does everywhere else here. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key === 'ArrowRight') { onPage(1); reveal(); }
      if (e.key === 'ArrowLeft') { onPage(-1); reveal(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPage, reveal]);

  const toggle = () => {
    unlock();
    if (!running) play(id, tracks, part ? part.from : 0, advance);
    else if (tts.paused) resume();
    else pause();
  };

  const toPart = (delta: number) => {
    const next = Math.min(parts.length - 1, Math.max(0, shown + delta));
    if (next === shown) return;
    setHeld(next);
    const target = parts[next];
    if (running && target) play(id, tracks, target.from, advance);
  };

  /* One pointer handler per region. Both measure the same way and differ only
     in what a horizontal swipe means, which is the point: the artwork is the
     page, the words are the parts.

     The gesture lives in a REF, not in the closure this returns.
     Playback re-renders this component every time the spoken beat changes, and
     a re-render between pointerdown and pointerup would hand the up-handler a
     fresh closure whose start position was never set — so a swipe taken while
     the voice was talking, which is most of them, would be dropped. */
  const drag = useRef({ x: 0, y: 0, live: false });
  const swipe = (onLeft: () => void, onRight: () => void, onTap?: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, live: true };
    },
    onPointerCancel: () => { drag.current.live = false; },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag.current.live) return;
      drag.current.live = false;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      reveal();
      /* Vertical wins ties, so scrolling a long part never turns a page. */
      if (Math.abs(dx) < SWIPE || Math.abs(dx) <= Math.abs(dy)) { onTap?.(); return; }
      if (dx < 0) onLeft(); else onRight();
    },
  });

  if (!page) return null;

  const art = !isScriptPage(page) ? mediaURL(page.image) : '';

  return (
    <div className="theatre" role="dialog" aria-modal="true" aria-label="Theatre mode">
      <div
        className="theatre__stage"
        {...swipe(() => onPage(1), () => onPage(-1))}
      >
        {art
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="theatre__art" src={art} alt={page.alt || ''} draggable={false} />
          : <p className="theatre__undrawn">Not drawn yet</p>}
      </div>

      {/* The words. Its own region, so a swipe here moves through the parts
          rather than through the pages under them. */}
      <div
        className={`theatre__words${running && !tts.paused ? ' is-live' : ''}`}
        {...swipe(() => toPart(1), () => toPart(-1), toggle)}
        role="button"
        tabIndex={0}
        aria-label={running && !tts.paused ? 'Pause' : 'Play'}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          toggle();
        }}
      >
        {part ? (
          <p className="theatre__part">
            {part.lines.map((l) => (
              <span
                key={l.i}
                className={running && tts.block === l.i ? 'is-live' : undefined}
              >
                {l.who ? `${l.who}: ` : ''}{l.text}{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="theatre__part theatre__part--none">
            No script for this page yet.
          </p>
        )}
      </div>

      {/* Hugging the left edge, because the right is where a thumb rests on a
          page it is swiping and this must not be pressed by accident. */}
      <div className={`theatre__chrome${chrome ? ' is-on' : ''}`}>
        <button
          type="button"
          className="theatre__exit"
          onClick={onClose}
          aria-label="Leave theatre mode"
        >
          <Glyph name="stop" width={5} />
        </button>
        <span className="theatre__count">
          {at + 1} / {pages.length}
          {parts.length > 1 && ` · part ${shown + 1} of ${parts.length}`}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {running ? `Page ${at + 1}, part ${shown + 1} of ${parts.length}.` : ''}
      </p>
    </div>
  );
}
