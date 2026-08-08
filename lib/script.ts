/* Parsing for the per-page script.
 *
 * The script is the one part of a comic page that can be text. Dialogue is
 * lettered into the artwork here, so nothing is extractable — a script exists
 * only where the creator has written one out by hand, and most pages have none.
 * This file makes no attempt to guess: an empty string parses to an empty list
 * and the reader says so.
 *
 * Format is deliberately the plainest thing a person types into a text box:
 *
 *   PANEL 1                     → a note (a direction, not spoken dialogue)
 *   RONNIE: Where is it?        → a cue, attributed
 *   (she checks the counter)    → a note
 *   The stand is empty.         → prose
 *
 * A BEAT is a jump target, a highlight target and a recording, all three. One
 * line is one beat for everything that is already the unit somebody says — a
 * cue, a direction, a slug. PROSE is the exception and splits per sentence,
 * because it is written in paragraphs: the first real script this saw was six
 * hundred characters with no line breaks in it, which as a single beat meant a
 * highlight that never moved and one recording for the whole page.
 *
 * A page's script is a LIST of snippets, parsed together as one script so that
 * beat indices and keys are unique across the page — see `pageLines`.
 *
 * Pure string work, no browser API.
 */

import { sentences } from './speech.ts';
import type { ScriptSnippet } from '../content/pages.ts';

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

/** A script's non-blank lines, whitespace-normalised.
 *
 *  Exported because a page's snippets are parsed as ONE script (see
 *  `pageLines`) and then sliced back apart by count. That slicing has to use
 *  the very same filter the parser uses, or the section boundaries drift the
 *  first time this rule changes — the same function, not the same intent. */
export function beats(body: string): string[] {
  return (body || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
}

/** Parse already-split lines into beats.
 *
 *  `seen` is scoped to one call, so keys are unique across everything handed in
 *  together — which is exactly why a page's snippets go in as one list. */
export function linesFrom(list: readonly string[]): ScriptLine[] {
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

  const out: ScriptLine[] = [];
  const push = (
    kind: ScriptLine['kind'], who: string | null, text: string, speech: string,
  ) => { out.push({ i: out.length, key: key(speech), kind, who, text, speech }); };

  for (const line of list) {
    const note = NOTE.exec(line);
    if (note?.[1] !== undefined) {
      const text = note[1].trim();
      push('note', null, text, text);
      continue;
    }

    const cue = CUE.exec(line);
    if (cue?.[1] && cue[2]) {
      const who = cue[1].trim();
      const text = cue[2].trim();
      push('cue', who, text, `${who}. ${text}`);
      continue;
    }

    /* An all-caps line with no colon is a panel or scene slug. It reads as
       structure rather than as something anyone says, so it is its own kind
       — a parenthetical direction is prose the artist acts on, a slug is a
       heading. Styling them alike would throw that away. */
    if (/[A-Z]/.test(line) && line === line.toUpperCase() && line.length <= 48) {
      push('mark', null, line, line);
      continue;
    }

    /* PROSE IS SPLIT PER SENTENCE, and it is the only kind that is.
       The creator writes narrative paragraphs, not one beat per line, so a
       page arrived as a single 600-character beat: the highlight never moved
       and "record this line" meant recording the whole page. A sentence is the
       smallest unit worth performing separately, so it is the beat.

       A cue, a note and a slug stay whole however many sentences they hold —
       they are already the unit someone says, and cutting `RONNIE: Get down.
       Now.` in two would invent a pause the writer did not write. */
    for (const s of sentences(line)) push('prose', null, s, s);
  }

  return out;
}

/** Split a hand-written script into beats. Blank lines are separators. */
export const scriptLines = (script: string): ScriptLine[] => linesFrom(beats(script));

/** Everything the synthesiser should say, block by block. */
export const speechOf = (lines: ScriptLine[]): string[] => lines.map((l) => l.speech);

/* ── a page's snippets ────────────────────────────────────── */

/** One snippet's worth of beats, and where it starts in the page's flat list. */
export type ScriptSection = {
  id: string;
  title: string;
  /** index of this section's first beat in the page's flat line list */
  from: number;
  lines: ScriptLine[];
};

export type PageScript = { lines: ScriptLine[]; sections: ScriptSection[] };

/** The snippets a page actually reads as.
 *
 *  A page written before scripts could be split reads as one untitled snippet
 *  holding its legacy string. This is a VIEW, never a write: deriving the fold
 *  at read time means there is no migration event to half-finish, no question
 *  about which of two devices ran it, and no page that can go blank because a
 *  stale save cleared `snippets` after something else cleared `script`. The
 *  legacy field is kept for good; splitting it is a button the creator presses,
 *  not a side effect of opening the editor. */
export function effectiveSnippets(
  snippets: readonly ScriptSnippet[] | undefined,
  legacy: string,
): ScriptSnippet[] {
  const real = (snippets ?? []).filter((s) => s && typeof s.body === 'string');
  if (real.length) return real as ScriptSnippet[];
  return legacy.trim() ? [{ id: 'legacy', title: '', body: legacy }] : [];
}

/** Parse a page's snippets into one flat beat list, grouped for the editor.
 *
 *  ONE `linesFrom` CALL FOR THE WHOLE PAGE, deliberately:
 *
 *  - `l.i` has to be a valid index into the page's track list. `PageScript`
 *    reads it straight off the DOM (`data-line`) and hands it to
 *    `play(id, tracks, i)`. Parsing per snippet would restart `i` at zero and
 *    force an offset through the markup, the highlight and the queue.
 *  - Beat keys stay unique across the page. Per-snippet keys would give two
 *    snippets that repeat a line the SAME key, and `clipSrc` is
 *    first-match-wins, so one take would play under both beats — wrong in both
 *    directions, always, rather than only when a duplicate is reordered.
 *  - For a page with one snippet the output is byte-identical to
 *    `scriptLines` of that body, which is what keeps every already-recorded
 *    clip attached across this change.
 *
 *  THE COST, stated plainly because it has no repair path: when the same beat
 *  appears in two snippets, the pair is told apart only by order (`h`, `h-1`).
 *  Reorder those snippets and the keys swap. If BOTH are recorded that is
 *  inaudible — same words either way. If only ONE is, the recording moves onto
 *  the other occurrence: a line that had a real voice goes synthetic and one
 *  that did not gains a voice. `orphanClips` cannot see it, because both keys
 *  still exist, and `said` cannot see it either, because duplicates say the
 *  same thing by definition. */
export function pageLines(snippets: readonly ScriptSnippet[]): PageScript {
  const per = snippets.map((s) => beats(s.body));
  const lines = linesFrom(per.flat());

  let at = 0;
  const sections = snippets.map((s, i): ScriptSection => {
    const n = per[i]?.length ?? 0;
    const section = { id: s.id, title: s.title, from: at, lines: lines.slice(at, at + n) };
    at += n;
    return section;
  });

  return { lines, sections };
}

/** Whether there is anything to read aloud. Titled-but-empty snippets are
    structure, not script, so they do not count. */
export const hasScript = (m: PageScript): boolean => m.lines.length > 0;
