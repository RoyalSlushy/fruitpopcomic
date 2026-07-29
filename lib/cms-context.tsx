'use client';

/* Draft state.
 *
 * Visitors pay for this file and almost nothing else: the provider holds nulls,
 * `useEditMode()` returns false, and `useCmsValue()` hands back the server value
 * it was given. No admin chunk is imported until edit mode actually turns on.
 *
 * The content tree itself is NOT serialised into the page for visitors. It is
 * fetched from /api/cms/content when the editor starts, which is also where the
 * baseline snapshot comes from.
 */

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import {
  getByPath, setByPath, insertAt, removeAt, moveItem, sectionOf, segments,
  type Path,
} from './path.ts';
import { isSectionKey, type SectionKey, type Sections } from './cms.ts';

type Tree = Partial<Record<SectionKey, unknown>>;

type CmsState = {
  editMode: boolean;
  ready: boolean;
  drafts: Tree;
  baseline: Tree;
  dirty: ReadonlySet<Path>;

  enterEditMode: (content: Sections) => void;
  exitEditMode: () => void;

  read: (path: Path, serverValue: unknown) => unknown;
  write: (path: Path, value: unknown) => void;
  listInsert: (listPath: Path, index: number, item: unknown) => void;
  listRemove: (listPath: Path, index: number) => void;
  listMove: (listPath: Path, from: number, to: number) => void;

  changedSections: () => SectionKey[];
  payload: () => Partial<Record<SectionKey, unknown>>;
  commitSaved: () => void;
  discard: () => void;
};

const noop = () => {};

const Ctx = createContext<CmsState>({
  editMode: false,
  ready: false,
  drafts: {},
  baseline: {},
  dirty: new Set(),
  enterEditMode: noop,
  exitEditMode: noop,
  read: (_p, serverValue) => serverValue,
  write: noop,
  listInsert: noop,
  listRemove: noop,
  listMove: noop,
  changedSections: () => [],
  payload: () => ({}),
  commitSaved: noop,
  discard: noop,
});

export function CmsProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Tree>({});
  const [baseline, setBaseline] = useState<Tree>({});
  const [dirty, setDirty] = useState<ReadonlySet<Path>>(new Set());

  const enterEditMode = useCallback((content: Sections) => {
    const snapshot = structuredClone(content) as Tree;
    setBaseline(snapshot);
    setDrafts(structuredClone(content) as Tree);
    setDirty(new Set());
    setEditMode(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setDrafts({});
    setBaseline({});
    setDirty(new Set());
  }, []);

  /* The draft wins whenever the editor is loaded and the path resolves inside
     it. Otherwise the server value passes straight through, which is what makes
     visitor markup identical to editor markup. */
  const read = useCallback(
    (path: Path, serverValue: unknown) => {
      const key = sectionOf(path);
      if (!isSectionKey(key)) return serverValue;
      const section = drafts[key];
      if (section === undefined) return serverValue;
      const rest = segments(path).slice(1).join('.');
      const v = getByPath(section, rest);
      return v === undefined ? serverValue : v;
    },
    [drafts],
  );

  const mutate = useCallback(
    (path: Path, fn: (section: unknown, rest: Path) => unknown, markPath = path) => {
      const key = sectionOf(path);
      if (!isSectionKey(key)) return;
      setDrafts((prev) => {
        const section = prev[key];
        if (section === undefined) return prev;
        const rest = segments(path).slice(1).join('.');
        return { ...prev, [key]: fn(section, rest) };
      });
      setDirty((prev) => new Set(prev).add(markPath));
    },
    [],
  );

  const write = useCallback(
    (path: Path, value: unknown) =>
      mutate(path, (section, rest) => setByPath(section, rest, value)),
    [mutate],
  );

  const listInsert = useCallback(
    (listPath: Path, index: number, item: unknown) =>
      mutate(listPath, (section, rest) => insertAt(section, rest, index, item)),
    [mutate],
  );

  const listRemove = useCallback(
    (listPath: Path, index: number) =>
      mutate(listPath, (section, rest) => removeAt(section, rest, index)),
    [mutate],
  );

  const listMove = useCallback(
    (listPath: Path, from: number, to: number) =>
      mutate(listPath, (section, rest) => moveItem(section, rest, from, to)),
    [mutate],
  );

  /* Only sections that actually differ from the snapshot get saved. */
  const changedSections = useCallback(
    () =>
      (Object.keys(drafts) as SectionKey[]).filter(
        (k) => JSON.stringify(drafts[k]) !== JSON.stringify(baseline[k]),
      ),
    [drafts, baseline],
  );

  const payload = useCallback(() => {
    const out: Partial<Record<SectionKey, unknown>> = {};
    for (const k of changedSections()) out[k] = drafts[k];
    return out;
  }, [changedSections, drafts]);

  const commitSaved = useCallback(() => {
    setBaseline(structuredClone(drafts));
    setDirty(new Set());
  }, [drafts]);

  const discard = useCallback(() => {
    setDrafts(structuredClone(baseline));
    setDirty(new Set());
  }, [baseline]);

  const value = useMemo<CmsState>(
    () => ({
      editMode,
      ready: Object.keys(drafts).length > 0,
      drafts,
      baseline,
      dirty,
      enterEditMode,
      exitEditMode,
      read,
      write,
      listInsert,
      listRemove,
      listMove,
      changedSections,
      payload,
      commitSaved,
      discard,
    }),
    [editMode, drafts, baseline, dirty, enterEditMode, exitEditMode, read, write,
     listInsert, listRemove, listMove, changedSections, payload, commitSaved, discard],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCms = () => useContext(Ctx);

/** False for every visitor. Components must not branch on it for layout. */
export const useEditMode = () => useContext(Ctx).editMode;

/** The draft while editing, the server-rendered value otherwise. */
export function useCmsValue<T>(path: Path, serverValue: T): T {
  return useContext(Ctx).read(path, serverValue) as T;
}
