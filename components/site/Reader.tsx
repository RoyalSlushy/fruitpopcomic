'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chevron } from './Glyph.tsx';
import { Speak } from './Speak.tsx';
import { NoteTip } from './NoteTip.tsx';
import { PageScript } from './PageScript.tsx';
import { mediaURL } from '../../lib/media.ts';
import type { ComicPage } from '../../content/pages.ts';

/* The one sentence that stands in for a page nobody can read as text.
 *
 * Shared by the <img> alt and the read-aloud button so the two cannot drift.
 * When the creator writes alt text in the CMS it is used verbatim; until then
 * the fallback says plainly why there is nothing to read, rather than pretending
 * the lettering has been transcribed. Where a script HAS been written the last
 * clause changes: it stops apologising and points at the transcript, because
 * the page is genuinely readable then. */
function describe(page: ComicPage | undefined, idx: number, total: number): string {
  if (!page) return '';
  if (page.alt) return page.alt;
  const head = `Page ${idx + 1} of ${total}${page.isDraft ? ' — rough draft' : ''}.`;
  return page.script?.trim()
    ? `${head} Dialogue is lettered into the artwork; the script for this page is in the Script column.`
    : `${head} Dialogue is lettered into the artwork and cannot be read as text.`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/* The reader.
 *
 * Paging is LOCAL STATE, not navigation. Routing per arrow press would refetch
 * an RSC payload for a page whose only change is an <img src>. /read/[n] is the
 * deep-link entry that sets the starting page; after that the URL is updated
 * with history.replaceState, which costs nothing and keeps the page shareable.
 *
 * Three things are revealed rather than parked on screen — the standing note,
 * the page flips, and the timeline — so the artwork gets the room instead. Each
 * of them also appears on focus, is labelled or announced for a screen reader,
 * and is permanently visible where there is no hover to speak of
 * (`@media (hover: none)`). A control that exists only under a mouse pointer is
 * a control half the visitors do not have. */
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
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
      /* Home and End on a ten-page comic cost nothing to add and are what
         anyone navigating by keyboard will already try. */
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(pages.length - 1); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [idx, go, pages.length]);

  useEffect(() => {
    const btn = strip.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    btn?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [idx]);

  const page = pages[idx];
  const description = describe(page, idx, pages.length);

  return (
    <section className="view view--panel">
      <div
        className="slab slab--bare"
        style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}
      >
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">Read</h1>
              <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
              <Speak text={description} label="Describe" />
              <p className="panel__count">
                <span>{idx + 1}</span><span className="sep">/</span><span>{pages.length}</span>
              </p>
            </div>

            {/* The hover host for the flips and the timeline, and the size
                container the script column reads. Whether there is room for a
                second column is a question about THIS box, not about the
                viewport — the rail takes 238px off one and not the other. */}
            <div className="stage">
              <div className="spread">
                <div className="reader">
                  {/* .plate shrink-wraps the page, so the flips sit against
                      its edges rather than stranded at the sides of a column
                      a portrait page never fills. */}
                  <div className="plate">
                    <button
                      className="flip flip--prev" type="button" aria-label="Previous page"
                      disabled={idx === 0} onClick={() => go(idx - 1)}
                    >
                      <Chevron dir="left" />
                    </button>

                    <figure className="page">
                      {page ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaURL(page.image)}
                          alt={description}
                          width={1080}
                          height={1620}
                        />
                      ) : null}
                      <figcaption className="page__tag">
                        {page?.isDraft ? 'Draft' : 'Page'} {pad(idx + 1)}
                        <span className="page__of">/ {pad(pages.length)}</span>
                      </figcaption>
                    </figure>

                    <button
                      className="flip flip--next" type="button" aria-label="Next page"
                      disabled={idx >= pages.length - 1} onClick={() => go(idx + 1)}
                    >
                      <Chevron />
                    </button>
                  </div>
                </div>

                {page && (
                  <PageScript
                    key={page.id}
                    index={idx}
                    page={idx + 1}
                    script={page.script}
                    isDraft={page.isDraft}
                  />
                )}
              </div>

              <div className="timeline">
                {/* Always visible, and the only part that is: a bare progress
                    bar doubles as the affordance saying the strip is under it. */}
                <div className="timeline__rail" aria-hidden="true">
                  <span style={{ inlineSize: `${((idx + 1) / pages.length) * 100}%` }} />
                </div>

                <div className="timeline__clip">
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
                        <span className="film__n" aria-hidden="true">{pad(i + 1)}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>

            {/* Paging never moves focus — that would yank a keyboard visitor
                off the arrow they are holding — so the change is announced
                rather than being silent. */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Page {idx + 1} of {pages.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
