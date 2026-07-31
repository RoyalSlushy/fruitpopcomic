/* One speech queue for the whole page, and the voice settings that drive it.
 *
 * There is one audio channel and several things on a page that can talk into
 * it — the panel bar's Describe button and the transcript column, at least —
 * so the state lives here, once, and every component reads it through
 * useSyncExternalStore. `owner` is what makes that work: exactly one component
 * owns the channel at a time and everyone else renders idle without being told.
 *
 * ── WHY THE WEB AUDIO API AND NOT <audio> ───────────────────
 * The text is spoken in chunks (see lib/tts-chunk.ts) and the joins between
 * them have to be inaudible, because a listener hears a gap as a fault in the
 * recording rather than as a technical detail of how it was made. Two
 * <audio> elements swapped on `ended` cannot do that: `ended` fires after the
 * last sample, the swap costs an event loop turn and a decode, and the result
 * is a 30-to-80ms hole between every sentence.
 *
 * So each chunk is decoded to an AudioBuffer and scheduled at an ABSOLUTE time
 * on the context clock — the end of the chunk before it, to the sample. The
 * clock does the joining, and nothing has to happen at the boundary at all.
 * A 6ms gain ramp at each end is insurance against a click, not a fix for one.
 *
 * The cost of that choice is that a chunk must be complete before it can be
 * decoded, so playback cannot start mid-chunk. That is paid for twice over:
 * the FIRST chunk is deliberately short (lib/tts-chunk.ts), and every chunk
 * after it is fetched while the one before it is still playing. In steady
 * state the network is always a chunk ahead of the ear.
 *
 * Pause is `ctx.suspend()`, which freezes the context clock — so everything
 * already scheduled stays scheduled, correctly, relative to a clock that is no
 * longer moving. Nothing has to be torn down and rebuilt.
 */

import { useSyncExternalStore } from 'react';
import { chunkForSpeech } from './tts-chunk.ts';
import { DEFAULT_VOICE, SPEED, clampSpeed, isVoice, ttsURL } from './kokoro.ts';

export { SPEED };

export type TtsSettings = { voice: string; speed: number };

export type TtsState = {
  /** which component is speaking, or null when nothing is */
  owner: string | null;
  speaking: boolean;
  paused: boolean;
  /** the queue has caught up with the network: the only state with a spinner */
  loading: boolean;
  /** the engine's own words, shown to the visitor rather than swallowed */
  error: string | null;
  /** index into the block list the owner handed over; -1 when idle */
  block: number;
  settings: TtsSettings;
  /** null until the readiness probe answers; false means offer no button */
  ready: boolean | null;
};

export const DEFAULTS: TtsSettings = { voice: DEFAULT_VOICE, speed: SPEED.default };

/* The server render and the first client render must agree, so both get this
   one frozen object — a fresh one per call would loop the store. */
const IDLE: TtsState = Object.freeze({
  owner: null, speaking: false, paused: false, loading: false, error: null,
  block: -1, settings: DEFAULTS, ready: null,
});

let state: TtsState = IDLE;
const listeners = new Set<() => void>();

function set(next: Partial<TtsState>) {
  const merged = { ...state, ...next };
  let same = true;
  for (const k of Object.keys(merged) as (keyof TtsState)[]) {
    if (merged[k] !== state[k]) { same = false; break; }
  }
  if (same) return;
  state = merged;
  for (const fn of listeners) fn();
}

/* Bumped on every start and stop, so a fetch or a timer belonging to a run
   that has been superseded can see that it has and do nothing. */
let run = 0;

/* What the current owner handed over, so a settings change can restart from
   the block being read rather than throwing the listener back to the top. */
let current: { owner: string; blocks: string[] } | null = null;

/* ── the audio context ──────────────────────────────────────
   One for the page's lifetime. Browsers cap how many a document may have, and
   a fresh one per press would hit that ceiling in a reading session. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/* ── settings ─────────────────────────────────────────────── */

const KEY = 'fp-tts';

let hydrated = false;

/** Read the stored settings and ask whether the engine is there.
 *  Safe to call from every component that speaks — it only runs once. */
export function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;

  let stored = DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<TtsSettings> & { rate?: number };
      stored = {
        voice: isVoice(j.voice) ? j.voice : DEFAULTS.voice,
        /* `rate` is the browser synthesiser's name for the same number. A
           visitor who set a speed before this site changed engines keeps it. */
        speed: clampSpeed(j.speed ?? j.rate),
      };
    }
  } catch { /* a corrupt or blocked store is not worth failing over */ }

  set({ settings: stored });
  void probe();
}

/* A control that cannot work must not be offered, and whether this one can is
   a fact about the deployment rather than about the browser — so it is asked,
   once, and the answer is cached by the CDN for everyone else. */
async function probe() {
  if (!audio()) { set({ ready: false }); return; }
  try {
    const res = await fetch('/api/tts', { cache: 'default' });
    set({ ready: res.status === 204 });
  } catch {
    set({ ready: false });
  }
}

export function setSettings(patch: Partial<TtsSettings>) {
  const settings: TtsSettings = {
    voice: patch.voice !== undefined && isVoice(patch.voice) ? patch.voice : state.settings.voice,
    speed: patch.speed !== undefined ? clampSpeed(patch.speed) : state.settings.speed,
  };
  if (settings.voice === state.settings.voice && settings.speed === state.settings.speed) return;
  set({ settings });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }

  /* Changing the voice while it is talking should be audible immediately, and
     from where the listener actually is — restarting at the top would punish
     them for adjusting it. */
  if (state.speaking && current) speak(current.owner, current.blocks, state.block);
}

/* ── fetching and decoding ──────────────────────────────────
   Keyed by URL, which already carries the text, the voice and the speed — so a
   line played twice is decoded once, and re-listening to a page costs nothing
   at all. Bounded, because a long session should not hold every sentence of
   every page it has visited in memory. */

const MAX_CACHED = 32;
const cache = new Map<string, Promise<AudioBuffer>>();

function load(url: string): Promise<AudioBuffer> {
  const hit = cache.get(url);
  if (hit) return hit;

  const pending = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      /* The route answers failures in JSON with a sentence in them. Using it
         is the difference between "something went wrong" and "the voice
         engine took too long — it may be under load". */
      let message = 'Read-aloud is unavailable right now.';
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch { /* not JSON: keep the generic line */ }
      throw new Error(message);
    }
    const bytes = await res.arrayBuffer();
    const c = audio();
    if (!c) throw new Error('This browser cannot play audio.');
    return c.decodeAudioData(bytes);
  })();

  /* A failure must not be remembered: the engine coming back should not need a
     reload to be noticed. */
  pending.catch(() => cache.delete(url));

  cache.set(url, pending);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return pending;
}

/* ── the queue ────────────────────────────────────────────── */

type Step = { text: string; block: number };

/** How far ahead of the ear the engine is allowed to work. */
const AHEAD_S = 12;
/** Fade at each join. Long enough to kill a click, short enough to be silent. */
const RAMP_S = 0.006;

let sources: AudioBufferSourceNode[] = [];
/** When each block starts, on the context clock. Drives the highlight. */
let marks: { at: number; block: number }[] = [];
/** The context time the last scheduled chunk ends at. */
let nextStart = 0;
/** True once everything in the queue has been scheduled. */
let queued = false;
let ticker: ReturnType<typeof setInterval> | null = null;

const sleep = (ms: number) => new Promise((r) => { setTimeout(r, ms); });

function teardown() {
  for (const s of sources) {
    try { s.onended = null; s.stop(); } catch { /* already finished */ }
  }
  sources = [];
  marks = [];
  nextStart = 0;
  queued = false;
  if (ticker) { clearInterval(ticker); ticker = null; }
}

/* Idle, and — when something went wrong — idle in the hands of whoever asked.
   Clearing the owner on a failure would leave the error belonging to nobody,
   so the button that was pressed would render as if it had never been pressed
   and the engine's explanation would go on the floor. */
function idle(error: string | null = null) {
  const owner = error ? state.owner : null;
  if (!error) current = null;
  set({ owner, speaking: false, paused: false, loading: false, block: -1, error });
}

/* One timer for the whole session rather than a callback per chunk. The
   highlight has to follow the AUDIO, not the fetch — a line is lit when it is
   heard, which can be seconds after it was generated — and the audio clock
   stops when the context is suspended, which a setTimeout would not. */
function watch(mine: number) {
  if (ticker) clearInterval(ticker);
  ticker = setInterval(() => {
    const c = ctx;
    if (mine !== run || !c) return;
    if (state.paused) return;

    const now = c.currentTime;
    let block = state.block;
    for (const m of marks) if (m.at <= now + 0.01) block = m.block;

    const dry = now >= nextStart - 0.01;
    if (queued && dry) { teardown(); idle(); return; }
    set({ block, loading: dry });
  }, 100);
}

/** Speak `blocks` from `from` onward, reporting which block is live. */
export function speak(owner: string, blocks: string[], from = 0) {
  const c = audio();
  if (!c) return;

  const mine = ++run;
  teardown();
  void c.resume();
  current = { owner, blocks };

  const queue: Step[] = [];
  blocks.forEach((b, i) => {
    if (i < from) return;
    for (const text of chunkForSpeech(b)) queue.push({ text, block: i });
  });

  const head = queue[0];
  if (!head) { idle(); return; }

  set({
    owner, speaking: true, paused: false, loading: true, error: null, block: head.block,
  });
  watch(mine);
  void pump(mine, queue);
}

async function pump(mine: number, queue: Step[]) {
  const c = ctx;
  if (!c) return;
  const { voice, speed } = state.settings;

  for (let i = 0; i < queue.length; i++) {
    /* Never work further ahead than the listener can hear. Generating a whole
       article the moment someone presses play would hold the engine for one
       reader while everyone else waits — and most of it would be thrown away
       the moment they turn the page. */
    while (mine === run && nextStart - c.currentTime > AHEAD_S) await sleep(150);
    if (mine !== run) return;

    const step = queue[i]!;
    let buf: AudioBuffer;
    try {
      /* Start the NEXT one before awaiting this one. That overlap is the whole
         prefetch: by the time this chunk finishes playing, the one after it
         has already been fetched and decoded, so it can be scheduled at the
         exact sample the current one ends on. */
      const soon = queue[i + 1];
      if (soon) void load(ttsURL(soon.text, voice, speed)).catch(() => { /* it will be retried in turn */ });
      buf = await load(ttsURL(step.text, voice, speed));
    } catch (e) {
      if (mine !== run) return;
      teardown();
      idle((e as Error).message);
      return;
    }
    if (mine !== run) return;

    /* The join: the end of the previous chunk, or now-plus-a-breath if the
       queue has already run dry and we are starting again from silence. */
    const at = Math.max(c.currentTime + 0.06, nextStart);
    const src = c.createBufferSource();
    src.buffer = buf;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + RAMP_S);
    gain.gain.setValueAtTime(1, at + Math.max(RAMP_S, buf.duration - RAMP_S));
    gain.gain.linearRampToValueAtTime(0, at + buf.duration);

    src.connect(gain).connect(c.destination);
    src.start(at);
    sources.push(src);
    marks.push({ at, block: step.block });
    nextStart = at + buf.duration;
  }

  if (mine === run) queued = true;
}

/** One line, out of band — the voice picker's preview. Takes no ownership. */
export async function sample(text: string) {
  const c = audio();
  if (!c) return;

  const mine = ++run;
  teardown();
  current = null;
  set({ owner: null, speaking: false, paused: false, block: -1, loading: true, error: null });
  void c.resume();

  const [first] = chunkForSpeech(text);
  if (!first) { set({ loading: false }); return; }

  try {
    const buf = await load(ttsURL(first, state.settings.voice, state.settings.speed));
    if (mine !== run) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start();
    sources.push(src);
    set({ loading: false });
  } catch (e) {
    if (mine === run) set({ loading: false, error: (e as Error).message });
  }
}

export function stop() {
  run++;
  teardown();
  current = null;
  set({ owner: null, speaking: false, paused: false, loading: false, block: -1, error: null });
}

export function pause() {
  if (!ctx || !state.speaking || state.paused) return;
  void ctx.suspend();
  set({ paused: true, loading: false });
}

export function resume() {
  if (!ctx || !state.paused) return;
  void ctx.resume();
  set({ paused: false });
}

/** Dismiss an error without starting anything. */
export function clearError() {
  if (state.error) set({ error: null });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const snapshot = () => state;
const serverSnapshot = () => IDLE;

/** Live speech state. Re-renders only the components that ask for it. */
export function useTts(): TtsState {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
