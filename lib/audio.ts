/* The one <audio> element, and the rules for keeping it playable.
 *
 * Split out of lib/tts.ts so that file stays about the QUEUE rather than about
 * media events. It owns three things browsers make awkward:
 *
 * 1. THE GESTURE. A page's first playback must start inside a real click or
 *    the element is never blessed and every later play() rejects. The obvious
 *    version — "the first clip plays inside the click" — is wrong: on a page
 *    whose first line is unrecorded, the click synthesises line 1, the gesture
 *    ends, and the clip at line 4 hits a cold element. So unlock() is called
 *    from the button itself, unconditionally, and plays a silent source to get
 *    the blessing regardless of what the queue does next. play() on a
 *    src-less element rejects, so the silent source is load-bearing.
 *
 * 2. ONE ELEMENT, REUSED. A fresh `new Audio()` per clip is a fresh unblessed
 *    element every time. The src is swapped instead — and never swapped to '',
 *    which fires a spurious MEDIA_ELEMENT_ERROR rather than going quiet.
 *
 * 3. FAILURE IS NORMAL. A deleted storage object, a codec the browser will not
 *    take, or an autoplay rejection all mean the same thing to the caller:
 *    this clip cannot play, say the line instead. They arrive by three
 *    different routes and are funnelled into one onFail.
 *
 * Constructed lazily. These modules are imported by 'use client' components
 * that still execute during prerender, so touching `document` at module scope
 * would break the build.
 */

import { mediaURL } from './media.ts';

/* 44 bytes: a RIFF header describing zero samples. Enough for the element to
   consider itself loaded, short enough to cost nothing, and silent so the
   blessing is inaudible. */
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

let el: HTMLAudioElement | null = null;
let next: HTMLAudioElement | null = null;
let blessed = false;

export const canPlayClips = () => typeof window !== 'undefined' && 'Audio' in window;

function element(): HTMLAudioElement | null {
  if (!canPlayClips()) return null;
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    /* Speeding a recording up should not turn the creator into a chipmunk. */
    el.preservesPitch = true;
  }
  return el;
}

/** Bless the element for later programmatic playback.
 *
 *  MUST be called synchronously from a user gesture — a click handler, not an
 *  effect or a promise callback. Idempotent and cheap after the first time. */
export function unlock() {
  if (blessed) return;
  const a = element();
  if (!a) return;
  blessed = true;
  a.src = SILENCE;
  /* Both halves can reject in a browser that is unhappy; neither failure is
     worth reporting, because the real play() will report for itself. */
  a.play().then(() => a.pause()).catch(() => {});
}

/** Play one clip. `onEnd` fires on natural completion; `onFail` on anything
 *  else, including an autoplay rejection. Exactly one of them fires. */
export function playClip(
  src: string,
  { rate, onEnd, onFail }: { rate: number; onEnd: () => void; onFail: () => void },
) {
  const a = element();
  if (!a) { onFail(); return; }

  let done = false;
  const once = (fn: () => void) => () => {
    if (done) return;
    done = true;
    a.onended = null;
    a.onerror = null;
    fn();
  };
  const end = once(onEnd);
  const fail = once(onFail);

  a.onended = end;
  a.onerror = fail;
  a.src = mediaURL(src);
  a.playbackRate = rate;
  a.play().catch(fail);
}

/** Fetch the clip after this one so the gap between lines is not a download.
 *  Only ever one ahead: a page of thirty takes is megabytes. */
export function warm(src: string | null) {
  if (!src || !canPlayClips()) return;
  if (!next) {
    next = new Audio();
    next.preload = 'auto';
  }
  const url = mediaURL(src);
  if (next.src !== url) next.src = url;
}

export function pauseClip() { el?.pause(); }

export function resumeClip() { el?.play().catch(() => {}); }

/** Silence the element without tearing it down. Assigning src = '' would fire
    an error event ("Empty src attribute"), so the source is left in place. */
export function haltClip() {
  if (!el) return;
  el.onended = null;
  el.onerror = null;
  el.pause();
  try { el.currentTime = 0; } catch { /* not seekable yet; nothing to reset */ }
}

export function setClipRate(rate: number) {
  if (el) el.playbackRate = rate;
}
