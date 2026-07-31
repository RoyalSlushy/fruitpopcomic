/* Text preparation for read-aloud. Pure string work, no browser API and no
 * network — the speaking is in lib/tts.ts and the model is in services/kokoro.
 *
 * ── WHY A CHUNKER AT ALL ────────────────────────────────────
 * Kokoro predicts prosody from the whole utterance it is given, through a BERT
 * text encoder and a duration predictor. Two things follow, and they pull in
 * opposite directions:
 *
 *   · Too long is worse. Quality degrades over a long passage, and nothing is
 *     heard until the last word is generated. A visitor who pressed Listen
 *     waits for the whole article.
 *   · Too short is worse. A fragment with no sentence around it gets flat,
 *     clipped delivery, because there is no context for the predictor to read
 *     rhythm out of.
 *
 * So: whole sentences, packed up to a budget, never split unless a single
 * sentence exceeds it. And the FIRST chunk is deliberately smaller than the
 * rest — time to first audio is the only latency a listener actually feels,
 * and one short sentence generates in a fraction of the time a full one does.
 * Everything after it is generated while the previous chunk plays.
 *
 * ── PUNCTUATION IS THE SCORE ────────────────────────────────
 * Kokoro has no prosody markup. A full stop is a fall and a pause, a question
 * mark is a rise, a comma is a breath. That is the entire notation, so this
 * file preserves what the writer typed and never invents any of it — the one
 * exception is a chunk that ends mid-sentence at a hard break, which gets a
 * comma rather than a full stop, because a fall in the middle of a clause is a
 * worse lie than a breath.
 */

/** Longest chunk handed to the engine. The route enforces its own hard cap. */
export const MAX_CHUNK = 450;

/** Budget for the first chunk only. See the note above about latency. */
export const HEAD_CHUNK = 180;

/* ── markdown ───────────────────────────────────────────────
   Blurbs and wiki bodies are typed by hand into a text box, so they carry
   whatever the writer is used to typing. Asterisks read aloud as "asterisk" on
   some engines and as nothing on others; either way they are punctuation the
   writer did not mean phonetically.

   Structure is not only stripped, it is TRANSLATED. A heading and a list item
   are silent boundaries — the eye gets them from the layout and the ear gets
   nothing at all — so each becomes the full stop it already was, or a heading
   runs straight into the paragraph under it. Same reasoning as toSpeech()
   below, which does it for HTML block tags. */
function demark(s: string): string {
  const inline = (s ?? '')
    .replace(/```[\s\S]*?```/g, '\n\n')              // fenced code
    .replace(/`([^`]+)`/g, '$1')                     // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')        // images → their alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')         // links → their text
    .replace(/(\*\*|__)(.+?)\1/g, '$2')              // bold
    .replace(/(?<![\w*])[*_](?=\S)(.+?\S)[*_](?![\w*])/g, '$1')  // italic
    .replace(/~~(.+?)~~/g, '$1')                     // strikethrough
    .replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, '');  // horizontal rules

  /* A line that is its own block gets terminated; a soft-wrapped line inside a
     paragraph does not, or every wrap point would become a full stop. */
  const lines = inline.split(/\r?\n/).map((line) => {
    const l = line.replace(/^[ \t]{0,3}>[ \t]?/, '').trim();
    const block = /^#{1,6}[ \t]+/.test(l) || /^(?:[-*+]|\d+[.)])[ \t]+/.test(l);
    if (!block) return l;
    const body = l.replace(/^#{1,6}[ \t]+/, '').replace(/^(?:[-*+]|\d+[.)])[ \t]+/, '').trim();
    return body && !closed(body) ? `${body}.` : body;
  });

  /* A blank line is a paragraph break, and a paragraph break is a pause — so
     the paragraph before it is closed if the writer did not close it. */
  const out: string[] = [];
  let broke = false;
  for (const l of lines) {
    if (!l) { broke = true; continue; }
    const prev = out.length - 1;
    if (broke && prev >= 0 && !closed(out[prev]!)) out[prev] += '.';
    broke = false;
    out.push(l);
  }
  return out.join(' ');
}

/* ── sentences ──────────────────────────────────────────────
   A full stop is not always the end of a sentence. Splitting on "Mrs." or
   "e.g." would hand the engine a fragment and take the breath in the wrong
   place, which is audible. The list is deliberately short: these are the ones
   that actually turn up in prose about a comic. */
const ABBREV = /(?:^|[\s("'])(?:mr|mrs|ms|dr|prof|rev|sr|jr|st|vs|etc|no|vol|fig|approx|e\.g|i\.e|[a-z])\.$/i;

/** Split into sentences, keeping every character and every mark. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  /* Trailing quotes and brackets belong to the sentence they close. */
  for (const part of text.match(/[^.!?;…]+[.!?;…]*["'’”)\]]*\s*/g) ?? [text]) {
    buf += part;
    const done = buf.trimEnd();
    if (!/[.!?;…]["'’”)\]]*$/.test(done)) continue;
    if (ABBREV.test(done)) continue;
    out.push(buf.trim());
    buf = '';
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/* A sentence over budget has to break somewhere. In order of preference: a
   clause mark, then a space, then — only for a single unbroken 450-character
   run, which is a URL or a mistake — mid-word.

   The break keeps its mark. A fragment ending in a comma is a breath and reads
   as an unfinished clause, which is exactly what it is; one ending in nothing
   reads as a sentence that fell off a cliff. */
function breakLong(sentence: string, max: number, firstMax = max): string[] {
  const out: string[] = [];
  let rest = sentence;
  /* The first cut answers to whatever budget is current, which for the first
     chunk of a passage is the small one. Without this a single long opening
     sentence walks straight past the head budget and the listener waits for
     all of it — which is the exact latency the head budget exists to avoid. */
  let cap = firstMax;

  while (rest.length > cap) {
    let cut = -1;
    for (const mark of [',', ';', ':', '—', '–']) {
      const i = rest.lastIndexOf(mark, cap - 1);
      if (i > cut) cut = i;
    }
    /* A clause mark in the first third leaves a scrap behind and a long tail
       still to break; a space is the better break in that case. */
    if (cut >= cap * 0.4) {
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    } else {
      const space = rest.lastIndexOf(' ', cap - 1);
      const end = space > 0 ? space : cap;
      out.push(`${rest.slice(0, end).trim()},`);
      rest = rest.slice(end).trim();
    }
    cap = max;
  }

  if (rest) out.push(rest);
  return out;
}

/* Below this, an utterance has no sentence around it for the prosody predictor
   to read rhythm from, and Kokoro delivers it flat and clipped. Greedy packing
   produces one whenever a sentence just fails to fit — so a runt is folded back
   into its neighbour wherever the budget allows. */
const MIN_CHUNK = 60;

function mergeRunts(chunks: string[], max: number, head: number): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    const prev = out.length - 1;
    /* The first chunk keeps its own budget even here. Latency is the only
       thing a listener feels before the audio starts, and a runt is a prosody
       problem in audio that is already playing — so when the two rules
       disagree, the one about starting fast wins. */
    const cap = prev === 0 ? head : max;
    if (prev >= 0 && c.length < MIN_CHUNK && `${out[prev]} ${c}`.length <= cap) {
      out[prev] += ` ${c}`;
      continue;
    }
    out.push(c);
  }
  return out;
}

/** Does this end on something the engine can read as an intonation? */
const closed = (s: string) => /[.!?;:,…—–]["'’”)\]]*$/.test(s);

/**
 * Long-form text in, speakable chunks out. Every chunk is within `max`, ends
 * on punctuation, and contains only what the writer wrote.
 */
export function chunkForSpeech(
  text: string,
  { max = MAX_CHUNK, head = HEAD_CHUNK }: { max?: number; head?: number } = {},
): string[] {
  const clean = demark(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const out: string[] = [];
  let buf = '';
  /* The first chunk gets the smaller budget; once one is out, the rest pack
     to the full one because nobody is waiting on them. */
  const budget = () => (out.length === 0 ? Math.min(head, max) : max);

  const flush = () => {
    const t = buf.trim();
    if (t) out.push(t);
    buf = '';
  };

  for (const s of sentences(clean)) {
    if (s.length > budget()) {
      flush();
      for (const piece of breakLong(s, max, budget())) out.push(piece);
      continue;
    }
    if (buf && `${buf} ${s}`.length > budget()) flush();
    buf = buf ? `${buf} ${s}` : s;
  }
  flush();

  const packed = mergeRunts(out, max, Math.min(head, max));

  /* The tail is the one place a missing full stop is worth supplying: without
     it the last word is held rather than landed, and the passage does not
     sound finished. */
  const last = packed.length - 1;
  if (last >= 0 && packed[last] && !closed(packed[last])) packed[last] += '.';

  return packed;
}

/* ── html ───────────────────────────────────────────────────
   Wiki bodies may be hand-written HTML, and tag names must not be read out
   loud. Block-level tags become a full stop so the engine pauses between
   paragraphs instead of running them together. */
const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'",
};

export function toSpeech(html: string): string {
  return (html || '')
    .replace(/<(p|br|div|li|h[1-6]|tr)\b[^>]*>/gi, '. ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '. ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/\s*\.(\s*\.)+/g, '.')
    .replace(/\s+/g, ' ')
    /* A body opening with a block tag starts with the pause it was given. */
    .replace(/^[.\s]+/, '')
    .trim();
}

/** Join parts into one spoken passage, dropping blanks. */
export function passage(...parts: (string | undefined)[]): string {
  return parts
    .map((p) => (p ?? '').trim().replace(/[.\s]+$/, ''))
    .filter(Boolean)
    .join('. ');
}
