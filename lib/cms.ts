/* The merge layer.
 *
 * Content lives in code. The database holds a sparse override per section, one
 * JSONB row in `site_content`. getSection() reads that row and deep-merges it
 * over the code defaults.
 *
 * The site must render completely with an empty database, so every failure
 * path here returns the defaults. getSection never throws.
 */

import { isPlainObject, joinPath, normalizePath, type Path } from './path.ts';
import { templateForItem } from './cms-schema.ts';

import { site,   type SiteContent }   from '../content/site.ts';
import { home,   type HomeContent }   from '../content/home.ts';
import { pages,  type PagesContent }  from '../content/pages.ts';
import { sheets, type SheetsContent } from '../content/sheets.ts';
import { wiki,   type WikiContent }   from '../content/wiki.ts';
import { status, type StatusContent } from '../content/status.ts';
import { about,  type AboutContent }  from '../content/about.ts';

export type Sections = {
  site: SiteContent;
  home: HomeContent;
  pages: PagesContent;
  sheets: SheetsContent;
  wiki: WikiContent;
  status: StatusContent;
  about: AboutContent;
};

export type SectionKey = keyof Sections;

export const DEFAULTS: Sections = { site, home, pages, sheets, wiki, status, about };

export const SECTION_KEYS = Object.keys(DEFAULTS) as SectionKey[];

export const isSectionKey = (k: unknown): k is SectionKey =>
  typeof k === 'string' && (SECTION_KEYS as string[]).includes(k);

/* ── merge ────────────────────────────────────────────────────
 * The invariant everything else falls out of:
 *
 *   CODE OWNS SHAPE. THE DATABASE OWNS VALUES AND ARRAY LENGTH.
 *
 * getSection() returns something whose key set and container-vs-scalar layout
 * is exactly the defaults'. A stale row can therefore never crash a component
 * that has moved on — the worst it can do is lose one field's edit.
 * ─────────────────────────────────────────────────────────── */

type Kind = 'array' | 'object' | 'leaf' | 'absent';

/* null is a LEAF, not "absent". JSON has no undefined, so absence is the only
   "not overridden" signal and null is a real, storable "this is empty". */
const kindOf = (v: unknown): Kind =>
  v === undefined ? 'absent'
  : Array.isArray(v) ? 'array'
  : isPlainObject(v) ? 'object'
  : 'leaf';

const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const ID_KEYS = ['id', 'slug', 'key'] as const;

const dev = () => process.env.NODE_ENV !== 'production';

function warn(msg: string) {
  if (dev()) console.warn('[cms]', msg);
}

/** A stable identity for a list item, so a reorder does not smear fields. */
function identityOf(v: unknown): string | null {
  if (!isPlainObject(v)) return null;
  for (const k of ID_KEYS) {
    const raw = v[k];
    if ((typeof raw === 'string' && raw !== '') || typeof raw === 'number') {
      return `${k}\u0000${raw}`;
    }
  }
  return null;
}

/** Deep union of two CODE-authored trees; right wins. Both sides are trusted,
    so there is no shape rule here. */
function overlay(a: unknown, b: unknown): unknown {
  if (!isPlainObject(a) || !isPlainObject(b)) return b;
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) out[k] = overlay(a[k], b[k]);
  return out;
}

function mergeNode(def: unknown, stored: unknown, path: Path): unknown {
  const dk = kindOf(def);
  const sk = kindOf(stored);

  if (sk === 'absent') return def;              // key not stored -> code wins
  if (dk !== sk) {                              // string vs object, array vs object, null vs object
    warn(`${path}: stored ${sk} but code has ${dk}; keeping the code value`);
    return def;
  }
  if (dk === 'leaf') {
    /* null is an explicit clear and always allowed through. A genuine scalar
       type change is not: `figures: "3"` would silently break the arithmetic
       that produces the Cast counter. The editor always sends the right type,
       so this only ever fires on hand-edited or stale rows. */
    if (stored === null || def === null) return stored;
    if (typeof def !== typeof stored) {
      warn(`${path}: stored ${typeof stored} but code has ${typeof def}; keeping the code value`);
      return def;
    }
    return stored;
  }
  if (dk === 'array') return mergeArray(def as unknown[], stored as unknown[], path);
  return mergeObject(def as Record<string, unknown>, stored as Record<string, unknown>, path);
}

function mergeObject(
  def: Record<string, unknown>,
  stored: Record<string, unknown>,
  path: Path,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  /* Iterating the DEFAULTS' keys is the whole shape rule. A stored-only key is
     never visited, so leftovers from a removed feature cannot leak into props.
     The save endpoint stores the merge OUTPUT, so they get cleaned up too. */
  for (const k of Object.keys(def)) {
    if (RESERVED.has(k)) continue;
    out[k] = Object.prototype.hasOwnProperty.call(stored, k)
      ? mergeNode(def[k], stored[k], joinPath(path, k))
      : def[k];
  }
  if (dev()) {
    for (const k of Object.keys(stored)) {
      if (!Object.prototype.hasOwnProperty.call(def, k)) {
        warn(`${joinPath(path, k)}: stored key is not in the code defaults; dropped`);
      }
    }
  }
  return out;
}

function mergeArray(def: unknown[], stored: unknown[], path: Path): unknown[] {
  /* LENGTH AND ORDER COME FROM `stored`, ALWAYS. This one line is the entire
     deletion mechanism: an item removed in the CMS is simply absent, and no
     union/pad/`stored.length ? stored : def` may reintroduce it. An empty
     stored array therefore means "the list was emptied", not "use defaults". */
  const template = templateForItem(joinPath(path, '*'));

  const byId = new Map<string, unknown>();
  for (const d of def) {
    const id = identityOf(d);
    if (id) byId.set(id, d);
  }

  return stored.map((item, i) => {
    const itemPath = joinPath(path, String(i));

    if (!isPlainObject(item)) {
      const d = def[i];
      if (kindOf(d) === 'object' || kindOf(d) === 'array') {
        warn(`${itemPath}: stored scalar but code has a container; keeping the code value`);
        return d;
      }
      return item;                              // genuine scalar list
    }

    /* Which default does this stored item merge over?
       Identity first, so reordering does not smear values between items;
       index only as a fallback for items that carry no id. */
    const id = identityOf(item);
    const positional = id ? byId.get(id) : (isPlainObject(def[i]) ? def[i] : undefined);

    let base: unknown;
    if (isPlainObject(template) && positional !== undefined) {
      base = overlay(template, positional);     // template < positional default
    } else if (isPlainObject(template)) {
      /* Past the end of the defaults, or a brand-new item. Merging over the
         TEMPLATE rather than defaults[0] is the point: defaults[0] would smear
         the first item's real content into a blank new one. */
      base = template;
    } else if (positional !== undefined) {
      base = positional;
    } else {
      warn(`${itemPath}: no template for ${normalizePath(joinPath(path, '*'))} and no id match; ` +
           'passing through unmerged — new code fields will not appear on it');
      return item;
    }
    return mergeNode(base, item, itemPath);
  });
}

/**
 * Merge a stored override over the code defaults for one section.
 * A row whose value is not a JSON object is corrupt and is ignored wholesale.
 */
export function deepMerge<T>(base: T, override: unknown, path: Path = ''): T {
  if (kindOf(override) !== 'object') {
    if (override !== undefined && override !== null) {
      warn(`${path || '(root)'}: stored value is not an object; using code defaults`);
    }
    return base;
  }
  return mergeNode(base, override, path) as T;
}

/* ── merge one stored value over its defaults ─────────────── */

/** Pure; the server-side read lives in lib/cms-server.ts. */
export function mergeSection<K extends SectionKey>(key: K, stored: unknown): Sections[K] {
  return deepMerge(DEFAULTS[key], stored, key);
}
