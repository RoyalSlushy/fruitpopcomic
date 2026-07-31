'use client';

import { useEffect, useRef, useState } from 'react';

/* The backdrop in the hero's bottom section: the pages themselves, whole and
 * uncropped, drifting behind the copy that sends you to them. Decorative and
 * nothing else — it is aria-hidden, it is not a link, and every page it shows
 * is already a real card two panels down. A visitor who never sees it has
 * missed nothing.
 *
 * A row of cells rather than one picture, because the frames are `contain`:
 * a 2:3 page laid whole into one short wide band is a sliver in a sea of
 * nothing. Several of them across is a contact sheet, which is a thing, and
 * it is what the width is for.
 *
 * Three things keep a decorative animation from being a tax on the phone this
 * site is designed for:
 *
 *   - it runs on THUMBS. At cell width a 300px page is more than enough, and
 *     the drafts shelf and the start-here rail have already fetched these
 *     exact URLs, so the band usually costs nothing at all.
 *   - it only ticks while it is ON SCREEN, and it stops when scrolled past.
 *   - `prefers-reduced-motion` stops the slideshow rather than speeding it up.
 *     The global reduce rule flattens animation durations, which would leave a
 *     Ken Burns pan snapping between end states — worse than not moving. So the
 *     tick never starts and the band is one still contact sheet.
 */

/** ms a page holds before the crossfade to the next one begins */
const HOLD = 6000;
/** ms the crossfade takes; the outgoing frame keeps its src until it is over */
const FADE = 1400;
/** how many Ken Burns moves there are — see the kb-* keyframes in globals.css */
const MOVES = 5;
/** cells to lay out; the row is page-shaped, so the surplus runs off the ends */
const CELLS = 7;

/** the pair of page offsets the two layers hold, and which of the two is lit */
type Reeling = { at: [number, number]; front: 0 | 1 };

export function Reel({ pages }: { pages: string[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [{ at, front }, setState] = useState<Reeling>({ at: [0, 1], front: 0 });

  useEffect(() => {
    const el = host.current;
    if (!el || pages.length < 2) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let tick: ReturnType<typeof setInterval> | undefined;
    let swap: ReturnType<typeof setTimeout> | undefined;

    const advance = () => {
      setState((s) => {
        /* The layer going dark keeps the page it is still fading out, and picks
           up the one after next only once the fade has finished — swapping its
           src now would change the picture mid-dissolve. */
        clearTimeout(swap);
        swap = setTimeout(() => {
          setState((t) => {
            const dark = t.front === 0 ? 1 : 0;
            const at: [number, number] = [...t.at];
            at[dark] = (t.at[t.front] + 1) % pages.length;
            return { ...t, at };
          });
        }, FADE);
        return { at: s.at, front: s.front === 0 ? 1 : 0 };
      });
    };

    const io = new IntersectionObserver((entries) => {
      const seen = entries.at(-1)?.isIntersecting ?? false;
      if (seen && !tick) tick = setInterval(advance, HOLD);
      else if (!seen) { clearInterval(tick); tick = undefined; }
    }, { rootMargin: '120px' });
    io.observe(el);

    return () => {
      io.disconnect();
      clearInterval(tick);
      clearTimeout(swap);
    };
  }, [pages.length]);

  if (!pages.length) return null;

  /* Spread the cells across the run rather than starting them all at page one:
     four copies of the same drawing is a bug, not a backdrop. */
  const stride = Math.max(1, Math.round(pages.length / CELLS));

  return (
    <span className="reel" ref={host} aria-hidden="true">
      {Array.from({ length: CELLS }, (_, cell) => (
        <span className="reel__cell" key={cell}>
          {at.map((offset, slot) => {
            const page = (offset + cell * stride) % pages.length;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={slot}
                className="reel__frame"
                data-lit={slot === front ? 'on' : 'off'}
                /* The move goes with the page rather than with the layer, so
                   one cell never repeats a move every other slide, and no two
                   cells are on the same move at the same time. Changing the
                   attribute restarts the animation, and it restarts while the
                   layer is dark. */
                data-kb={page % MOVES}
                src={pages[page]}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            );
          })}
        </span>
      ))}
      <span className="reel__screen" />
    </span>
  );
}
