/* What the site knows about the voice engine. Shared by the client that asks
 * for audio and the route that fetches it, so the allow-list the server
 * enforces and the list the picker offers cannot drift apart.
 *
 * No secrets and no browser API: this file is imported by both halves.
 *
 * Kokoro is an 82M-parameter open-weight model (Apache-2.0). It is not a paid
 * API and there is no per-character bill — the cost is one small always-on
 * process, which is why the site can read a whole wiki entry aloud without
 * anyone thinking about it. See docs/tts.md for where that process runs.
 */

export type Voice = {
  /** the engine's own id, and what gets persisted */
  id: string;
  label: string;
  accent: 'American' | 'British';
  /** Kokoro's published quality grade for the voice, A best */
  grade: string;
};

/* A curated set, not the full roster. Kokoro ships around fifty voices and
   most of them are graded C or below — a picker that lists all of them repeats
   the exact problem the browser's own voice list had, which is that the good
   ones are buried among ones nobody would choose. These are the ones graded
   C+ or better, in each accent. */
export const VOICES: Voice[] = [
  { id: 'af_heart',    label: 'Heart',    accent: 'American', grade: 'A'  },
  { id: 'af_bella',    label: 'Bella',    accent: 'American', grade: 'A-' },
  { id: 'af_nicole',   label: 'Nicole',   accent: 'American', grade: 'B-' },
  { id: 'af_aoede',    label: 'Aoede',    accent: 'American', grade: 'C+' },
  { id: 'af_kore',     label: 'Kore',     accent: 'American', grade: 'C+' },
  { id: 'af_sarah',    label: 'Sarah',    accent: 'American', grade: 'C+' },
  { id: 'am_michael',  label: 'Michael',  accent: 'American', grade: 'C+' },
  { id: 'am_fenrir',   label: 'Fenrir',   accent: 'American', grade: 'C+' },
  { id: 'am_puck',     label: 'Puck',     accent: 'American', grade: 'C+' },
  { id: 'bf_emma',     label: 'Emma',     accent: 'British',  grade: 'B-' },
  { id: 'bf_isabella', label: 'Isabella', accent: 'British',  grade: 'C'  },
  { id: 'bm_george',   label: 'George',   accent: 'British',  grade: 'C'  },
  { id: 'bm_fable',    label: 'Fable',    accent: 'British',  grade: 'C'  },
];

/** Kokoro's own highest-graded voice, and the one nobody has to choose. */
export const DEFAULT_VOICE = 'af_heart';

const IDS = new Set(VOICES.map((v) => v.id));

/** The route's allow-list. An unknown id is not passed upstream. */
export const isVoice = (v: unknown): v is string =>
  typeof v === 'string' && IDS.has(v);

export const voiceLabel = (id: string): string =>
  VOICES.find((v) => v.id === id)?.label ?? id;

/* Kokoro takes a speed multiplier and nothing else. There is no pitch control,
   which is a real loss against the browser synthesiser this replaced — the
   model's pitch is part of the voice, and the voices are the choice. */
export const SPEED = { min: 0.7, max: 1.5, step: 0.05, default: 1 } as const;

export const clampSpeed = (n: unknown): number => {
  /* Absent is not slow. `Number(null)` is 0, which clamps to the MINIMUM — so
     a missing ?s= (which is every request at the default speed, because the
     URL leaves it out) came back as 0.7× and the whole site read aloud at
     three quarters speed while the picker said 1.00×. Absence has to be
     spelled out before the arithmetic gets hold of it. */
  if (n === null || n === undefined || n === '') return SPEED.default;
  const v = Number(n);
  if (!Number.isFinite(v)) return SPEED.default;
  return Math.min(SPEED.max, Math.max(SPEED.min, Math.round(v * 100) / 100));
};

/* The route's hard cap, above the chunker's 450-character budget. The gap is
   deliberate: the client is supposed to have split the text already, so
   anything over this is a caller that did not, or someone using the endpoint
   as a free synthesiser. Either way it is refused rather than generated. */
export const MAX_TEXT = 500;

/**
 * Where the audio for one chunk lives.
 *
 * A GET with the text in the query string, not a POST, and that is the whole
 * caching strategy: the same sentence in the same voice at the same speed is
 * the same audio forever, so it is addressable, and every layer that caches
 * things by URL — the CDN in front of the site, the browser's HTTP cache —
 * does the repeat plays for free. A POST would be uncacheable by all of them.
 */
export function ttsURL(text: string, voice: string, speed: number): string {
  const q = new URLSearchParams({ t: text, v: voice });
  if (speed !== SPEED.default) q.set('s', String(speed));
  return `/api/tts?${q}`;
}
