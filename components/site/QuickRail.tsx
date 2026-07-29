'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Chevron } from './Glyph.tsx';

/* The horizontal quick-access rail and its scroll control. Client only because
   of the scroll; the tiles inside are server-rendered children. */
export function QuickRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  const sync = useCallback(() => {
    const el = rail.current;
    if (el) setScrollable(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    sync();
    addEventListener('resize', sync);
    return () => removeEventListener('resize', sync);
  }, [sync]);

  const nudge = () => {
    const el = rail.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: atEnd ? -el.scrollWidth : el.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <>
      <div className="quick__rail" ref={rail}>{children}</div>
      <button
        className="nav nav--rail"
        type="button"
        aria-label="Scroll quick access"
        onClick={nudge}
        disabled={!scrollable}
      >
        <Chevron />
      </button>
    </>
  );
}
