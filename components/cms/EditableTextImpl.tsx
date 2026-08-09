'use client';

import { useCallback, useLayoutEffect, useRef, useState, type ElementType } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';

/* Click-to-edit. This module only ever loads in edit mode.
 *
 * ── THE FREEZE ──────────────────────────────────────────────
 * While a session is open the element is rendered with NO CHILDREN AT ALL.
 * Not a memoised string — literally `children: undefined`. React then has
 * nothing to reconcile inside the node and will never call setTextContent or
 * touch a child, no matter how many times a parent re-renders. The text is
 * written once, imperatively, in a layout effect. Keystrokes trigger zero
 * setState: for the duration of the session the DOM is the source of truth,
 * and the draft store learns about it exactly once, at commit.
 * ───────────────────────────────────────────────────────────── */

/* Chrome 118+, Safari, Firefox 136+. Older Firefox THROWS on assignment rather
   than ignoring it, so this has to be probed inside a try. */
const PLAINTEXT_OK: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const d = document.createElement('div');
    d.contentEditable = 'plaintext-only';
    return d.contentEditable === 'plaintext-only';
  } catch {
    return false;
  }
})();

/* Browsers insert U+00A0 for trailing and collapsing spaces. Without folding
   them back, every touched field reads as dirty forever and every save
   rewrites the row. */
function normalise(s: string, multiline: boolean): string {
  const t = s.replace(/\u00A0/g, ' ');
  return multiline
    ? t.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : t.replace(/\s+/g, ' ').trim();
}

type Entry = { x: number; y: number } | 'select-all';

export default function EditableTextImpl({
  as: Tag = 'span' as ElementType, path, text, className, style, multiline = false, placeholder,
}: {
  as?: ElementType;
  path: string;
  text: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const session = useRef<{ frozen: string } | null>(null);
  const entry = useRef<Entry | null>(null);
  const [editing, setEditing] = useState(false);
  const { write } = useCms();
  const label = labelFor(path);

  /* Showing ghost text for an empty value, rather than being empty. */
  const blank = !text && !!placeholder;

  const open = useCallback((how: Entry) => {
    if (session.current) return;
    /* A blank field freezes to the REAL value — the empty string — never to
       the placeholder standing in for it. Freezing the ghost would hand the
       creator a box pre-filled with the words "Section heading" to delete. */
    session.current = { frozen: blank ? '' : (ref.current?.textContent ?? text) };
    entry.current = how;
    setEditing(true);
  }, [blank, text]);

  useLayoutEffect(() => {
    const el = ref.current;
    const s = session.current;
    if (!editing || !el || !s) return;
    el.textContent = s.frozen;            // the one and only write React does not own
    el.focus({ preventScroll: true });
    placeCaret(el, entry.current);
    entry.current = null;
  }, [editing]);

  /* Nulling the session synchronously IS the "Escape does not commit"
     mechanism: the blur it triggers finds no session and does nothing. No
     cancelled flag, no assumption about when blur fires. */
  const closeSession = useCallback((commit: boolean) => {
    const el = ref.current;
    const s = session.current;
    if (!el || !s) return;
    const next = normalise(el.textContent ?? '', multiline);
    session.current = null;
    el.textContent = commit ? next : s.frozen;
    setEditing(false);
    if (commit && next !== s.frozen) write(path, next);
  }, [multiline, path, write]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!session.current) {
      /* F2 is primary. The hero headline sits inside <a class="ch hero">, where
         Enter activates the link — so Enter is offered but hard-stopped. */
      if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        open('select-all');
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();               // the drawer's Escape handler must not see it
      closeSession(false);
      ref.current?.blur();
      return;
    }
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      closeSession(true);
      ref.current?.blur();
    }
    if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      closeSession(true);
      ref.current?.blur();
    }
  };

  const shared = {
    ref: ref as React.Ref<never>,
    className,
    style,
    'data-cms-path': path,
    'data-cms-label': label ?? path,
    onKeyDown,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();                // an ancestor <a href> must not navigate
      e.stopPropagation();
      if (!session.current) open({ x: e.clientX, y: e.clientY });
    },
  };

  if (!editing) {
    return (
      <Tag
        {...shared} tabIndex={0} aria-keyshortcuts="F2" aria-describedby="cms-edit-hint"
        data-cms-blank={blank ? '' : undefined}
      >
        {blank ? placeholder : text}
      </Tag>
    );
  }

  return (
    <Tag
      {...shared}
      contentEditable={PLAINTEXT_OK ? ('plaintext-only' as unknown as boolean) : true}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      aria-label={label ?? path}
      spellCheck
      data-cms-editing=""
      onBlur={() => { if (session.current) closeSession(true); }}
      onPaste={(e: React.ClipboardEvent) => {
        /* Always handled, even with plaintext-only: that strips formatting, it
           does not strip newlines out of a single-line field. */
        e.preventDefault();
        insertText(normalise(e.clipboardData.getData('text/plain'), multiline));
      }}
      onBeforeInput={(e: React.FormEvent) => {
        if (PLAINTEXT_OK) return;        // the fallback path only
        const t = (e.nativeEvent as InputEvent).inputType;
        if (
          t.startsWith('format') || t === 'insertFromDrop' ||
          t === 'insertFromPasteAsQuotation' || t === 'insertFromYank' ||
          (!multiline && (t === 'insertParagraph' || t === 'insertLineBreak'))
        ) e.preventDefault();
      }}
      onDragStart={(e: React.DragEvent) => e.preventDefault()}
      onDrop={(e: React.DragEvent) => e.preventDefault()}
    />
    /* ↑ no children. That is the freeze. */
  );
}

function insertText(s: string) {
  if (!s) return;
  /* Deprecated, but the only insertion that joins the browser's native undo
     stack. The Range path below works and loses Cmd-Z. */
  try {
    if (document.execCommand('insertText', false, s)) return;
  } catch { /* fall through */ }
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const r = sel.getRangeAt(0);
  r.deleteContents();
  const node = document.createTextNode(s);
  r.insertNode(node);
  r.setStartAfter(node);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

function placeCaret(el: HTMLElement, how: Entry | null) {
  const sel = window.getSelection();
  if (!sel) return;

  if (how && how !== 'select-all') {
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    let range: Range | null = null;
    if (doc.caretPositionFromPoint) {
      const p = doc.caretPositionFromPoint(how.x, how.y);
      if (p) {
        range = document.createRange();
        range.setStart(p.offsetNode, p.offset);
        range.collapse(true);
      }
    } else if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(how.x, how.y);
    }
    /* Containment check so a near-miss cannot drop the caret in a sibling. */
    if (range && el.contains(range.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  }

  const r = document.createRange();
  r.selectNodeContents(el);
  /* Keyboard entry to a short HUD label means "replace this". */
  if (how !== 'select-all') r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}
