/* One speech queue for the whole page, and the voice settings that drive it.
 *
 * `speechSynthesis` is a single global device: whoever calls speak() last is
 * the only one talking. With two independent components able to start it — the
 * page description in the panel bar, and the transcript column — a per-component
 * `useState` would leave the loser's button stuck showing "Stop" for audio that
 * is no longer playing. So the state lives here, once, and every component
 * reads it through useSyncExternalStore.
 *
 * `owner` is what makes that work: exactly one component owns the channel at a
 * time, and everyone else renders idle without being told.
 *
 * The settings are here for the same reason. Voice, rate and pitch belong to
 * the visitor rather than to whichever button they last pressed, so they are
 * global, persisted, and applied to every utterance from either caller.
 *
 * A hosted neural voice, if one is ever wanted, slots in at exactly one place:
 * `say()` below. Everything above it — the queue, the block bookkeeping, the
 * settings, the UI — is engine-agnostic already. It is not abstracted ahead of
 * time because there is no second engine to abstract over yet.
 */

import { useSyncExternalStore } from 'react';
import { chunk } from './speech.ts';
import { best, rank, type VoiceInfo } from './voices.ts';

export type TtsSettings = {
  /** null means "whatever the platform thinks is best", resolved at speak time */
  voiceURI: string | null;
  rate: number;
  pitch: number;
};

export type TtsState = {
  /** which component is speaking, or null when nothing is */
  owner: string | null;
  speaking: boolean;
  paused: boolean;
  /** index into the block list the owner handed over; -1 when idle */
  block: number;
  settings: TtsSettings;
  /** installed voices, best first; empty until the browser has loaded them */
  voices: VoiceInfo[];
};

export const DEFAULTS: TtsSettings = { voiceURI: null, rate: 1, pitch: 1 };

export const RATE = { min: 0.5, max: 2, step: 0.1 } as const;
export const PITCH = { min: 0.5, max: 1.6, step: 0.1 } as const;

/* The server render and the first client render must agree, so both get this
   one frozen object — a fresh one per call would loop the store. */
const IDLE: TtsState = Object.freeze({
  owner: null, speaking: false, paused: false, block: -1,
  settings: DEFAULTS, voices: [],
});

let state: TtsState = IDLE;

const listeners = new Set<() => void>();

function set(next: Partial<TtsState>) {
  const merged = { ...state, ...next };
  if (merged.owner === state.owner && merged.speaking === state.speaking
      && merged.paused === state.paused && merged.block === state.block
      && merged.settings === state.settings && merged.voices === state.voices) return;
  state = merged;
  for (const fn of listeners) fn();
}

/* Bumped on every start and stop. cancel() delivers `onerror` to everything
   still queued, so a callback holding an older value is stale and must not be
   allowed to reset the state the new run just set. */
let run = 0;

/* What the current owner handed over, so a settings change can restart from
   the line being read rather than throwing the visitor back to the top. */
let current: { owner: string; blocks: string[] } | null = null;

export const supported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/* ── settings ─────────────────────────────────────────────── */

const KEY = 'fp-tts';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 1));

let hydrated = false;

/** Read the stored settings and the installed voices.
 *  Safe to call from every component that speaks — it only runs once. */
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
  const settings: TtsSettings = {
    voiceURI: patch.voiceURI !== undefined ? patch.voiceURI : state.settings.voiceURI,
    rate: patch.rate !== undefined ? clamp(patch.rate, RATE.min, RATE.max) : state.settings.rate,
    pitch: patch.pitch !== undefined ? clamp(patch.pitch, PITCH.min, PITCH.max) : state.settings.pitch,
  };
  set({ settings });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }

  /* Changing the voice while it is talking should be audible immediately, and
     from where the listener actually is — restarting at the top would punish
     them for adjusting it. */
  if (state.speaking && current) speak(current.owner, current.blocks, state.block);
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

/** Speak `blocks` from `from` onward, reporting which block is live. */
export function speak(owner: string, blocks: string[], from = 0) {
  if (!supported()) return;

  const mine = ++run;
  speechSynthesis.cancel();
  current = { owner, blocks };

  /* Chrome truncates a long utterance, so each block is split again into
     sentence-sized pieces. The block index rides along so the caller can
     highlight the line being read rather than the fragment. */
  const queue: { text: string; block: number }[] = [];
  blocks.forEach((b, i) => {
    if (i < from) return;
    for (const text of chunk(b)) queue.push({ text, block: i });
  });

  const head = queue[0];
  if (!head) { current = null; set(IDLE); return; }

  set({ owner, speaking: true, paused: false, block: head.block });

  const next = (n: number) => {
    if (mine !== run) return;
    const step = queue[n];
    if (!step) { current = null; set({ owner: null, speaking: false, paused: false, block: -1 }); return; }
    set({ block: step.block });
    const u = say(step.text);
    u.onend = () => next(n + 1);
    u.onerror = () => {
      if (mine !== run) return;
      current = null;
      set({ owner: null, speaking: false, paused: false, block: -1 });
    };
    speechSynthesis.speak(u);
  };
  next(0);
}

/** One line, out of band — the voice picker's preview. Does not touch state. */
export function sample(text: string) {
  if (!supported()) return;
  run++;
  current = null;
  speechSynthesis.cancel();
  set({ owner: null, speaking: false, paused: false, block: -1 });
  speechSynthesis.speak(say(text));
}

export function stop() {
  if (!supported()) return;
  run++;
  current = null;
  speechSynthesis.cancel();
  set({ owner: null, speaking: false, paused: false, block: -1 });
}

export function pause() {
  if (!supported() || !state.speaking || state.paused) return;
  speechSynthesis.pause();
  set({ paused: true });
}

export function resume() {
  if (!supported() || !state.paused) return;
  speechSynthesis.resume();
  set({ paused: false });
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
