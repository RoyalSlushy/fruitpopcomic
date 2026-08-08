/* Pairing recorded clips to script beats, and turning that into a playlist.
 *
 * This module exists to keep the interesting decisions OUT of lib/tts.ts. That
 * file talks to `speechSynthesis` and an <audio> element, so nothing in it can
 * run under `node --test`. Everything here is pure — no browser API, no env,
 * no React — which means the part of this feature most likely to be wrong is
 * also the part that is actually tested.
 *
 * The one invariant the rest of the reader leans on:
 *
 *   ONE TRACK PER LINE, INDEX-ALIGNED WITH THE LINE LIST.
 *
 * `block` in the TTS store therefore stays the line index it has always been,
 * and the highlight, the jump-to-line click and `aria-current` keep working
 * without knowing recordings exist at all.
 */

import { chunk } from './speech.ts';
import type { ScriptLine } from './script.ts';
import type { PageClip } from '../content/pages.ts';

/** One line of playback: the words, and the recording of them if there is one. */
export type Track = { speech: string; src: string | null };

/** One thing the player does next. A clip is atomic; speech is chunked,
 *  because Chrome truncates a long utterance (see lib/speech.ts).
 *
 *  A clip carries `speech` as well as `src`: a recording can fail at play time
 *  for reasons nothing here can see — a deleted object, a codec, an autoplay
 *  rejection — and the player needs the words to fall back to without going
 *  back to the track list mid-walk. */
export type Step =
  | { kind: 'speech'; text: string; block: number }
  | { kind: 'clip'; src: string; speech: string; block: number };

/* A row with a blank src is not a recording. The CMS can produce one by
   clearing a field rather than removing the row, and `mergeNode` treats '' as
   a real stored value, so it will arrive here. */
const usable = (c: PageClip | undefined): c is PageClip =>
  !!c && typeof c.src === 'string' && c.src !== '';

/** The recording filed under `key`, or null. First match wins: duplicate keys
    should not happen, but a hand-edited row should not change which clip plays
    depending on array order. */
export function clipSrc(clips: readonly PageClip[], key: string): string | null {
  const hit = clips.find((c) => c?.key === key && usable(c));
  return hit ? hit.src : null;
}

/** The playlist for a page: one entry per line, in line order. */
export function tracksOf(lines: readonly ScriptLine[], clips: readonly PageClip[]): Track[] {
  return lines.map((l) => ({ speech: l.speech, src: clipSrc(clips, l.key) }));
}

/** Whether any line on this page has a recording — what the reader uses to
    decide if the mixed-voice marker is worth showing at all. */
export const hasClips = (lines: readonly ScriptLine[], clips: readonly PageClip[]): boolean =>
  lines.some((l) => clipSrc(clips, l.key) !== null);

/** Recordings whose beat is no longer in the script.
 *
 *  This is the repair list, and the reason `said` is stored. Editing a line's
 *  words changes its key, which detaches the take that was made of the old
 *  words — correct, since the recording no longer says what the line says, but
 *  it must not be silent. The editor shows these with what they say and offers
 *  to re-attach or delete them. */
export const orphanClips = (
  lines: readonly ScriptLine[],
  clips: readonly PageClip[],
): PageClip[] => {
  const live = new Set(lines.map((l) => l.key));
  return clips.filter((c) => usable(c) && !live.has(c.key));
};

/** Attach a recording to a beat, replacing any clip already filed under it. */
export function withClip(
  clips: readonly PageClip[],
  key: string,
  src: string,
  said: string,
): PageClip[] {
  const next = clips.filter((c) => c?.key !== key);
  next.push({ key, src, said });
  return next;
}

export const withoutClip = (clips: readonly PageClip[], key: string): PageClip[] =>
  clips.filter((c) => c?.key !== key);

/** Flatten a playlist into the steps the player walks.
 *
 *  Everything the queue has to decide lives here: where to start, that a clip
 *  plays whole while speech is chunked, and that both carry the LINE index
 *  rather than the step index so the caller can highlight the right line. */
export function stepsOf(tracks: readonly Track[], from = 0): Step[] {
  const out: Step[] = [];
  tracks.forEach((t, block) => {
    if (block < from) return;
    if (t.src) {
      out.push({ kind: 'clip', src: t.src, speech: t.speech, block });
      return;
    }
    for (const text of chunk(t.speech)) out.push({ kind: 'speech', text, block });
  });
  return out;
}
