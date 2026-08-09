/* Splitting a wiki body into its sections.
 *
 * An entry body is one string of HTML, and it used to be rendered as one
 * container. That reads fine at four paragraphs and badly at forty: every
 * panel on this site is rotated a fraction of a degree, and a rotation is a
 * pivot — the taller the box, the further its far corners travel from the
 * page's own edges, until a long entry leans visibly out of the column it is
 * supposed to sit in. Short boxes tilt; tall ones look broken.
 *
 * So the body is cut at its <h3> boundaries, which are the headings the
 * entries already use for their sections, and each piece gets its own panel.
 * Nothing is inserted and nothing is dropped — the pieces concatenated are
 * the original string.
 *
 * Pure. No React, no browser API. The bodies are written by the one person
 * who can log in, so this parses with a regex rather than a DOM: the input is
 * known-shaped, hand-authored markup, and the failure mode of a surprise is
 * one big section rather than a wrong one.
 */

import type { WikiBlock, WikiEntry } from '../content/wiki.ts';
import { sanitizeRich, isBlankRich } from './richtext.ts';

export type WikiSection = {
  /** the section's <h3> text, plain — for labelling the region */
  heading: string;
  /** the section's markup, <h3> included */
  html: string;
};

export type WikiBody = {
  /** everything before the first <h3>; may be empty */
  lead: string;
  sections: WikiSection[];
};

const H3_OPEN = /<h3(?:\s[^>]*)?>/i;

/** Text of the first <h3> in a chunk, tags and entities resolved. */
function headingOf(part: string): string {
  const m = /<h3(?:\s[^>]*)?>([\s\S]*?)<\/h3>/i.exec(part);
  if (!m) return '';
  return (m[1] ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e] ?? _)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A body split into its lead and one section per <h3>.
 *
 * A body with no <h3> comes back as all lead and no sections, which is the
 * honest answer: it is one section, and the caller renders one panel.
 */
export function splitBody(html: string): WikiBody {
  const s = (html || '').trim();
  if (!s) return { lead: '', sections: [] };

  /* Lookahead, so the <h3> stays attached to the section it opens. */
  const parts = s.split(new RegExp(`(?=${H3_OPEN.source})`, 'i'));

  /* A body that opens on a heading splits to an empty first part. Either way
     the lead is whatever came before the first heading. */
  const first = parts[0] ?? '';
  const lead = H3_OPEN.test(first) ? '' : first.trim();
  const rest = lead ? parts.slice(1) : parts;

  const sections = rest
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => ({ heading: headingOf(part), html: part }));

  return { lead, sections };
}

/* ── blocks ────────────────────────────────────────────────────
 * `blocks` is what renders and what the editor edits. `body` is the string
 * the entries used to be, and is still rendered when an entry has no blocks —
 * so an entry can never end up with its text in neither field. Same
 * arrangement pages have between `script` and `snippets`.
 * ───────────────────────────────────────────────────────────── */

/** Plain text auto-paragraphs; anything that already looks like HTML passes. */
export function toHTML(text: string): string {
  const s = (text || '').trim();
  if (!s) return '';
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return s
    .split(/\n{2,}/)
    .map((p) => `<p>${p
      .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))
      .replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * What the page should draw, from either field.
 *
 * Sanitising HERE rather than only in the editor is deliberate: this is the
 * last thing that runs before dangerouslySetInnerHTML, so a row that reached
 * the database by some other route — a hand-edited JSONB, an import, an older
 * build — is still cleaned on the way out. See lib/richtext.ts.
 */
export function blocksOf(entry: Pick<WikiEntry, 'blocks' | 'body'>): WikiBlock[] {
  const stored = entry.blocks ?? [];
  const raw: WikiBlock[] = stored.length ? stored : legacyBlocks(entry.body ?? '');

  /* INDEX-PRESERVING, deliberately: the result is 1:1 with what is stored, in
     the same order. The editor addresses a block by its index — the path
     `wiki.entries.3.blocks.2.html` is a position — so dropping a row here
     would silently retarget every edit after it. Blank blocks are skipped at
     RENDER time instead, and only for readers; a block the creator has just
     added is blank by definition and has to be visible to be filled in. */
  return raw.map((b) => ({
    ...b,
    heading: (b.heading ?? '').trim(),
    html: sanitizeRich(b.html ?? ''),
    image: (b.image ?? '').trim(),
    caption: (b.caption ?? '').trim(),
  }));
}

/** Nothing in it a reader would see. Skipped for them, kept for the editor. */
export function isBlankBlock(b: WikiBlock): boolean {
  return !b.heading && !b.image && isBlankRich(b.html);
}

/** The legacy one-string body, cut into the same shape blocks have. */
function legacyBlocks(body: string): WikiBlock[] {
  const { lead, sections } = splitBody(toHTML(body));
  const out: WikiBlock[] = [];
  if (lead) out.push({ id: 'lead', heading: '', html: lead, image: '', caption: '' });
  sections.forEach((s, i) => {
    out.push({
      id: `s${i + 1}`,
      heading: s.heading,
      /* The <h3> becomes the block's `heading` field, so it must not also
         remain inside the block's own markup. */
      html: s.html.replace(/^<h3(?:\s[^>]*)?>[\s\S]*?<\/h3>\s*/i, ''),
      image: '',
      caption: '',
    });
  });
  return out;
}

/** The whole entry as one HTML string — for the read-aloud button. */
export function blocksToHTML(blocks: WikiBlock[]): string {
  return blocks
    .map((b) => (b.heading ? `<h3>${b.heading}</h3>` : '') + b.html + (b.caption ? `<p>${b.caption}</p>` : ''))
    .join('');
}
