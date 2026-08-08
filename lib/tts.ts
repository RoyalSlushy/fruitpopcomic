/* One playback queue for the whole page, and the settings that drive it.
 *
 * `speechSynthesis` is a single global device: whoever calls speak() last is
 * the only one talking. With several independent components able to start it —
 * the page description in the panel bar, the transcript column, the script
 * page's own sheet — a per-component `useState` would leave the losers' buttons
 * stuck showing "Stop" for audio that is no longer playing. So the state lives
 * here, once, and every component reads it through useSyncExternalStore.
 *
 * `owner` is what makes that work: exactly one component owns the channel at a
 * time, and everyone else renders idle without being told.
 *
 * The settings are here for the same reason. Voice, rate and pitch belong to
 * the visitor rather than to whichever button they last pressed, so they are
 * global, persisted, and applied to every utterance from every caller.
 *
 * THERE ARE NOW TWO ENGINES. A script beat with a recording plays the
 * creator's own voice through lib/audio.ts; every other beat is synthesised as
 * before. They share this one queue deliberately — a second player alongside
 * it would mean two `speaking` flags, two transports, and a Stop button that
 * only stopped half of what was audible. Every entry point therefore goes
 * through cancelAll(), which silences BOTH.
 *
 * What is testable has been moved out. lib/clips.ts decides what the playlist
 * is and flattens it into steps; this file only walks the result and wires up
 * the events, because nothing that touches `speechSynthesis` or an <audio>
 * element can run under `node --test`.
 */

import { useSyncExternalStore } from 'react';
import { chunk } from './speech.ts';
import { best, rank, type VoiceInfo } from './voices.ts';
import { stepsOf, type Step, type Track } from './clips.ts';
import {
  canPlayClips, haltClip, pauseClip, playClip, resumeClip, setClipRate, unlock, warm,
} from './audio.ts';

export type TtsSettings = {
  /** null means "whatever the platform thinks is best", resolved at speak time */
  voiceURI: string | null;
  rate: number;
  pitch: number;
  /** Play recordings where they exist. Off means one consistent synthesised
      voice for the whole page — worse material, but it never switches. */
  clips: boolean;
};

export type TtsState = {
  /** which component is speaking, or null when nothing is */
  owner: string | null;
  speaking: boolean;
  paused: boolean;
  /** index into the block list the owner handed over; -1 when idle */
  block: number;
  /** what the live block is being played by; null when idle */
  kind: 'speech' | 'clip' | null;
  settings: TtsSettings;
  /** installed voices, best first; empty until the browser has loaded them */
  voices: VoiceInfo[];
};

export const DEFAULTS: TtsSettings = { voiceURI: null, rate: 1, pitch: 1, clips: true };

export const RATE = { min: 0.5, max: 2, step: 0.1 } as const;
export const PITCH = { min: 0.5, max: 1.6, step: 0.1 } as const;

/* The server render and the first client render must agree, so both get this
   one frozen object — a fresh one per call would loop the store. */
const IDLE: TtsState = Object.freeze({
  owner: null, speaking: false, paused: false, block: -1, kind: null,
  settings: DEFAULTS, voices: [],
});

let state: TtsState = IDLE;

const listeners = new Set<() => void>();

function set(next: Partial<TtsState>) {
  const merged = { ...state, ...next };
  /* Every field is enumerated on purpose. A field added to TtsState and
     forgotten here stops notifying, silently, and the symptom is a highlight
     that will not move. */
  if (merged.owner === state.owner && merged.speaking === state.speaking
      && merged.paused === state.paused && merged.block === state.block
      && merged.kind === state.kind
      && merged.settings === state.settings && merged.voices === state.voices) return;
  state = merged;
  for (const fn of listeners) fn();
}

/* Bumped on every start and stop. cancel() delivers `onerror` to everything
   still queued, so a callback holding an older value is stale and must not be
   allowed to reset the state the new run just set. The same guard covers the
   audio element's callbacks. */
let run = 0;

/* What the current owner handed over, so a settings change can restart from
   the line being played rather than throwing the visitor back to the top. */
let current: { owner: string; tracks: Track[]; to: number } | null = null;

export const supported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Whether anything can be played at all — synthesis, recordings, or both. */
export const playable = () => supported() || canPlayClips();

/* Silence BOTH engines. Every entry point that used to call
   speechSynthesis.cancel() must call this instead, or a recording carries on
   underneath the next thing that starts. */
function cancelAll() {
  if (supported()) speechSynthesis.cancel();
  haltClip();
}

/* ── settings ─────────────────────────────────────────────── */

const KEY = 'fp-tts';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 1));

let hydrated = false;

/** Read the stored settings and the installed voices.
 *  Safe to call from every component that plays — it only runs once. */
export function hydrate() {
  if (hydrated || !supported()) return;
  hydrated = true;

  let stored = DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<TtsSettings>;
      stored = {
        voiceURI: typeof j.voiceURI === 'string' ? j.voiceURI : null,
        rate: clamp(Number(j.rate), RATE.min, RATE.max),
        pitch: clamp(Number(j.pitch), PITCH.min, PITCH.max),
        /* Absent for anyone who stored settings before recordings existed. */
        clips: typeof j.clips === 'boolean' ? j.clips : true,
      };
    }
  } catch { /* a corrupt or blocked store is not worth failing over */ }

  set({ settings: stored });
  loadVoices();

  /* getVoices() is empty on the first call in every Chromium browser — the
     list arrives asynchronously and announces itself here. Without this the
     picker would be permanently empty for most visitors. */
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

function loadVoices() {
  const lang = document.documentElement.lang || 'en';
  const all: VoiceInfo[] = speechSynthesis.getVoices().map((v) => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    localService: v.localService,
    isDefault: v.default,
  }));
  if (!all.length) return;
  set({ voices: rank(all, lang) });
}

export function setSettings(patch: Partial<TtsSettings>) {
  const before = state.settings;
  const settings: TtsSettings = {
    voiceURI: patch.voiceURI !== undefined ? patch.voiceURI : before.voiceURI,
    rate: patch.rate !== undefined ? clamp(patch.rate, RATE.min, RATE.max) : before.rate,
    pitch: patch.pitch !== undefined ? clamp(patch.pitch, PITCH.min, PITCH.max) : before.pitch,
    clips: patch.clips !== undefined ? patch.clips : before.clips,
  };
  set({ settings });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }

  if (!state.speaking || !current) return;

  /* Turning recordings on or off changes which engine each line uses, so the
     queue has to be rebuilt either way. */
  if (settings.clips !== before.clips) {
    play(current.owner, current.tracks, state.block, current.to);
    return;
  }

  /* A recording is not affected by voice or pitch, and restarting the
     creator's take from the top because a slider moved would be absurd. Speed
     is the one setting that does apply, and it applies live. */
  if (state.kind === 'clip') {
    setClipRate(settings.rate);
    return;
  }

  /* Changing the voice while it is talking should be audible immediately, and
     from where the listener actually is — restarting at the top would punish
     them for adjusting it. The panel bound rides along, or adjusting a slider
     mid-panel would quietly turn it into "play the rest of the page". */
  play(current.owner, current.tracks, state.block, current.to);
}

/** The voice a new utterance will use, resolved against what is installed. */
export function resolvedVoice(): VoiceInfo | null {
  const { voiceURI } = state.settings;
  if (voiceURI) {
    const hit = state.voices.find((v) => v.voiceURI === voiceURI);
    if (hit) return hit;
  }
  return best(state.voices, typeof document !== 'undefined'
    ? document.documentElement.lang || 'en' : 'en');
}

/* ── the queue ────────────────────────────────────────────── */

function say(text: string): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  const { rate, pitch } = state.settings;
  const want = resolvedVoice();
  if (want) {
    const v = speechSynthesis.getVoices().find((x) => x.voiceURI === want.voiceURI);
    if (v) u.voice = v;
  }
  u.lang = want?.lang || document.documentElement.lang || 'en';
  u.rate = rate;
  u.pitch = pitch;
  return u;
}

/* The src of the next clip after step `n`, so it can be fetched while the
   current one plays. */
function upcoming(steps: Step[], n: number): string | null {
  for (let i = n + 1; i < steps.length; i += 1) {
    const s = steps[i];
    if (s?.kind === 'clip') return s.src;
  }
  return null;
}

/** Play `tracks` from `from` up to `to` (exclusive), reporting which block is
 *  live. `to` defaults to the end, so leaving it off plays the rest of the
 *  page; passing it plays one panel and stops there.
 *
 *  Must be reached from a user gesture the first time on a page, or recordings
 *  will not be allowed to start. Callers press it from a click handler and
 *  unlock() below does the rest. */
export function play(owner: string, tracks: Track[], from = 0, to = tracks.length) {
  if (!playable()) return;

  const mine = ++run;
  cancelAll();
  current = { owner, tracks, to };

  /* With recordings off, every line takes the synthesis path. Dropping `src`
     here rather than branching in the walker keeps the queue one shape. */
  const list = state.settings.clips ? tracks : tracks.map((t) => ({ ...t, src: null }));
  const steps = stepsOf(list, from, to);

  const head = steps[0];
  if (!head) { current = null; set(IDLE); return; }

  set({ owner, speaking: true, paused: false, block: head.block, kind: head.kind });

  const finish = () => {
    current = null;
    set({ owner: null, speaking: false, paused: false, block: -1, kind: null });
  };

  /* Speak one block's words as chunks, then continue. Used both for ordinary
     speech steps and as the landing place when a recording will not play. */
  const talk = (parts: string[], k: number, done: () => void) => {
    if (mine !== run) return;
    const text = parts[k];
    if (text === undefined) { done(); return; }
    if (!supported()) { done(); return; }
    const u = say(text);
    u.onend = () => talk(parts, k + 1, done);
    u.onerror = () => { if (mine === run) finish(); };
    speechSynthesis.speak(u);
  };

  const next = (n: number) => {
    if (mine !== run) return;
    const step = steps[n];
    if (!step) { finish(); return; }
    set({ block: step.block, kind: step.kind });

    if (step.kind === 'clip') {
      warm(upcoming(steps, n));
      playClip(step.src, {
        rate: state.settings.rate,
        onEnd: () => next(n + 1),
        /* A dead object, a codec the browser refuses, or a blocked autoplay.
           The line still has words; say them rather than stopping the page.

           Reported, not swallowed. Falling back silently is right for a
           visitor and wrong for whoever made the recording: an unreachable
           clip is indistinguishable from one that was never attached, and
           read-aloud simply looks like it is ignoring the upload. */
        onFail: () => {
          if (mine !== run) return;
          console.warn(`[tts] recording did not play, speaking instead: ${step.src}`);
          set({ kind: 'speech' });
          talk(chunk(step.speech), 0, () => next(n + 1));
        },
      });
      return;
    }

    talk([step.text], 0, () => next(n + 1));
  };

  next(0);
}

/** Speak plain blocks — no recordings involved. The prose pages' Listen button
 *  and the reader's page description both come through here. */
export function speak(owner: string, blocks: string[], from = 0) {
  play(owner, blocks.map((speech) => ({ speech, src: null })), from);
}

/** Where playback is bounded to, so a per-panel button can show its OWN state
 *  instead of every panel lighting up whenever anything is playing. */
export const playingTo = (): number | null => (current && state.speaking ? current.to : null);

/** One line, out of band — the voice picker's preview. Does not touch state. */
export function sample(text: string) {
  if (!supported()) return;
  run++;
  current = null;
  cancelAll();
  set({ owner: null, speaking: false, paused: false, block: -1, kind: null });
  speechSynthesis.speak(say(text));
}

export function stop() {
  if (!playable()) return;
  run++;
  current = null;
  cancelAll();
  set({ owner: null, speaking: false, paused: false, block: -1, kind: null });
}

/** Stop only if `owner` is the one actually playing.
 *
 *  Components stop on unmount so navigating away does not talk over the next
 *  page. Doing that unconditionally means a component that never held the
 *  channel silences whoever does — harmless while they always unmounted
 *  together, and a bug the moment they do not. */
export function stopIfOwner(owner: string) {
  if (state.owner === owner) stop();
}

export function pause() {
  if (!state.speaking || state.paused) return;
  if (state.kind === 'clip') pauseClip();
  else if (supported()) speechSynthesis.pause();
  set({ paused: true });
}

export function resume() {
  if (!state.paused) return;
  if (state.kind === 'clip') resumeClip();
  else if (supported()) speechSynthesis.resume();
  set({ paused: false });
}

/** Bless the audio element for later playback. Call synchronously from the
 *  click that starts playback — see lib/audio.ts for why it cannot wait. */
export { unlock };

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const snapshot = () => state;
const serverSnapshot = () => IDLE;

/** Live playback state. Re-renders only the components that ask for it. */
export function useTts(): TtsState {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
