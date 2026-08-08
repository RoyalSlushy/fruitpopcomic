/* Parsing for the per-page script.
 *
 * The script is the one part of a comic page that can be text. Dialogue is
 * lettered into the artwork here, so nothing is extractable — a script exists
 * only where the creator has written one out by hand, and most pages have none.
 * This file makes no attempt to guess: an empty string parses to an empty list
 * and the reader says so.
 *
 * Format is deliberately the plainest thing a person types into a text box:
 * ONE LINE PER BEAT. A line is a jump target, a highlight target, and a speech
 * chunk, all three, which is why the split is by line rather than by paragraph.
 *
 *   PANEL 1                     → a note (a direction, not spoken dialogue)
 *   RONNIE: Where is it?        → a cue, attributed
 *   (she checks the counter)    → a note
 *   The stand is empty.         → prose
 *
 * Pure string work, no browser API.
 */

export type ScriptLine = {
  /** index in the list; stable, and what the TTS block index refers to */
  i: number;
  /** Identity of the BEAT rather than of its position, so a recording stays
      attached to its line when lines are added above it or reordered. Derived
      from the spoken words, which is the one thing a recording is of. */
  key: string;
  kind: 'cue' | 'note' | 'mark' | 'prose';
  /** the speaker, for a cue; null otherwise */
  who: string | null;
  /** what is shown after the speaker label is split off */
  text: string;
  /** what is read aloud — the speaker included, the bracket furniture not */
  speech: string;
};

/* A speaker label: short, upper-case, before a colon. Deliberately strict, so
   an ordinary sentence containing a colon is not mistaken for dialogue. The
   character class allows the punctuation real names carry — O'MALLEY, JEAN-LUC,
   MRS. PARK — and nothing else. */
const CUE = /^([A-Z0-9][A-Z0-9 .'’\-()]{0,27}):\s*(.*)$/;

/* A whole-line direction: (like this) or [like this]. */
const NOTE = /^[([](.*)[)\]]$/;

/** FNV-1a, 32-bit, base36.
 *
 *  Hand-rolled because it has to be SYNCHRONOUS and identical in node and the
 *  browser: `crypto.subtle.digest` is async and cannot be called from a pure
 *  parser. A cryptographic hash would be pointless here anyway — this is a
 *  lookup key within one page's few dozen lines, and a collision costs one
 *  wrong clip on one line, nothing else.
 *
 *  `Math.imul` rather than `*`: the 32-bit multiply overflows a double, and
 *  plain `*` would silently lose the low bits that carry the entropy. */
export function hashText(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/* Case is folded before hashing so that fixing a capital does not orphan a
   recording of words that did not change. Rewriting the words themselves DOES
   orphan it, which is the point — the clip no longer says what the line says. */
const keyOf = (speech: string) => hashText(speech.toLowerCase());

/** Split a hand-written script into beats. Blank lines are separators. */
export function scriptLines(script: string): ScriptLine[] {
  /* A script may legitimately repeat a beat — a refrain, a line said twice.
     Identical text would collapse onto one key and therefore one recording, so
     repeats are numbered by order of appearance. */
  const seen = new Map<string, number>();

  const key = (speech: string) => {
    const h = keyOf(speech);
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n === 0 ? h : `${h}-${n}`;
  };

  return (script || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .map((line, i): ScriptLine => {
      const note = NOTE.exec(line);
      if (note?.[1] !== undefined) {
        const text = note[1].trim();
        return { i, key: key(text), kind: 'note', who: null, text, speech: text };
      }

      const cue = CUE.exec(line);
      if (cue?.[1] && cue[2]) {
        const who = cue[1].trim();
        const text = cue[2].trim();
        const speech = `${who}. ${text}`;
        return { i, key: key(speech), kind: 'cue', who, text, speech };
      }

      /* An all-caps line with no colon is a panel or scene slug. It reads as
         structure rather than as something anyone says, so it is its own kind
         — a parenthetical direction is prose the artist acts on, a slug is a
         heading. Styling them alike would throw that away. */
      if (/[A-Z]/.test(line) && line === line.toUpperCase() && line.length <= 48) {
        return { i, key: key(line), kind: 'mark', who: null, text: line, speech: line };
      }

      return { i, key: key(line), kind: 'prose', who: null, text: line, speech: line };
    });
}

/** Everything the synthesiser should say, block by block. */
export const speechOf = (lines: ScriptLine[]): string[] => lines.map((l) => l.speech);
