/* One speech queue for the whole page.
 *
 * `speechSynthesis` is a single global device: whoever calls speak() last is
 * the only one talking. With two independent components able to start it — the
 * page description in the panel bar, and the transcript column — a per-component
 * `useState` would leave the loser's button stuck showing "Stop" for audio that
 * is no longer playing. So the state lives here, once, and both components read
 * it through useSyncExternalStore.
 *
 * `owner` is what makes that work: exactly one component owns the channel at a
 * time, and everyone else renders idle without being told.
 *
 * Pure module, no React import — the hook is the only binding, and it is at the
 * bottom so this file stays testable in node.
 */

import { useSyncExternalStore } from 'react';
import { chunk } from './speech.ts';

export type TtsState = {
  /** which component is speaking, or null when nothing is */
  owner: string | null;
  speaking: boolean;
  paused: boolean;
  /** index into the block list the owner handed over; -1 when idle */
  block: number;
};

const IDLE: TtsState = { owner: null, speaking: false, paused: false, block: -1 };

/* The server render and the first client render must agree, so both get IDLE
   from a stable reference — a fresh object each call would loop the store. */
let state: TtsState = IDLE;

const listeners = new Set<() => void>();

function set(next: Partial<TtsState>) {
  const merged = { ...state, ...next };
  if (merged.owner === state.owner && merged.speaking === state.speaking
      && merged.paused === state.paused && merged.block === state.block) return;
  state = merged;
  for (const fn of listeners) fn();
}

/* Bumped on every start and stop. cancel() delivers `onerror` to everything
   still queued, so a callback holding an older value is stale and must not be
   allowed to reset the state the new run just set. */
let run = 0;

export const supported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Speak `blocks` from `from` onward, reporting which block is live. */
export function speak(owner: string, blocks: string[], from = 0) {
  if (!supported()) return;

  const mine = ++run;
  speechSynthesis.cancel();

  /* Chrome truncates a long utterance, so each block is split again into
     sentence-sized pieces. The block index rides along so the caller can
     highlight the line being read rather than the fragment. */
  const queue: { text: string; block: number }[] = [];
  blocks.forEach((b, i) => {
    if (i < from) return;
    for (const text of chunk(b)) queue.push({ text, block: i });
  });

  const head = queue[0];
  if (!head) { set(IDLE); return; }

  set({ owner, speaking: true, paused: false, block: head.block });

  const say = (n: number) => {
    if (mine !== run) return;
    const step = queue[n];
    if (!step) { set(IDLE); return; }
    set({ block: step.block });
    const u = new SpeechSynthesisUtterance(step.text);
    u.lang = document.documentElement.lang || 'en';
    u.onend = () => say(n + 1);
    u.onerror = () => { if (mine === run) set(IDLE); };
    speechSynthesis.speak(u);
  };
  say(0);
}

export function stop() {
  if (!supported()) return;
  run++;
  speechSynthesis.cancel();
  set(IDLE);
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
