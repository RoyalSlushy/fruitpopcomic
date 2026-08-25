/* Sanitising rich text.
 *
 * Wiki blocks are rendered with dangerouslySetInnerHTML, and they are now
 * written in a contentEditable box rather than typed as markup by hand. Those
 * two facts together are the whole reason this file exists.
 *
 * The old comment on the wiki route said HTML was allowed through because the
 * only person who can log in is the one who writes it. That was true of a body
 * typed into a text field. It stops being true the moment the text arrives by
 * PASTE: a paste from a word processor or a web page carries that source's
 * markup — style attributes, font tags, whole nested tables, event handlers —
 * and the person pasting has no idea it is there. So everything that comes out
 * of the editor goes through here first, and what survives is a small, closed
 * list of tags the .prose styles actually know how to draw.
 *
 * An allow-list, never a block-list: anything this file has not heard of is
 * removed. Unknown tags are unwrapped rather than dropped whole, so an
 * unrecognised wrapper costs you its formatting and never your words.
 *
 * Pure string work — no DOM. It runs in the editor on commit AND on the server
 * at render, which means it has to work in Node, and it means a body that
 * somehow reached the database unsanitised is still sanitised on the way out.
 *
 * This is not a general-purpose HTML sanitiser and should not be used as one.
 * It is deliberately narrow: this site's prose, and nothing else.
 */

/** Tag → the attributes it may keep. Everything else about it is discarded. */
const ALLOWED: Record<string, readonly string[]> = {
  p: [], br: [], hr: [],
  h3: [], h4: [],
  strong: [], em: [], b: [], i: [],
  ul: ['class'], ol: [], li: [],
  blockquote: [],
  a: ['href'],
  code: [], kbd: [],
};

/** No closing tag, and no children. */
const VOID = new Set(['br', 'hr']);

/* A <p> ends when one of these starts — the rule the HTML parser itself
   applies. It is here because contentEditable does NOT apply it: turning a
   paragraph into a list in Chromium yields <p><ul><li>…</li></ul></p>, which
   the parser then splits back apart on render, leaving an empty paragraph on
   either side of the list. Closing the <p> here means what is stored is what
   renders. */
const CLOSES_P = new Set(['p', 'h3', 'h4', 'ul', 'ol', 'blockquote', 'hr']);

/* Unwrapped tags keep their text. These do not: their content is not prose,
   it is code, and leaving the text behind would dump a stylesheet into the
   middle of a paragraph. */
const OPAQUE = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math']);

/* The one class the prose styles read — the label/value grid used by the
   "Quick facts" lists. A free-form class attribute would be a styling hole
   into the rest of the site's CSS. */
const CLASSES = new Set(['facts']);

/* Anything that is not one of these is not a link this site will emit.
   `javascript:` is the reason the check exists; `data:` is the other one. */
function safeHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  /* Leading control characters and entity-encoded colons are the classic way
     to smuggle a scheme past a naive prefix test. Strip, then decide. */
  const flat = v.replace(/[\u0000-\u0020]|&#0*58;?|&#[xX]0*3[aA];?/g, (c) => (c[0] === '&' ? ':' : '')).toLowerCase();
  if (/^(https?:|mailto:)/.test(flat)) return v;
  if (v.startsWith('/') || v.startsWith('#')) return v;
  return null;
}

const ESC: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Escape a run of text. A bare `&` becomes an entity; a real one is left. */
function escapeText(s: string): string {
  return s
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
    .replace(/[<>]/g, (c) => ESC[c] ?? c);
}

function escapeAttr(s: string): string {
  return s
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
    .replace(/[<>"]/g, (c) => ESC[c] ?? c);
}

const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** The attributes a tag may keep, rebuilt and escaped. */
function keepAttrs(tag: string, raw: string): string {
  const allow = ALLOWED[tag];
  if (!allow || allow.length === 0) return '';

  let out = '';
  ATTR.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR.exec(raw))) {
    const name = (m[1] ?? '').toLowerCase();
    if (!allow.includes(name)) continue;
    const value = m[2] ?? m[3] ?? m[4] ?? '';

    if (name === 'href') {
      const href = safeHref(value);
      if (href) out += ` href="${escapeAttr(href)}"`;
      continue;
    }
    if (name === 'class') {
      const kept = value.split(/\s+/).filter((c) => CLASSES.has(c));
      if (kept.length) out += ` class="${escapeAttr(kept.join(' '))}"`;
      continue;
    }
  }
  return out;
}

const TAG = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>/g;

/**
 * `html`, reduced to the tags this site draws.
 *
 * Output is balanced: unclosed tags are closed at the end and stray closers
 * are dropped, so a fragment can always be concatenated with another one.
 */
export function sanitizeRich(html: string): string {
  const input = html ?? '';
  if (!input) return '';

  let out = '';
  const open: string[] = [];
  let cursor = 0;
  /* Set while inside a tag whose CONTENT is dropped too; holds the tag name so
     the matching close can turn it off again. */
  let opaque: string | null = null;

  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TAG.exec(input))) {
    const [whole, closing, rawName, attrs, selfClose] = m;
    const name = (rawName ?? '').toLowerCase();
    const text = input.slice(cursor, m.index);
    cursor = m.index + whole.length;

    if (!opaque) out += escapeText(text);

    if (opaque) {
      if (closing && name === opaque) opaque = null;
      continue;
    }
    if (OPAQUE.has(name)) {
      /* A self-closing <svg/> never gets a matching close tag. */
      if (!closing && !selfClose) opaque = name;
      continue;
    }
    if (!ALLOWED[name]) continue;          // unknown tag: unwrapped, text kept

    if (closing) {
      const at = open.lastIndexOf(name);
      if (at === -1) continue;             // stray closer
      /* Close everything opened inside it too, innermost first — a </ul> with
         an <li> still open must not leave the <li> dangling. */
      for (let i = open.length - 1; i >= at; i--) out += `</${open[i]}>`;
      open.length = at;
      continue;
    }

    /* An open paragraph ends where a block begins. */
    if (CLOSES_P.has(name) && open[open.length - 1] === 'p') {
      out += '</p>';
      open.pop();
    }

    if (VOID.has(name)) { out += `<${name}>`; continue; }

    out += `<${name}${keepAttrs(name, attrs ?? '')}>`;
    if (!selfClose) open.push(name);
  }

  if (!opaque) out += escapeText(input.slice(cursor));
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`;

  /* Whatever that leaves behind. A paragraph holding nothing but a break is
     the other thing contentEditable strews around — both are invisible to a
     reader and both add a blank line to the rendered prose. */
  return out.replace(/<p>(?:\s|<br>)*<\/p>/g, '').trim();
}

/**
 * True when a fragment carries nothing a reader would see.
 *
 * An emptied contentEditable is rarely the empty string — browsers leave
 * `<p><br></p>` or a stray `&nbsp;` behind — and a block that looks blank has
 * to test as blank or it renders as a panel with nothing in it.
 */
export function isBlankRich(html: string): boolean {
  return !(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/** Rich text as one line of plain text — for summaries and speech. */
export function richToText(html: string): string {
  return (html ?? '')
    .replace(/<(br|\/p|\/h3|\/h4|\/li|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
