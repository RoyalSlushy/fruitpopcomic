'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chevron, Glyph } from './Glyph.tsx';
import { Speak } from './Speak.tsx';
import { NoteTip } from './NoteTip.tsx';
import { PageScript } from './PageScript.tsx';
import { ListControls, ListAdd } from '../cms/ListControls.tsx';
import { useCmsValue } from '../../lib/cms-context.tsx';
import { chapterOf, isScriptPage, siblings } from '../../lib/chapters.ts';
import { scriptLines } from '../../lib/script.ts';
import { mediaURL, pad } from '../../lib/media.ts';
import type { Chapter, ComicPage } from '../../content/pages.ts';

/* The one sentence that stands in for a page nobody can read as text.
 *
 * Shared by the <img> alt and the read-aloud button so the two cannot drift.
 * When the creator writes alt text in the CMS it is used verbatim; until then
 * the fallback says plainly why there is nothing to read, rather than pretending
 * the lettering has been transcribed. */
function describe(page: ComicPage | undefined, n: number, total: number): string {
  if (!page) return '';
  if (page.alt) return page.alt;
  const head = `Page ${n} of ${total}${page.isDraft ? ' — rough draft' : ''}.`;
  if (isScriptPage(page)) {
    return page.script.trim()
      ? `${head} Not drawn yet — this page is its script.`
      : `${head} Blank: no drawing and no script yet.`;
  }
  return page.script.trim()
    ? `${head} Dialogue is lettered into the artwork; the script for this page is in the Script column.`
    : `${head} Dialogue is lettered into the artwork and cannot be read as text.`;
}

/** How far a drag has to travel before it counts as a page turn. */
const swipeThreshold = (w: number) => Math.min(90, Math.max(44, w * 0.18));

/* The reader.
 *
 * Paging is LOCAL STATE, not navigation. Routing per arrow press would refetch
 * an RSC payload for a page whose only change is an <img src>. /read/[n] is the
 * deep-link entry that sets the starting page; after that the URL is updated
 * with history.replaceState, which costs nothing and keeps the page shareable.
 *
 * Paging is scoped to the CHAPTER. The flat items array stays the running
 * order — it is what /read/[n] indexes into and what reordering moves things
 * within — and the chapter is a view over it, so the arrows stop at the
 * chapter's edges instead of sliding into the next one.
 *
 * On a phone this is a full-screen reader: the site chrome goes away, the page
 * gets the whole viewport, and everything else is behind a button. On a desktop
 * it stays the panel it was. Same markup either way — the drawers are the
 * timeline and the script column, repositioned. */
export function Reader({
  chapters, items, notice, start,
}: {
  chapters: Chapter[];
  items: ComicPage[];
  notice: string;
  start: number;
}) {
  /* Both lists are read through the CMS: reordering pages and adding chapters
     change them under the editor, and a server array would not move. */
  const chs = useCmsValue('pages.chapters', chapters);
  const pages = useCmsValue('pages.items', items);

  const [idx, setIdx] = useState(start);
  const [drawer, setDrawer] = useState<null | 'pages' | 'script'>(null);
  const [bare, setBare] = useState(false);          // chrome hidden (immersive)

  const strip = useRef<HTMLElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);

  /* The swipe offset is written straight to the node and never held in state.
     A setState per pointermove re-renders this whole component — the script
     column, ten filmstrip entries and their edit controls — sixty times a
     second, which is what made the drag stutter. Nothing here needs React
     until the page actually turns. */
  const slide = useCallback((px: number | null) => {
    const el = plate.current;
    if (!el) return;
    if (px === null) {
      el.style.transition = '';
      el.style.translate = '';
      el.style.willChange = '';
      return;
    }
    el.style.transition = 'none';
    el.style.willChange = 'translate';
    el.style.translate = `${px}px`;
  }, []);

  useEffect(() => { setIdx(start); }, [start]);

  /* Clamp rather than trust: a page can be deleted under the editor. */
  const at = Math.max(0, Math.min(pages.length - 1, idx));
  const page = pages[at];

  const sibs = useMemo(() => siblings(chs, pages, at), [chs, pages, at]);
  const pos = sibs.findIndex((p) => p.index === at);
  const chapter = chapterOf(chs, page);

  const go = useCallback((flat: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, flat));
    setIdx(i);
    slide(null);
    history.replaceState(null, '', `/read/${i + 1}`);
  }, [pages.length, slide]);

  /* Relative moves walk the CHAPTER, not the whole comic. */
  const step = useCallback((delta: number) => {
    const next = sibs[pos + delta];
    if (next) go(next.index);
  }, [sibs, pos, go]);

  const canPrev = pos > 0;
  const canNext = pos >= 0 && pos < sibs.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable) return;              // never steal keys mid-edit
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'Escape' && drawer) { setDrawer(null); return; }
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'Home') { e.preventDefault(); if (sibs[0]) go(sibs[0].index); }
      if (e.key === 'End') {
        e.preventDefault();
        const last = sibs.at(-1);
        if (last) go(last.index);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [step, go, sibs, drawer]);

  /* Keep the current page centred in the strip — but ONLY while the strip is
     a horizontal rail with somewhere to scroll. In the phone's drawer it is a
     grid that fits, and scrollIntoView on a box that cannot scroll walks up
     and scrolls an ancestor instead: the drawer shifted under the finger
     between pointerup and the click that follows it, so a tap on one
     thumbnail opened the one a row above. */
  useEffect(() => {
    const el = strip.current;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    el.querySelector<HTMLElement>(`[data-i="${at}"]`)?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [at, drawer]);

  /* Tapping away from an open drawer closes it. On pointerdown rather than on
     click, so it never races the compatibility mouse events a touch screen
     synthesises afterwards. The dock is excluded because its buttons toggle
     the drawer themselves and would otherwise close and reopen it. */
  useEffect(() => {
    if (!drawer) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.timeline, .script, .rdock')) return;
      setDrawer(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [drawer]);

  /* Full-screen on a phone means the page behind must not scroll under it.
     The rule itself is inside a media query, so this attribute is inert on a
     desktop and there is no matchMedia listener to keep in sync. */
  useEffect(() => {
    document.documentElement.dataset.reading = 'on';
    return () => { delete document.documentElement.dataset.reading; };
  }, []);

  /* ── swipe ──────────────────────────────────────────────────
     One gesture, three outcomes: a horizontal drag turns the page, a vertical
     one is left alone for the scroller (touch-action: pan-y), and a tap that
     went nowhere toggles the chrome. The axis is decided once, on the first
     10px, so a turn cannot start halfway through a scroll. */
  const drag = useRef({ x: 0, y: 0, t: 0, axis: null as null | 'x' | 'y', on: false });

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    /* A drawer is open: this press is dismissing it, not starting a gesture,
       and it must not also flip the chrome away. */
    if (drawer) return;
    /* Capture, so a drag that wanders off the page still reports its moves and
       its release here instead of being silently dropped mid-turn. */
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null, on: true };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const ax = e.clientX - d.x;
    const ay = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return;
      d.axis = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y';
    }
    if (d.axis !== 'x') return;
    /* Resist at the ends rather than refusing: the page still moves a little,
       which is what tells you there is nothing there. */
    const room = (ax < 0 && !canNext) || (ax > 0 && !canPrev);
    slide(room ? ax * 0.22 : ax);
  };

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const ax = e.clientX - d.x;
    const ay = e.clientY - d.y;

    if (d.axis === 'x') {
      if (Math.abs(ax) >= swipeThreshold(reader.current?.clientWidth ?? 360)) {
        step(ax < 0 ? 1 : -1);
        return;
      }
      slide(null);
      return;
    }
    /* A tap: no axis was ever decided and it did not linger. */
    if (!d.axis && Math.abs(ax) < 8 && Math.abs(ay) < 8 && Date.now() - d.t < 400) {
      setBare((v) => !v);
    }
  };

  const total = sibs.length;
  const human = pos + 1;
  const description = describe(page, human, total);
  const lines = useMemo(
    () => (page && isScriptPage(page) ? scriptLines(page.script) : []),
    [page],
  );

  return (
    <section
      className="view view--panel view--read"
      data-drawer={drawer ?? 'none'}
      data-bare={bare ? 'on' : 'off'}
    >
      <div
        className="slab slab--bare"
        style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}
      >
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              {/* Back to the shelf, not to the site menu: the chapter list is
                  where this was opened from and where the next one is. */}
              <Link className="btn btn--back" href="/read">
                <Chevron dir="left" />
                Chapters
              </Link>
              <h1 className="panel__title">{chapter?.title ?? 'Read'}</h1>
              <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
              <Speak text={description} label="Describe" />
              <p className="panel__count">
                <span>{human}</span><span className="sep">/</span><span>{total}</span>
              </p>
            </div>

            <div className="stage">
              <div className="spread">
                <div
                  className="reader"
                  ref={reader}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={() => { drag.current.on = false; slide(null); }}
                >
                  <div className="plate" ref={plate}>
                    <button
                      className="flip flip--prev" type="button" aria-label="Previous page"
                      disabled={!canPrev} onClick={() => step(-1)}
                    >
                      <Chevron dir="left" />
                    </button>

                    <figure className="page">
                      {page && !isScriptPage(page) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaURL(page.image)} alt={description}
                          width={1080} height={1620}
                          /* Chromium starts a native image drag on pointerdown,
                             which fires pointercancel and kills the swipe
                             before it has moved a pixel. */
                          draggable={false}
                        />
                      )}

                      {/* A page that is written but not drawn. It is laid out as
                          a page rather than as a gap, because that is what it is
                          in the running order — the chapter can be built before
                          it is drawn. */}
                      {page && isScriptPage(page) && (
                        <div className="sheet">
                          <p className="sheet__tag">Not drawn yet</p>
                          {lines.length > 0 ? (
                            <ol className="sheet__lines">
                              {lines.map((l) => (
                                <li key={l.i} data-kind={l.kind}>
                                  {l.who && <b>{l.who}</b>}
                                  <span>{l.text}</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="sheet__none">
                              This page is blank. No drawing, and no script written
                              for it yet.
                            </p>
                          )}
                        </div>
                      )}

                      <figcaption className="page__tag">
                        {page?.isDraft ? 'Draft' : 'Page'} {pad(pos)}
                        <span className="page__of">/ {pad(total - 1)}</span>
                      </figcaption>
                    </figure>

                    <button
                      className="flip flip--next" type="button" aria-label="Next page"
                      disabled={!canNext} onClick={() => step(1)}
                    >
                      <Chevron />
                    </button>
                  </div>
                </div>

                {/* A drawn page's script sits beside it. A script PAGE is
                    already the script, so it does not get a second copy. */}
                {page && !isScriptPage(page) && (
                  <PageScript
                    key={page.id}
                    index={at}
                    page={human}
                    script={page.script}
                    isDraft={page.isDraft}
                  />
                )}
              </div>

              <div className="timeline">
                <div className="timeline__rail" aria-hidden="true">
                  <span style={{ inlineSize: `${(human / Math.max(1, total)) * 100}%` }} />
                </div>

                <div className="timeline__clip">
                  <nav className="filmstrip" ref={strip} aria-label="Pages in this chapter">
                    <ul className="filmstrip__list">
                      {sibs.map((p, n) => (
                        <li key={p.page.id}>
                          <button
                            type="button"
                            data-i={p.index}
                            aria-label={`Page ${n + 1}`}
                            aria-current={p.index === at ? 'true' : 'false'}
                            /* Both, and deliberately. The drawer is a fixed
                               element nested several levels inside the panel,
                               and Chromium hit-tests the real pointer stream
                               and the compatibility mouse events it synthesises
                               after touchend differently: pointerdown/up land
                               on the thumbnail, the click that follows falls
                               through to the page behind. onClick alone was
                               therefore dead to a finger while working from a
                               keyboard; onPointerUp alone would be dead to a
                               keyboard. go() is idempotent, so when both do
                               fire the second is a no-op. */
                            onPointerUp={() => go(p.index)}
                            onClick={() => go(p.index)}
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
                          {/* Reordering moves the page in the FLAT running
                              order, which is the thing /read/[n] indexes. */}
                          <ListControls listPath="pages.items" index={p.index} length={pages.length} />
                        </li>
                      ))}
                      <li className="filmstrip__add">
                        <ListAdd listPath="pages.items" length={pages.length} />
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>


            {/* The phone's controls. display:none above 860px, so exactly one
                set of controls is ever in the accessibility tree. */}
            <div className="rdock">
              <button
                type="button"
                className={`rdock__btn${drawer === 'pages' ? ' is-on' : ''}`}
                aria-expanded={drawer === 'pages'}
                onClick={() => setDrawer((d) => (d === 'pages' ? null : 'pages'))}
              >
                <Glyph name="grid" width={5} />
                Pages
              </button>

              <span className="rdock__count">
                <b>{human}</b> / {total}
              </span>

              {page && !isScriptPage(page) && (
                <button
                  type="button"
                  className={`rdock__btn${drawer === 'script' ? ' is-on' : ''}`}
                  aria-expanded={drawer === 'script'}
                  onClick={() => setDrawer((d) => (d === 'script' ? null : 'script'))}
                >
                  <Glyph name="script" width={5} />
                  Script
                </button>
              )}
            </div>

            {/* Paging never moves focus — that would yank a keyboard visitor
                off the arrow they are holding — so the change is announced
                rather than being silent. */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Page {human} of {total}
              {chapter ? ` in ${chapter.title}` : ''}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
