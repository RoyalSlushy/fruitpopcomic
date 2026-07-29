/* Text preparation for the read-aloud button. Pure string work, no browser
   API — the speaking itself is in components/site/Speak.tsx. */

/** Longest run of text handed to the synthesiser at once. */
export const MAX_CHUNK = 180;

/* Chrome stops a single utterance after roughly fifteen seconds, so a whole
   article spoken as one utterance is cut off mid-word. Splitting on sentences
   and queueing them keeps every utterance well under that, and makes Stop
   respond immediately instead of at the end of the text. */
export function chunk(text: string, max = MAX_CHUNK): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean];
  const out: string[] = [];
  let buf = '';

  const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };

  for (const s of sentences) {
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
