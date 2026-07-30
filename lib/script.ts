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

/** Split a hand-written script into beats. Blank lines are separators. */
export function scriptLines(script: string): ScriptLine[] {
  return (script || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .map((line, i): ScriptLine => {
      const note = NOTE.exec(line);
      if (note?.[1] !== undefined) {
        const text = note[1].trim();
        return { i, kind: 'note', who: null, text, speech: text };
      }

      const cue = CUE.exec(line);
      if (cue?.[1] && cue[2]) {
        const who = cue[1].trim();
        const text = cue[2].trim();
        return { i, kind: 'cue', who, text, speech: `${who}. ${text}` };
      }

      /* An all-caps line with no colon is a panel or scene slug. It reads as
         structure rather than as something anyone says, so it is its own kind
         — a parenthetical direction is prose the artist acts on, a slug is a
         heading. Styling them alike would throw that away. */
      if (/[A-Z]/.test(line) && line === line.toUpperCase() && line.length <= 48) {
        return { i, kind: 'mark', who: null, text: line, speech: line };
      }

      return { i, kind: 'prose', who: null, text: line, speech: line };
    });
}

/** Everything the synthesiser should say, block by block. */
export const speechOf = (lines: ScriptLine[]): string[] => lines.map((l) => l.speech);
