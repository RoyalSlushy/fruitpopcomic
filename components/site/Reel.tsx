'use client';

import { useEffect, useRef, useState } from 'react';

/* The backdrop under the hero: the pages themselves, panning slowly behind the
 * spread. Decorative and nothing else — it is aria-hidden, it is not a link,
 * and every page it shows is already reachable as a real card two panels down.
 * A visitor who never sees it has missed nothing.
 *
 * Three things keep a decorative animation from being a tax on the phone this
 * site is designed for:
 *
 *   - TWO layers, not ten. Each slide is a full 1080px page; holding all of
 *     them in the DOM would be several megabytes of decoration. The pair
 *     double-buffers instead — the dark one carries the next page, so it has a
 *     whole interval to load before it is ever shown.
 *   - it only runs while it is ON SCREEN. The band sits below the fold on a
 *     phone, so nothing here loads or ticks until the visitor scrolls to it,
 *     and it stops again when they scroll past.
 *   - `prefers-reduced-motion` stops the slideshow rather than speeding it up.
 *     The global reduce rule flattens animation durations, which would leave a
 *     Ken Burns pan snapping between end states — worse than not moving. So the
 *     tick never starts and the band is one still page.
 */

/** ms a page holds before the crossfade to the next one begins */
const HOLD = 6000;
/** ms the crossfade takes; the outgoing slide keeps its src until it is over */
const FADE = 1400;
/** how many Ken Burns moves there are — see the kb-* keyframes in globals.css */
const MOVES = 5;

/** the pair of page indices the two layers hold, and which of the two is lit */
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

  return (
    <div className="reel" ref={host} aria-hidden="true">
      {at.map((page, slot) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slot}
          className="reel__frame"
          data-lit={slot === front ? 'on' : 'off'}
          /* The move changes with the page, not with the slot, so the same
             layer does not repeat one pan every other slide. Changing the
             attribute restarts the animation, and it restarts while the layer
             is dark. */
          data-kb={page % MOVES}
          src={pages[page]}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ))}
      <span className="reel__screen" />
    </div>
  );
}
