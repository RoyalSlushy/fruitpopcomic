'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chevron, Glyph } from './Glyph.tsx';
import { AudioPlayer } from './AudioPlayer.tsx';
import { NoteTip } from './NoteTip.tsx';
import { PageScript } from './PageScript.tsx';
import { ListControls, ListAdd } from '../cms/ListControls.tsx';
import { ListDrag } from '../cms/ListDrag.tsx';
import { PageTools } from '../cms/PageTools.tsx';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
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

/* How far in a pinch can go. Four is roughly the point where a 1080px page
   stops holding up on a phone screen; below 1.02 the gesture has effectively
   ended and the page snaps back rather than sitting a hair off true. */
const MAX_ZOOM = 4;
const ZOOM_FLOOR = 1.02;
const clampZoom = (s: number) => Math.min(MAX_ZOOM, Math.max(1, s));

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

  const editing = useEditMode();

  const [idx, setIdx] = useState(start);
  const [drawer, setDrawer] = useState<null | 'pages' | 'script'>(null);
  const [bare, setBare] = useState(false);          // chrome hidden (immersive)
  const [tools, setTools] = useState(false);        // the editor's page sheet
  const [zoomed, setZoomed] = useState(false);      // pinched in past 1×
  const [cinema, setCinema] = useState(false);      // the page, and nothing else

  const view = useRef<HTMLElement>(null);
  const strip = useRef<HTMLElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  /* Whichever of the two things a page can be: the artwork, or the sheet a
     page that is written but not drawn gets. Only one is ever mounted, and
     zoom transforms whichever it is. */
  const media = useRef<HTMLElement | null>(null);

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

  /* ── zoom ───────────────────────────────────────────────────
     A comic page is 1080px of ink and the phone shows it at about a third of
     that, so the lettering in a corner panel is not readable at the size the
     page arrives. Pinch is the answer everyone already knows.

     It is written to the node for the same reason the swipe is: a setState per
     pointermove re-renders the script column and every thumbnail in the strip
     sixty times a second, and that is exactly what a pinch cannot afford.
     React learns one thing — whether we are zoomed at all — because the CSS
     needs to know, and that flips twice a gesture rather than sixty times.

     `translate` then `scale` as separate properties, which compose in that
     order: a point p sits at centre + offset + scale·p. Every line below is
     that one equation rearranged. */
  const zoom = useRef({ s: 1, x: 0, y: 0 });

  const paint = useCallback((ease = false) => {
    const el = media.current;
    if (!el) return;
    const { s, x, y } = zoom.current;
    el.style.transition = ease ? 'translate .2s var(--ease), scale .2s var(--ease)' : 'none';
    el.style.translate = s === 1 && !x && !y ? '' : `${x}px ${y}px`;
    el.style.scale = s === 1 ? '' : String(s);
    el.style.willChange = s > 1 ? 'translate, scale' : '';
  }, []);

  /* The page may be dragged until its edge reaches the frame's, and no
     further: past that it is being pushed into empty navy, and letting go of
     it there is how a reader loses the page entirely. */
  const rein = useCallback(() => {
    const el = media.current;
    const box = reader.current;
    if (!el || !box) return;
    const z = zoom.current;
    const mx = Math.max(0, (el.offsetWidth * z.s - box.clientWidth) / 2);
    const my = Math.max(0, (el.offsetHeight * z.s - box.clientHeight) / 2);
    z.x = Math.min(mx, Math.max(-mx, z.x));
    z.y = Math.min(my, Math.max(-my, z.y));
  }, []);

  /* Scale to `target`, keeping whatever sits under (fx, fy) under it still,
     and carry the focal point itself by (dx, dy) — which is how two fingers
     pan and zoom in the same move. */
  const zoomTo = useCallback((target: number, fx: number, fy: number, dx = 0, dy = 0) => {
    const el = media.current;
    if (!el) return;
    const z = zoom.current;
    const s = clampZoom(target);
    const k = s / z.s;
    const r = el.getBoundingClientRect();
    /* The untransformed centre: the rect is already scaled about it, so the
       offset comes back off to find where the page would sit at rest. */
    const cx = (r.left + r.right) / 2 - z.x;
    const cy = (r.top + r.bottom) / 2 - z.y;
    z.s = s;
    z.x = k * z.x + dx + (fx - cx) * (1 - k);
    z.y = k * z.y + dy + (fy - cy) * (1 - k);
    rein();
    paint();
    setZoomed(s > ZOOM_FLOOR);
  }, [paint, rein]);

  const unzoom = useCallback((ease = true) => {
    zoom.current = { s: 1, x: 0, y: 0 };
    paint(ease);
    setZoomed(false);
  }, [paint]);

  /* One press, two directions: fit the page if it is zoomed, otherwise double
     it about the middle of the frame. The continuous control is the pinch and
     ctrl-wheel; this is the mouse's version of it, and a mouse wants a step
     rather than a slider. */
  const zoomStep = useCallback(() => {
    const box = reader.current;
    if (!box) return;
    if (zoom.current.s > 1) { unzoom(); return; }
    const r = box.getBoundingClientRect();
    zoomTo(2, r.left + r.width / 2, r.top + r.height / 2);
  }, [unzoom, zoomTo]);

  /* ── cinematic ──────────────────────────────────────────────
     Real full screen, not a big div: the browser's own chrome is part of what
     is between the reader and the page, and only the Fullscreen API can take
     it. The attribute does the styling either way, so a browser that refuses
     the request — or has no element full screen at all, which is every iPhone
     — still gets the mode, just inside the window it already had. */
  const toggleCinema = useCallback(() => {
    const el = view.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setCinema(false));
      return;
    }
    /* Optimistic: the class goes on now, and the listener below corrects it
       if the request lands. Waiting on the promise would mean a mode that
       does not exist for browsers that refuse. */
    setCinema(true);
    el.requestFullscreen?.().catch(() => {});
  }, []);

  /* The browser owns the exit as much as the button does — Escape and F11 both
     leave full screen without asking us. */
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setCinema(false);
      else if (document.fullscreenElement === view.current) setCinema(true);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  /* Leaving full screen restores the chrome; entering it should not inherit a
     retracted one. And the editor's sheet is portalled into whichever root is
     showing, so it cannot survive the root changing under it. */
  useEffect(() => {
    setBare(false);
    setTools(false);
  }, [cinema]);

  /* Stable: the sheet holds a document listener that depends on it. */
  const closeTools = useCallback(() => setTools(false), []);

  /* Leaving edit mode with the sheet open would strand a piece of state
     nobody can see — PageTools renders nothing for a visitor — and the next
     tap would be spent dismissing something that is not there. */
  useEffect(() => { if (!editing) setTools(false); }, [editing]);

  useEffect(() => { setIdx(start); }, [start]);

  /* Clamp rather than trust: a page can be deleted under the editor. */
  const at = Math.max(0, Math.min(pages.length - 1, idx));
  const page = pages[at];

  const sibs = useMemo(() => siblings(chs, pages, at), [chs, pages, at]);
  const pos = sibs.findIndex((p) => p.index === at);
  const chapter = chapterOf(chs, page);
  /* 1-based, and 0 for a page that is in no chapter — the shelf lists those
     under "Unsorted", and an unsorted page has no number to give. */
  const chapterNo = chapter ? chs.findIndex((c) => c.id === chapter.id) + 1 : 0;

  const go = useCallback((flat: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, flat));
    setIdx(i);
    slide(null);
    /* Zoom belongs to the page you were on. It is cleared here rather than in
       an effect on the index because the <img> is the same node either way —
       React swaps the src, not the element — so a transform left on it would
       land the next page already three times life size and off centre. */
    unzoom(false);
    history.replaceState(null, '', `/read/${i + 1}`);
  }, [pages.length, slide, unzoom]);

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
      if (e.key === 'Escape' && zoom.current.s > 1) { unzoom(); return; }
      /* Only the fallback needs this: real full screen has already left by
         the time a keydown reaches us, and setCinema followed. */
      if (e.key === 'Escape' && cinema && !document.fullscreenElement) {
        setCinema(false);
        return;
      }
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
  }, [step, go, sibs, drawer, unzoom, cinema]);

  /* A trackpad pinch reaches the page as a wheel event with ctrlKey set, which
     is also how a browser is asked to zoom the whole document — so this is the
     one gesture that has to be taken from the browser rather than merely
     handled. React registers its own wheel listener passively and a passive
     listener may not preventDefault, hence the native one. */
  useEffect(() => {
    const box = reader.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoom.current.s * Math.exp(-e.deltaY / 180), e.clientX, e.clientY);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

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
      if (t?.closest('.timeline, .script, .rdock, .rtools')) return;
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

  /* Every finger currently on the page, by id. Two of them is a pinch and one
     of them on a zoomed page is a pan; neither is ever a page turn. */
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; x: number; y: number } | null>(null);
  /* Raised by any pinch or pan and lowered when the last finger leaves, so the
     release that ends one is never also read as a tap. */
  const moved = useRef(false);

  /** Span and midpoint of the first two live pointers, or null under two. */
  const pair = () => {
    const [a, b] = [...pts.current.values()];
    if (!a || !b) return null;
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pts.current.size === 0) moved.current = false;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    /* Capture, so a drag that wanders off the page still reports its moves and
       its release here instead of being silently dropped mid-turn. */
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    /* A second finger is a pinch, whatever the first one was doing. Half a
       swipe snaps back rather than turning the page under the zoom. */
    if (pts.current.size === 2) {
      drag.current.on = false;
      slide(null);
      pinch.current = pair();
      return;
    }
    /* A drawer or the editor's sheet is open: this press is dismissing it, not
       starting a gesture, and it must not also flip the chrome away. */
    if (drawer || tools) return;
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null, on: true };
  };

  const onMove = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (prev) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    /* Two fingers: the span sets the scale and the midpoint carries the page,
       so a pinch that drifts across the screen zooms and pans in one move. */
    if (pts.current.size >= 2) {
      const was = pinch.current;
      const now = pair();
      if (!now) return;
      pinch.current = now;
      if (was && was.d > 0) {
        moved.current = true;
        zoomTo(zoom.current.s * (now.d / was.d), was.x, was.y, now.x - was.x, now.y - was.y);
      }
      return;
    }

    /* Zoomed in, one finger moves the page around inside its frame instead of
       turning it. Turning while zoomed would be turning to a part of the next
       page nobody chose. */
    if (zoom.current.s > 1) {
      if (!prev) return;
      moved.current = true;
      zoom.current.x += e.clientX - prev.x;
      zoom.current.y += e.clientY - prev.y;
      rein();
      paint();
      return;
    }

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
    pts.current.delete(e.pointerId);
    if (pinch.current && pts.current.size < 2) {
      pinch.current = null;
      /* A pinch that came back to about life size is a pinch that was undone;
         it settles on true rather than a hair off it. */
      if (zoom.current.s <= ZOOM_FLOOR) unzoom();
    }

    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (moved.current) return;         // a pan or a pinch: not a turn, not a tap
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
    if (!d.axis && Math.abs(ax) < 8 && Math.abs(ay) < 8 && Date.now() - d.t < 400) tap();
  };

  /* The same tap, read against who is doing it. A reader wants the chrome out
     of the way; an editor wants the page's image and its script, and on a
     phone there is no hover for either of them to hide behind. */
  const tap = () => {
    if (editing) setTools(true);
    else setBare((v) => !v);
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
      ref={view}
      data-drawer={drawer ?? 'none'}
      data-bare={bare ? 'on' : 'off'}
      data-zoom={zoomed ? 'on' : 'off'}
      data-cinema={cinema ? 'on' : 'off'}
    >
      <div
        className="slab slab--bare"
        style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}
      >
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              {/* Back to the shelf, not to the site menu: the chapter list is
                  where this was opened from and where the next one is.

                  A mark rather than a word, because the room it was taking is
                  the chapter title's. The label it lost is still on it twice:
                  as an aria-label for a screen reader, and as a tip on hover
                  and on focus for everyone else. */}
              <Link
                className="btn btn--back btn--mark tipped"
                href="/read"
                aria-label="To Chapters"
                data-tip="To Chapters"
              >
                <Chevron dir="left" />
              </Link>
              <h1 className="panel__title">
                {chapter?.title ?? 'Read'}
                {/* Which chapter this is, next to what it is called. The title
                    is the creator's words and may not carry a number at all —
                    this one is the running order's, and always does. */}
                {chapterNo > 0 && (
                  <span className="panel__of">(Chapter {pad(chapterNo - 1)})</span>
                )}
              </h1>
              <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
              <AudioPlayer text={description} label="Describe" />
              <p className="panel__count">
                <span>{human}</span><span className="sep">/</span><span>{total}</span>
              </p>
            </div>

            <div className="stage">
              {/* Cinematic mode is the reason this has a handler at all. The
                  reader box shrink-wraps its page there so the script can sit
                  against it, which leaves bare field either side — and a tap
                  on the field is as much "put the chrome away" as a tap on the
                  page is. Only the field: a tap on the page, the script or the
                  flips has a target of its own and never reaches this. */}
              <div
                className="spread"
                onClick={(e) => { if (e.target === e.currentTarget) tap(); }}
              >
                <div
                  className="reader"
                  ref={reader}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={(e) => {
                    pts.current.delete(e.pointerId);
                    if (pts.current.size < 2) pinch.current = null;
                    drag.current.on = false;
                    slide(null);
                  }}
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
                          ref={(el) => { media.current = el; }}
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
                        <div className="sheet" ref={(el) => { media.current = el; }}>
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

                      {/* No caption. The page number was tipped over the top
                          corner of the artwork and said again in the bar, and
                          the count in the bar is the one that is never in the
                          way of the drawing. */}
                    </figure>

                    <button
                      className="flip flip--next" type="button" aria-label="Next page"
                      disabled={!canNext} onClick={() => step(1)}
                    >
                      <Chevron />
                    </button>
                  </div>

                  {/* The way back out of a zoom, for everyone who did not get
                      in with two fingers and cannot get out with them either —
                      a mouse, a keyboard, a trackpad that zoomed on ctrl-wheel.
                      It stops the press it receives, or the reader underneath
                      would read the same tap as "hide the chrome". */}
                  {zoomed && (
                    <button
                      className="zoomout"
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => unzoom()}
                    >
                      Fit page
                    </button>
                  )}
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
                      {/* Adds press-and-hold reordering to the list above it.
                          Renders nothing for a visitor, and the list needs to
                          know nothing about it. */}
                      <ListDrag listPath="pages.items" />
                    </ul>
                  </nav>
                </div>
              </div>
            </div>


            {/* The desktop's controls, and below 860px `display:none` — the
                dock underneath is the same three jobs in the phone's hands,
                so exactly one set is ever in the accessibility tree.

                The filmstrip lives behind the first of them now. Parked under
                the artwork it cost the page a hundred pixels of height on
                every page, to show ten thumbnails of pages you are not
                reading; a button costs nothing until it is pressed.

                In cinematic mode this row is the only chrome left, and it
                floats over the page rather than sitting under it. */}
            <div className="rtools">
              <button
                type="button"
                className={`rtool${drawer === 'pages' ? ' is-on' : ''}`}
                aria-expanded={drawer === 'pages'}
                onClick={() => setDrawer((d) => (d === 'pages' ? null : 'pages'))}
              >
                <Glyph name="grid" width={5} />
                Pages
              </button>

              <button
                type="button"
                className={`rtool${zoomed ? ' is-on' : ''}`}
                aria-pressed={zoomed}
                onClick={zoomStep}
              >
                <Glyph name="zoom" width={5} />
                {zoomed ? 'Fit page' : 'Zoom'}
              </button>

              {/* No page counter here. The bar above carries it, and on a
                  desktop the bar is never the thing that went away — the
                  phone's dock needs its own only because the bar's is
                  display:none there. */}
              <button
                type="button"
                className={`rtool${cinema ? ' is-on' : ''}`}
                aria-pressed={cinema}
                onClick={toggleCinema}
              >
                <Glyph name="cinema" width={5} />
                {cinema ? 'Exit' : 'Cinema'}
              </button>
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

            {/* The editor's sheet, raised by a tap on the page. Renders nothing
                for a visitor — the tap toggles the chrome for them and this
                component is not in their bundle. Keyed by the page, so paging
                with it open re-reads the page it is now over. */}
            {tools && page && (
              <PageTools
                key={page.id}
                index={at}
                page={human}
                image={page.image}
                thumb={page.thumb}
                script={page.script}
                onClose={closeTools}
              />
            )}

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
