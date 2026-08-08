'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chevron, Glyph } from './Glyph.tsx';
import { Speak } from './Speak.tsx';
import { VoiceMenu } from './VoiceMenu.tsx';
import { NoteTip } from './NoteTip.tsx';
import { PageScript } from './PageScript.tsx';
import { ScriptSheet } from './ScriptSheet.tsx';
import { Theatre } from './Theatre.tsx';
import { PageRail } from './PageRail.tsx';
import { PageTools } from '../cms/PageTools.tsx';
import { PageMenu } from '../cms/PageMenu.tsx';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { chapterOf, isScriptPage, siblings } from '../../lib/chapters.ts';
import { effectiveSnippets, hasScript, pageLines } from '../../lib/script.ts';
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
  /* Beats, not panels: a page of empty headings has nothing to read aloud, so
     it must still describe itself as unwritten. */
  const written = hasScript(pageLines(effectiveSnippets(page.snippets, page.script)));
  if (isScriptPage(page)) {
    return written
      ? `${head} Not drawn yet — this page is its script.`
      : `${head} Blank: no drawing and no script yet.`;
  }
  return written
    ? `${head} Dialogue is lettered into the artwork; the script for this page is in the Script column.`
    : `${head} Dialogue is lettered into the artwork and cannot be read as text.`;
}

/** How far a drag has to travel before it counts as a page turn. */
const swipeThreshold = (w: number) => Math.min(90, Math.max(44, w * 0.18));

/* …or how fast, in px per ms. Distance alone is the wrong test for a thumb: a
   flick is short and quick by nature, so a reader who snapped the page 40px
   across in 40ms clearly meant to turn it and was being told they had not
   travelled far enough. Either test passing turns the page. 0.45px/ms is about
   450px/s — well above a considered drag, well below a real flick. */
const FLICK = 0.45;

/* How far back the speed is measured over. Not "between the last two moves":
   a pointer stream is not evenly spaced, and the final sample before a release
   is routinely a long slow frame — 8px over 21ms where the four before it were
   8px over 8. Read off that one sample the flick above came out at 0.38 and the
   page stayed put. Over a window it is 0.86, which is what the thumb did. */
const TRAIL = 120;

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
  const [held, setHeld] = useState<number | null>(null);  // the held page's menu
  const [zoomed, setZoomed] = useState(false);      // pinched in past 1×
  const [cinema, setCinema] = useState(false);      // the page, and nothing else
  const [theatre, setTheatre] = useState(false);    // the page, its words, read straight through
  /* Which pages have actually been opened, by id rather than by index — the
     editor can reorder the running order underneath this, and a set of
     positions would then be a set of claims about the wrong pages. */
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

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

  /* Back to centre with NO animation, for the frame the page actually changes
     on. `slide(null)` restores the stylesheet's transition, which is right for
     a drag that snapped back and wrong here: the plate is parked a page-width
     off to one side at that moment, and letting it ease home would drag the
     page that just arrived back across the screen from the wrong side. */
  const recentre = useCallback(() => {
    const el = plate.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.translate = '';
    el.style.willChange = '';
    void el.offsetHeight;                       // flush, so 'none' is observed
    el.style.transition = '';
  }, []);

  /* True from the moment a swipe commits until the outgoing page has finished
     leaving. A second gesture landing inside that window would fight the
     animation for the same `translate`. */
  const turning = useRef(false);

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

  /* Stable: the sheets hold document listeners that depend on them. */
  const closeTools = useCallback(() => setTools(false), []);
  const closeHeld = useCallback(() => setHeld(null), []);

  /* A page held in the filmstrip and let go without moving is asking what else
     it can do — ListDragImpl decides which of the two gestures happened and
     says so here. The event rather than a prop is what keeps the drag's code
     free of any idea what an item IS. */
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const onHold = (e: Event) => {
      const at = (e as CustomEvent<{ listPath: string; index: number }>).detail;
      if (at?.listPath === 'pages.items') setHeld(at.index);
    };
    el.addEventListener('cms:hold', onHold);
    return () => el.removeEventListener('cms:hold', onHold);
  }, []);

  /* Leaving edit mode, or paging away, with the menu open would strand it over
     a page nobody is looking at. */
  useEffect(() => { if (!editing) setHeld(null); }, [editing]);

  /* Leaving edit mode with the sheet open would strand a piece of state
     nobody can see — PageTools renders nothing for a visitor — and the next
     tap would be spent dismissing something that is not there. */
  useEffect(() => { if (!editing) setTools(false); }, [editing]);

  useEffect(() => { setIdx(start); }, [start]);

  /* Clamp rather than trust: a page can be deleted under the editor. */
  const at = Math.max(0, Math.min(pages.length - 1, idx));
  const page = pages[at];

  /* Landing on a page is what marks it read. Skipping past it is not: the
     strip dims by this set, and a reader who jumped from one to eight has not
     seen the six in between however far behind them they now are. */
  useEffect(() => {
    const id = page?.id;
    if (!id) return;
    setSeen((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, [page?.id]);

  const sibs = useMemo(() => siblings(chs, pages, at), [chs, pages, at]);
  const pos = sibs.findIndex((p) => p.index === at);
  const chapter = chapterOf(chs, page);
  /* 1-based, and 0 for a page that is in no chapter — the shelf lists those
     under "Unsorted", and an unsorted page has no number to give. */
  const chapterNo = chapter ? chs.findIndex((c) => c.id === chapter.id) + 1 : 0;

  /* The page has changed: whatever offset carried it here is spent. Runs after
     the DOM holds the new page and before anything is painted, so the swap and
     the return to centre are the same frame. */
  useLayoutEffect(() => { recentre(); }, [at, recentre]);

  const go = useCallback((flat: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, flat));
    setIdx(i);
    /* Zoom belongs to the page you were on. It is cleared here rather than in
       an effect on the index because the <img> is the same node either way —
       React swaps the src, not the element — so a transform left on it would
       land the next page already three times life size and off centre. */
    unzoom(false);
    history.replaceState(null, '', `/read/${i + 1}`);
  }, [pages.length, unzoom]);

  /* Relative moves walk the CHAPTER, not the whole comic.
     Reports whether it actually moved, which is how theatre mode knows the
     show has reached the end of the chapter rather than silently replaying
     the last page. */
  const stepTo = useCallback((delta: number) => {
    const next = sibs[pos + delta];
    if (!next) return false;
    go(next.index);
    return true;
  }, [sibs, pos, go]);

  const step = useCallback((delta: number) => { stepTo(delta); }, [stepTo]);

  /* ── the turn ───────────────────────────────────────────────
     A swipe carries the page off and brings its neighbour in from the other
     side, because the neighbour is already drawn there — see .peek below. The
     flips and the arrow keys still go straight to go(): a press is a jump, and
     animating it would put a fifth of a second between the press and the page.

     Falls back to a plain jump wherever the neighbours are not laid out, which
     is every width above 860px. That check is offsetParent rather than a
     matchMedia: the stylesheet decides where the carousel exists, and asking
     the element is how this stays a single source of that truth. */
  const turn = useCallback((dir: 1 | -1) => {
    const el = plate.current;
    const next = sibs[pos + dir];
    if (!next) { slide(null); return; }

    const peek = el?.querySelector<HTMLElement>(`.peek--${dir > 0 ? 'next' : 'prev'}`);
    if (!el || !peek?.offsetParent) { go(next.index); return; }

    /* Exactly where the neighbour is sitting, so it lands dead centre rather
       than near it — the gap is a CSS value and this is it, not a copy. */
    const gap = parseFloat(getComputedStyle(el).getPropertyValue('--peek-gap')) || 0;
    const span = el.offsetWidth + gap;

    turning.current = true;
    el.style.transition = 'translate .28s var(--ease)';
    el.style.willChange = 'translate';
    el.style.translate = `${-dir * span}px`;

    let done = false;
    const land = () => {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', land);
      clearTimeout(bail);
      turning.current = false;
      go(next.index);                     // the layout effect above recentres
    };
    el.addEventListener('transitionend', land);
    /* transitionend does not fire if the property never actually animates —
       a reduced-motion override, or a turn queued while the tab is hidden. */
    const bail = setTimeout(land, 420);
  }, [sibs, pos, go, slide]);

  const canPrev = pos > 0;
  const canNext = pos >= 0 && pos < sibs.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* Theatre mode is a room of its own and handles its own keys. */
      if (theatre) return;
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
  }, [step, go, sibs, drawer, unzoom, cinema, theatre]);

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

  /* The tail of the drag, kept so the release can ask how fast the finger was
     moving rather than only how far it got. Trimmed to TRAIL as it goes, so
     the answer is always about the end of the gesture — a drag that dawdled
     and then snapped away is a flick, and one that raced and then stopped
     dead to look at something is not. */
  const trail = useRef<{ x: number; t: number }[]>([]);

  const flickSpeed = () => {
    const tr = trail.current;
    const last = tr.at(-1);
    const first = tr[0];
    if (!last || !first || tr.length < 2) return 0;
    const dt = last.t - first.t;
    return dt > 0 ? (last.x - first.x) / dt : 0;
  };

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
    /* A page is still on its way out. Taking the plate's translate off it now
       would strand the outgoing page mid-screen. */
    if (turning.current) return;
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
    trail.current = [{ x: e.clientX, t: performance.now() }];
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

    const now = performance.now();
    const tr = trail.current;
    tr.push({ x: e.clientX, t: now });
    /* Two samples are the minimum a speed can be read from, so the trim keeps
       one that has already fallen out of the window rather than emptying the
       trail on a slow frame. */
    while (tr.length > 2 && now - (tr[1]?.t ?? now) > TRAIL) tr.shift();

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
      const dir = ax < 0 ? 1 : -1;
      /* Far enough OR fast enough, and the flick only counts when it was still
         travelling the way the page went — a drag hauled out and thrown back
         is a change of mind, not a turn. */
      const far = Math.abs(ax) >= swipeThreshold(reader.current?.clientWidth ?? 360);
      const v = flickSpeed();
      const fast = Math.abs(v) >= FLICK && Math.sign(v) === -dir;
      if (far || fast) { turn(dir); return; }
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

  /* The two neighbours the carousel shows the edge of. A page that is written
     but not drawn has no artwork to peek at, so it comes through as a blank
     sheet rather than as a hole where a page should be. */
  const peeks = useMemo(() => (
    ([[-1, 'prev'], [1, 'next']] as const)
      .map(([d, side]) => {
        const s = sibs[pos + d];
        if (!s) return null;
        return {
          key: s.page.id,
          side,
          image: isScriptPage(s.page) ? '' : mediaURL(s.page.image),
        };
      })
      .filter((p): p is { key: string; side: 'prev' | 'next'; image: string } => p !== null)
  ), [sibs, pos]);

  const total = sibs.length;
  const human = pos + 1;
  const description = describe(page, human, total);

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
                {/* The number leads, and it is only the number. `Chapter 01`
                    beside a title already called `The drafts` said the word
                    twice and put the count where it had to be read past; two
                    digits in front of the name index it the way the shelf and
                    the filmstrip already do. The title is the creator's words
                    and may not carry a number at all — this one is the running
                    order's, and always does. */}
                {chapterNo > 0 && (
                  <span className="panel__of">{pad(chapterNo - 1)}</span>
                )}
                {chapter?.title ?? 'Read'}
              </h1>
              <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
              <Speak text={description} label="Describe" />
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
                    {/* The pages either side, parked just off the plate's own
                        edges so a drag reveals them instead of pulling the
                        current page across empty navy. Decorative and
                        aria-hidden: the page you are on is the one in the
                        document, and these are the same two pages the flips
                        and the filmstrip already reach.

                        display:none above 860px, where the flips live in that
                        gutter and the reader turns pages by pressing rather
                        than by dragging. */}
                    {peeks.map((p) => (
                      <span
                        key={p.key}
                        className={`peek peek--${p.side}`}
                        aria-hidden="true"
                      >
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" width={1080} height={1620} draggable={false} />
                        ) : (
                          <span className="peek__sheet" />
                        )}
                      </span>
                    ))}

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

                      {page && isScriptPage(page) && (
                        <ScriptSheet
                          key={page.id}
                          index={at}
                          script={page.script}
                          snippets={page.snippets ?? []}
                          audio={page.audio ?? []}
                          mediaRef={(el) => { media.current = el; }}
                        />
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
                    script={page.script}
                    snippets={page.snippets ?? []}
                    audio={page.audio ?? []}
                    onTheatre={() => setTheatre(true)}
                  />
                )}
              </div>

              <div className="timeline">
                {/* Which chapter this strip is of. It is the phone's only copy
                    of the title now — the top bar that used to carry it has
                    folded into the dock — and this is where it earns its
                    pixels rather than taxing every page turn for it.
                    display:none above 860px, where the bar is still there. */}
                <p className="timeline__of">
                  {chapterNo > 0 && <span>{pad(chapterNo - 1)}</span>}
                  {chapter?.title ?? 'Read'}
                  {/* The standing notice comes with it. It is a fact about the
                      whole comic — these are drafts — which makes it something
                      to meet once beside the chapter, not a button parked in
                      the chrome of every page for the life of the read. */}
                  <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
                </p>

                <div className="timeline__rail" aria-hidden="true">
                  <span style={{ inlineSize: `${(human / Math.max(1, total)) * 100}%` }} />
                </div>

                <div className="timeline__clip">
                  <nav className="filmstrip" aria-label="Pages in this chapter">
                    <PageRail
                      pages={sibs}
                      at={at}
                      seen={seen}
                      total={pages.length}
                      onPick={go}
                      stripRef={strip}
                    />
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

            {/* The phone's controls — and on a phone this is the ONLY bar.
                The header above is display:none below 860px, and everything
                on it that a reader still needs is here instead: the way back
                to the chapters, the note, and read-aloud.

                Two bars cost 158px of a 844px screen to say the same things
                twice — the count was on both — and they bracketed the artwork
                so the page could never be more than the gap between them. One
                bar, at the end a thumb is already at, is 60px.

                display:none above 860px, so exactly one set of controls is
                ever in the accessibility tree. */}
            <div className="rdock">
              {/* Bare: the glyph and nothing round it. Every other mark on
                  this bar is a pill because pressing it changes what the bar
                  is showing; this one leaves. A button that goes somewhere
                  else does not need to look like it belongs to the row. */}
              <Link
                className="rdock__back tipped"
                href="/read"
                aria-label="To Chapters"
                data-tip="To Chapters"
              >
                <Chevron dir="left" />
              </Link>

              {/* Both forms of the count are in the markup and the stylesheet
                  picks one. With room, the word labels the button and the
                  count stands beside it, which is what the bar has always
                  said. On a short viewport — a phone turned sideways, where
                  the bar is a bigger share of what is left — they fold into
                  one and the number becomes the label.

                  Both are aria-hidden and the button is just `Pages`: the page
                  number is already announced by the live region at the bottom
                  of this component, and saying it twice in two places is how
                  the two get to disagree. */}
              <button
                type="button"
                className={`rdock__btn${drawer === 'pages' ? ' is-on' : ''}`}
                aria-expanded={drawer === 'pages'}
                aria-label="Pages"
                onClick={() => setDrawer((d) => (d === 'pages' ? null : 'pages'))}
              >
                <Glyph name="grid" width={5} />
                <span className="rdock__label">Pages</span>
                <span className="rdock__count rdock__count--in" aria-hidden="true">
                  <b>{human}</b> / {total}
                </span>
              </button>

              <span className="rdock__count" aria-hidden="true">
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
                  <span className="rdock__label">Script</span>
                </button>
              )}

              {/* One gear rather than a speak button and a picker beside it.
                  Read-aloud is the only thing this reader has to set, so the
                  panel is the settings, and the button that starts it is the
                  first thing inside — the action and the preferences it obeys
                  in the same place, for the price of one slot in the bar. */}
              <VoiceMenu
                className="vm--dock"
                glyph="settings"
                label="Settings"
                head="Read aloud"
              >
                <Speak text={description} label="Describe" picker={false} />
              </VoiceMenu>
            </div>

            {/* The editor's sheet, raised by a tap on the page. Renders nothing
                for a visitor — the tap toggles the chrome for them and this
                component is not in their bundle. Keyed by the page, so paging
                with it open re-reads the page it is now over. */}
            {/* What a held page offers. `held` is an index into the flat
                running order, which is what the strip's buttons carry and what
                the list operations take. */}
            {held !== null && pages[held] && (
              <PageMenu
                key={pages[held].id}
                listPath="pages.items"
                index={held}
                page={sibs.findIndex((s) => s.index === held) + 1 || held + 1}
                chapter={pages[held].chapter}
                onEdit={() => { go(held); setTools(true); }}
                onClose={closeHeld}
              />
            )}

            {tools && page && (
              <PageTools
                key={page.id}
                index={at}
                page={human}
                image={page.image}
                thumb={page.thumb}
                script={page.script}
                snippets={page.snippets ?? []}
                audio={page.audio ?? []}
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

      {/* Fixed over everything, and mounted last so it needs no z-index race
          with the drawers it covers. */}
      {theatre && (
        <Theatre
          pages={sibs.map((sb) => sb.page)}
          at={pos}
          onPage={stepTo}
          onClose={() => setTheatre(false)}
        />
      )}
    </section>
  );
}
