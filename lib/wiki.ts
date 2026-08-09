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
