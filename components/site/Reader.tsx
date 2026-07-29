'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chevron } from './Glyph.tsx';
import { EditableText } from '../cms/EditableText.tsx';
import { mediaURL } from '../../lib/media.ts';
import type { ComicPage } from '../../content/pages.ts';

/* The reader.
 *
 * Paging is LOCAL STATE, not navigation. Routing per arrow press would refetch
 * an RSC payload for a page whose only change is an <img src>. /read/[n] is the
 * deep-link entry that sets the starting page; after that the URL is updated
 * with history.replaceState, which costs nothing and keeps the page shareable. */
export function Reader({
  pages, notice, start,
}: {
  pages: ComicPage[];
  notice: string;
  start: number;
}) {
  const [idx, setIdx] = useState(start);
  const strip = useRef<HTMLElement>(null);

  useEffect(() => { setIdx(start); }, [start]);

  const go = useCallback((next: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, next));
    setIdx(i);
    history.replaceState(null, '', `/read/${i + 1}`);
  }, [pages.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable) return;              // never steal keys mid-edit
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [idx, go]);

  useEffect(() => {
    const btn = strip.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    btn?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [idx]);

  const page = pages[idx];

  return (
    <section className="view view--panel">
      <div
        className="panel"
        style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}
      >
        <div className="panel__bar">
          <Link className="btn btn--back" href="/">Menu</Link>
          <h1 className="panel__title">Read</h1>
          <p className="panel__count">
            <span>{idx + 1}</span><span className="sep">/</span><span>{pages.length}</span>
          </p>
        </div>

        <EditableText as="p" className="notice" path="about.reader.notice" value={notice} multiline />

        <div className="reader">
          <button
            className="nav nav--prev" type="button" aria-label="Previous page"
            disabled={idx === 0} onClick={() => go(idx - 1)}
          >
            <Chevron dir="left" />
          </button>

          <figure className="page">
            {page ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaURL(page.image)}
                alt={page.alt ||
                  `Page ${idx + 1} of ${pages.length}${page.isDraft ? ' — rough draft' : ''}. ` +
                  'Dialogue is lettered into the artwork and cannot be read as text.'}
                width={1080}
                height={1620}
              />
            ) : null}
            <figcaption className="page__tag">{page?.isDraft ? 'Draft' : 'Page'}</figcaption>
          </figure>

          <button
            className="nav nav--next" type="button" aria-label="Next page"
            disabled={idx >= pages.length - 1} onClick={() => go(idx + 1)}
          >
            <Chevron />
          </button>
        </div>

        <nav className="filmstrip" ref={strip} aria-label="All pages">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              data-i={i}
              aria-label={`Page ${i + 1}`}
              aria-current={i === idx ? 'true' : 'false'}
              onClick={() => go(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaURL(p.thumb || p.image)} alt="" width={52} height={78} loading="lazy" />
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
