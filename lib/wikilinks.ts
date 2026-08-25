/* Cross-links between wiki entries.
 *
 * Written the way an encyclopedia does it: the FIRST mention of another entry
 * inside an article becomes a link, and every mention after that is left as
 * plain text. Linking all of them turns a paragraph into a wall of gold.
 *
 * Derived, never stored. The links are computed at render time from the entry
 * list itself, which is the whole point:
 *
 *   - Adding an entry in the CMS makes every existing mention of it link, with
 *     nothing to go back and edit.
 *   - Renaming or deleting one cannot leave a dead link behind, because no
 *     link was ever written down.
 *   - What the editor edits stays the plain sentence the creator typed. If
 *     these were baked into the stored HTML, the rich-text box would capture
 *     them on the next commit and they would slowly fossilise into hand-
 *     maintained markup that drifts out of step with the entries.
 *
 * Pure string work — no DOM, same as lib/richtext.ts, and it runs after that
 * so it can trust the markup it is walking.
 */

import type { WikiEntry } from '../content/wiki.ts';

export type LinkTerm = {
  /** what to look for */
  text: string;
  slug: string;
  /** lower-cased match, for terms that are ordinary words in ordinary use */
  loose?: boolean;
};

/* Names a title cannot give us. Keyed by slug, so a title change does not
   silently orphan the aliases attached to it.

   Deliberately NOT here: bare "Gala" and "Smith". There is an Inspector Gala
   in Jonagold's comms bay and a Granny Smith in the family line, and a rule
   that cannot tell them apart would link the wrong people together. */
const ALIASES: Record<string, string[]> = {
  'ronnie-omalley': ['Ronnie', 'Lady Starburst', 'Starburst'],
  'lulu-ranger': ['Lulu', 'Berrypunch'],
  'liz-prescott': ['Liz', 'Strawheart'],
  'sterling-prescott': ['Sterling'],
  'mcintosh': ['McIntosh', 'Crimson Comet'],
  'alessia-deluca': ['DeLuca', 'Alessia DeLuca'],
  'jackie-boom-boom': ['Jackie'],
  'jazz-and-champlain': ['Jazz', 'Champlain'],
  'the-omalley-family': ['O’Malley family'],
  'the-omalley-cafe': ['O’Malley café'],
  'the-pomen-science-division': ['Science Division', 'science team'],
  'the-elites': ['Elites', 'Elite'],
  'the-orchard': ['Orchard'],
  'the-fruit-poppers': ['Fruit Poppers'],
  'the-pomen-corps': ['Pomen Corps'],
  'the-flyspeck-program': ['Flyspeck Program', 'Flyspeck'],
  'star-keys': ['star keys', 'star key'],
  'pomens': ['Pomens', 'Pomen'],
  'pomeroys': ['Pomeroys', 'Pomeroy'],
  'power-fruits': ['Power Fruits', 'Power Fruit'],
  'fruit-monsters': ['Fruit Monsters', 'Fruit Monster'],
};

/* Terms that are also ordinary English, matched without regard to case
   because the prose writes them both ways. Everything else matches
   case-sensitively, which is what keeps "a baby" from linking to Baby. */
const LOOSE = new Set(['star keys', 'star key', 'science team', 'o’malley café', 'o’malley family']);

/** Every linkable name, longest first so "Power Fruits" wins over "Fruit". */
export function buildIndex(entries: WikiEntry[]): LinkTerm[] {
  const out: LinkTerm[] = [];
  const seen = new Set<string>();

  const add = (text: string, slug: string) => {
    const key = text.toLowerCase();
    /* First entry to claim a name keeps it. Two entries sharing a name is a
       content problem; picking one silently is better than linking a word to
       whichever happened to be last. */
    if (!text || seen.has(key)) return;
    seen.add(key);
    out.push({ text, slug, loose: LOOSE.has(key) });
  };

  for (const e of entries) {
    if (!e.published || !e.slug) continue;
    add(e.title, e.slug);
    /* "McIntosh / The Crimson Comet" is two names for one entry. */
    for (const part of e.title.split(/\s+\/\s+/)) add(part.trim(), e.slug);
    /* A leading article is not part of the name in running prose. */
    add(e.title.replace(/^The\s+/i, ''), e.slug);
    for (const a of ALIASES[e.slug] ?? []) add(a, e.slug);
  }

  return out.sort((a, b) => b.text.length - a.text.length);
}

const WORD = /[A-Za-z0-9]/;

/** True when [i, j) in `s` is not sitting inside a longer word. */
function isWhole(s: string, i: number, j: number): boolean {
  const before = i > 0 ? s[i - 1] : '';
  const after = j < s.length ? s[j] : '';
  return !(before && WORD.test(before)) && !(after && WORD.test(after));
}

/* Text inside these is left alone: an <a> is already a link, and headings are
   not where an encyclopedia puts them. */
const SKIP_OPEN = /^<(a|h3|h4)\b/i;
const SKIP_CLOSE = /^<\/(a|h3|h4)\b/i;

const TAG = /<[^>]*>/g;

/**
 * `html` with the first mention of each other entry turned into a link.
 *
 * `used` carries across the blocks of ONE entry, so an entry that mentions
 * Pittscoke in three sections links it in the first and leaves the other two
 * as text. Pass the same Set to every block, then throw it away.
 */
export function linkify(
  html: string,
  index: LinkTerm[],
  selfSlug: string,
  used: Set<string>,
): string {
  if (!html) return html;

  let out = '';
  let cursor = 0;
  let depth = 0;                       // inside <a>/<h3>/<h4>

  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;

  const flush = (text: string) => {
    out += depth > 0 ? text : linkText(text, index, selfSlug, used);
  };

  while ((m = TAG.exec(html))) {
    flush(html.slice(cursor, m.index));
    cursor = m.index + m[0].length;
    if (SKIP_OPEN.test(m[0])) depth++;
    else if (SKIP_CLOSE.test(m[0]) && depth > 0) depth--;
    out += m[0];
  }
  flush(html.slice(cursor));

  return out;
}

/** One run of plain text, with at most one link per term. */
function linkText(text: string, index: LinkTerm[], selfSlug: string, used: Set<string>): string {
  if (!text.trim()) return text;

  /* Which characters are already spoken for, so a longer term's match cannot
     be re-matched inside by a shorter one. */
  const taken: boolean[] = new Array(text.length).fill(false);
  const hits: { at: number; len: number; slug: string }[] = [];

  for (const term of index) {
    if (term.slug === selfSlug || used.has(term.slug)) continue;

    const hay = term.loose ? text.toLowerCase() : text;
    const needle = term.loose ? term.text.toLowerCase() : term.text;

    let from = 0;
    for (;;) {
      const at = hay.indexOf(needle, from);
      if (at === -1) break;
      const end = at + needle.length;
      if (isWhole(text, at, end) && !taken.slice(at, end).some(Boolean)) {
        for (let i = at; i < end; i++) taken[i] = true;
        hits.push({ at, len: needle.length, slug: term.slug });
        used.add(term.slug);
        break;                         // first mention only
      }
      from = at + 1;
    }
  }

  if (!hits.length) return text;

  hits.sort((a, b) => a.at - b.at);
  let out = '';
  let cursor = 0;
  for (const h of hits) {
    out += text.slice(cursor, h.at);
    out += `<a class="wikilink" href="/wiki/${encodeURIComponent(h.slug)}">${text.slice(h.at, h.at + h.len)}</a>`;
    cursor = h.at + h.len;
  }
  return out + text.slice(cursor);
}
