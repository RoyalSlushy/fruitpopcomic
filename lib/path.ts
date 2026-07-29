/* Dot-path addressing.
 *
 * Every editable value on the site is named by a string like
 * "pages.items.2.stage". The first segment is the section, which is also the
 * row in `site_content` that a change to that path has to be saved into.
 *
 * Numeric segments index arrays. Everything here is pure: each operation
 * returns a new object and shares whatever it did not touch.
 */

export type Path = string;

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isIndex = (s: string) => /^(0|[1-9]\d*)$/.test(s);

/* JSON.parse turns "__proto__" into a real own property, so these have to be
   refused at the write boundary as well as in the merge. */
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

export const segments = (path: Path): string[] => (path === '' ? [] : path.split('.'));

/** The section key a path belongs to — i.e. which DB row to save. */
export const sectionOf = (path: Path): string => segments(path)[0] ?? '';

/**
 * Replace every index with "*" so a path can be looked up in the schema:
 * "pages.items.2.stage" -> "pages.items.*.stage"
 */
export const normalizePath = (path: Path): Path =>
  segments(path)
    .map((s) => (isIndex(s) ? '*' : s))
    .join('.');

export const joinPath = (...parts: (string | number)[]): Path =>
  parts.filter((p) => p !== '').join('.');

/* ── read ─────────────────────────────────────────────────── */

export function getByPath(root: unknown, path: Path): unknown {
  let node: unknown = root;
  for (const seg of segments(path)) {
    if (node == null) return undefined;
    if (Array.isArray(node)) {
      if (!isIndex(seg)) return undefined;
      node = node[Number(seg)];
    } else if (isPlainObject(node)) {
      node = node[seg];
    } else {
      return undefined;
    }
  }
  return node;
}

/* ── write ────────────────────────────────────────────────── */

function setIn(node: unknown, segs: string[], value: unknown): unknown {
  const head = segs[0];
  if (head === undefined) return value;
  const rest = segs.slice(1);

  if (isIndex(head)) {
    /* An index segment means this level is a list. If the existing node is not
       an array we start one rather than throwing — the path is the intent. */
    const arr = Array.isArray(node) ? node.slice() : [];
    const i = Number(head);
    arr[i] = setIn(arr[i], rest, value);
    return arr;
  }

  if (RESERVED.has(head)) throw new Error(`setByPath: refusing reserved key "${head}"`);
  const obj: Record<string, unknown> = isPlainObject(node) ? { ...node } : {};
  obj[head] = setIn(obj[head], rest, value);
  return obj;
}

export function setByPath<T>(root: T, path: Path, value: unknown): T {
  /* Load-bearing. JSON.stringify drops object values that are `undefined`, so an
     undefined draft would round-trip as an ABSENT key — which the merge reads as
     "not overridden" and quietly restores the code default. Storing a blank is
     `null` or `''`; `undefined` is always a bug. */
  if (value === undefined) {
    throw new Error(`setByPath("${path}"): undefined is not storable — use null to clear`);
  }
  const segs = segments(path);
  if (segs.length === 0) return value as T;
  return setIn(root, segs, value) as T;
}

/* ── lists ────────────────────────────────────────────────── */

function withList<T>(root: T, listPath: Path, fn: (list: unknown[]) => unknown[]): T {
  const current = getByPath(root, listPath);
  const list = Array.isArray(current) ? current : [];
  return setByPath(root, listPath, fn(list.slice()));
}

/** Insert `item` at `index`; an out-of-range index clamps to the ends. */
export function insertAt<T>(root: T, listPath: Path, index: number, item: unknown): T {
  return withList(root, listPath, (list) => {
    const i = Math.max(0, Math.min(list.length, index));
    list.splice(i, 0, item);
    return list;
  });
}

export function removeAt<T>(root: T, listPath: Path, index: number): T {
  return withList(root, listPath, (list) => {
    if (index < 0 || index >= list.length) return list;
    list.splice(index, 1);
    return list;
  });
}

/** Move one item. Out-of-range `from` is a no-op; `to` clamps. */
export function moveItem<T>(root: T, listPath: Path, from: number, to: number): T {
  return withList(root, listPath, (list) => {
    if (from < 0 || from >= list.length) return list;
    const [item] = list.splice(from, 1);
    const target = Math.max(0, Math.min(list.length, to));
    list.splice(target, 0, item);
    return list;
  });
}
