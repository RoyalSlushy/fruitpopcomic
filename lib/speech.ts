/* Text preparation for the read-aloud button. Pure string work, no browser
   API — the speaking itself is in components/site/Speak.tsx. */

/** Longest run of text handed to the synthesiser at once. */
export const MAX_CHUNK = 180;

/* Something that ends a piece without ending a sentence: a title, a street, an
   initial. Kept deliberately short — a list long enough to be "complete" would
   be wrong in a different language anyway, and the failure is mild. */
const ABBREV = /(^|\s)(mr|mrs|ms|dr|st|prof|sgt|lt|capt|rev|jr|sr|vs|etc|[a-z])\.$/i;

/** Split text into sentences.
 *
 *  Separate from `chunk` because the two want different things from the same
 *  rule. `chunk` needs pieces small enough for the synthesiser and will happily
 *  cut a long sentence mid-word to get them; a BEAT is a unit of writing, and a
 *  long sentence is still one beat. So this splits on sentence ends and stops
 *  there — `stepsOf` runs `chunk` over the result at play time.
 *
 *  Two joins matter more here than they do in `chunk`. There, a bad split is an
 *  inaudible utterance boundary. Here it is a visible beat with its own
 *  highlight and its own recording slot, so "Mrs." and "3.5" earn the guards. */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const raw = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean];
  const out: string[] = [];

  for (const piece of raw) {
    const prev = out[out.length - 1];
    /* A piece opening with a digit continues a decimal the last piece ended on
       — "3." then "5 litres" is one number, not two sentences. */
    const decimal = prev !== undefined && /\d\.\s*$/.test(prev) && /^\d/.test(piece);
    if (prev !== undefined && (decimal || ABBREV.test(prev.trimEnd()))) {
      out[out.length - 1] = prev + piece;
      continue;
    }
    out.push(piece);
  }

  return out.map((s) => s.trim()).filter(Boolean);
}

/* Chrome stops a single utterance after roughly fifteen seconds, so a whole
   article spoken as one utterance is cut off mid-word. Splitting on sentences
   and queueing them keeps every utterance well under that, and makes Stop
   respond immediately instead of at the end of the text. */
export function chunk(text: string, max = MAX_CHUNK): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  /* One sentence rule for the site, defined above. `chunk` adds the length
     budget on top; it does not get its own idea of where a sentence ends. */
  const parts = sentences(clean).map((s, i, a) => (i < a.length - 1 ? `${s} ` : s));
  const out: string[] = [];
  let buf = '';

  const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };

  for (const s of parts) {
    /* A sentence longer than the budget breaks at a comma, then at a space,
       and only failing both is it cut mid-word. */
    if (s.length > max) {
      flush();
      let rest = s;
      while (rest.length > max) {
        /* `end` is exclusive throughout, so the hard cut below cannot overrun
           the budget the way an inclusive index would. */
        let end = rest.lastIndexOf(',', max - 1);
        if (end >= max / 2) end += 1;
        else {
          end = rest.lastIndexOf(' ', max - 1);
          end = end > 0 ? end + 1 : max;
        }
        out.push(rest.slice(0, end).trim());
        rest = rest.slice(end);
      }
      buf = rest;
      continue;
    }
    if ((buf + s).length > max) flush();
    buf += s;
  }
  flush();

  return out.filter(Boolean);
}

/* Wiki bodies may be hand-written HTML, and tag names must not be read out
   loud. Block-level tags become a full stop so the synthesiser pauses between
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
