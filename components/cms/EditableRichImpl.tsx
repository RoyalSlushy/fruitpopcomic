'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';
import { isBlankRich, sanitizeRich } from '../../lib/richtext.ts';

/* The rich-text box. This module only ever loads in edit mode.
 *
 * ── THE FREEZE, AGAIN ───────────────────────────────────────
 * Same rule as EditableTextImpl and for the same reason, but the stakes are
 * higher here. While a session is open the element is rendered with NEITHER
 * children NOR dangerouslySetInnerHTML: React is given nothing to reconcile
 * inside the node, so no parent re-render can ever reach in and replace the
 * markup the caret is sitting in. The HTML is written once, imperatively, in
 * a layout effect, and the DOM is the source of truth until commit.
 *
 * Were React allowed to own the innerHTML, every keystroke that changed the
 * draft would re-render the subtree, blow away the selection, and drop the
 * caret at the start of the box.
 * ───────────────────────────────────────────────────────────── */

type Cmd = {
  key: string;
  label: string;
  hint: string;
  run: () => void;
  /* Undefined for commands with no meaningful on/off state (links, clear). */
  active?: () => boolean;
};

const exec = (name: string, value?: string) => {
  try { document.execCommand(name, false, value); } catch { /* nothing to do */ }
};

const state = (name: string): boolean => {
  try { return document.queryCommandState(name); } catch { return false; }
};

const blockIs = (tag: string): boolean => {
  try { return (document.queryCommandValue('formatBlock') || '').toLowerCase() === tag; }
  catch { return false; }
};

export default function EditableRichImpl({
  path, html, display, className,
}: {
  path: string;
  /** The stored prose — what a session opens on and commits back. */
  html: string;
  /** The decorated prose — what is drawn while no session is open. */
  display?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const session = useRef<{ frozen: string } | null>(null);
  const [editing, setEditing] = useState(false);
  /* Bumped on every selection change so the toolbar's pressed states re-read
     from the document. Cheap: it re-renders the toolbar, never the box. */
  const [, tick] = useState(0);
  const { write } = useCms();
  const label = labelFor(path) ?? 'Text';

  /* A section that has not been written yet. An empty <div> has no height, so
     without ghost text there is literally nothing on screen to click — which
     is exactly what a freshly added section is. */
  const blank = isBlankRich(html);

  const open = useCallback(() => {
    if (session.current) return;
    /* Freeze to the `html` PROP, never to what is on screen. The two differ
       on purpose: the screen is showing ghost text for a blank field, or
       prose with cross-links woven through it, and either one read out of the
       DOM would be committed back as though the creator had typed it. */
    session.current = { frozen: blank ? '' : html };
    setEditing(true);
  }, [blank, html]);

  useLayoutEffect(() => {
    const el = ref.current;
    const s = session.current;
    if (!editing || !el || !s) return;
    el.innerHTML = s.frozen;              // the one write React does not own
    /* Enter should produce <p>, not the <div> Chrome defaults to — <p> is what
       .prose styles and what the sanitiser keeps. */
    exec('defaultParagraphSeparator', 'p');
    el.focus({ preventScroll: true });
    /* Caret to the end rather than the start: the box already has text and
       "carry on writing" is the common case. */
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }, [editing]);

  /* Keeps the toolbar's pressed states honest as the caret moves. */
  useEffect(() => {
    if (!editing) return;
    const onSel = () => tick((n) => n + 1);
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [editing]);

  /* Nulling the session synchronously IS the "Escape does not commit"
     mechanism — the blur it triggers finds no session and does nothing. */
  const closeSession = useCallback((commit: boolean) => {
    const el = ref.current;
    const s = session.current;
    if (!el || !s) return;
    const next = sanitizeRich(el.innerHTML);
    session.current = null;
    el.innerHTML = commit ? next : s.frozen;
    setEditing(false);
    if (commit && next !== sanitizeRich(s.frozen)) write(path, next);
  }, [path, write]);

  const commands: Cmd[] = [
    { key: 'b', label: 'B', hint: 'Bold (Ctrl+B)', run: () => exec('bold'), active: () => state('bold') },
    { key: 'i', label: 'I', hint: 'Italic (Ctrl+I)', run: () => exec('italic'), active: () => state('italic') },
    { key: 'h', label: 'H', hint: 'Sub-heading', run: () => exec('formatBlock', blockIs('h4') ? '<p>' : '<h4>'), active: () => blockIs('h4') },
    { key: 'ul', label: '•', hint: 'Bulleted list', run: () => exec('insertUnorderedList'), active: () => state('insertUnorderedList') },
    { key: 'ol', label: '1.', hint: 'Numbered list', run: () => exec('insertOrderedList'), active: () => state('insertOrderedList') },
    { key: 'q', label: '“', hint: 'Quote', run: () => exec('formatBlock', blockIs('blockquote') ? '<p>' : '<blockquote>'), active: () => blockIs('blockquote') },
    {
      key: 'a', label: '🔗', hint: 'Link',
      run: () => {
        const url = prompt('Link to (a URL, or a path like /wiki/ronnie-omalley). Leave blank to remove the link.');
        if (url === null) return;
        if (!url.trim()) { exec('unlink'); return; }
        exec('createLink', url.trim());
      },
    },
    { key: 'x', label: '⌫', hint: 'Clear formatting', run: () => { exec('removeFormat'); exec('formatBlock', '<p>'); } },
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!session.current) {
      if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        open();
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
    /* Enter is a paragraph break here, so committing needs the modifier —
       the same shortcut a multiline EditableText uses. */
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      closeSession(true);
      ref.current?.blur();
    }
  };

  if (!editing) {
    return (
      <div
        ref={ref}
        className={className}
        data-cms-path={path}
        data-cms-label={label}
        tabIndex={0}
        role="button"
        aria-keyshortcuts="F2"
        aria-label={`Edit ${label}`}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          /* Let a link inside the prose be followed normally when it is not
             being edited; anything else opens the editor. */
          if ((e.target as HTMLElement).closest('a')) return;
          e.preventDefault();
          e.stopPropagation();
          open();
        }}
        data-cms-blank={blank ? '' : undefined}
        dangerouslySetInnerHTML={{ __html: blank ? '<p>Write this section…</p>' : (display ?? html) }}
      />
    );
  }

  return (
    <div className="cms-rich" data-cms-path={path} data-cms-label={label}>
      {/* onMouseDown prevented on the whole strip: a button that took focus
          would blur the box, and blur commits — every click would end the
          session before its own command ran. */}
      <div className="cms-rich__bar" role="toolbar" aria-label={`${label} formatting`} onMouseDown={(e) => e.preventDefault()}>
        {commands.map((c) => (
          <button
            key={c.key}
            type="button"
            className="cms-rich__btn"
            title={c.hint}
            aria-label={c.hint}
            aria-pressed={c.active ? c.active() : undefined}
            data-on={c.active?.() ? '' : undefined}
            onClick={() => { runKeepingCaret(ref.current, c); tick((n) => n + 1); }}
          >{c.label}</button>
        ))}
        <span className="cms-rich__sep" />
        <button type="button" className="cms-rich__btn cms-rich__btn--ok" title="Save (Ctrl+Enter)" onClick={() => closeSession(true)}>Done</button>
        <button type="button" className="cms-rich__btn" title="Cancel (Esc)" onClick={() => closeSession(false)}>Cancel</button>
      </div>
      <div
        ref={ref}
        className={className}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={label}
        spellCheck
        data-cms-editing=""
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          /* Focus moving to the toolbar is not leaving the field. */
          const to = e.relatedTarget as Node | null;
          if (to && (e.currentTarget.parentElement?.contains(to))) return;
          if (session.current) closeSession(true);
        }}
        onPaste={(e: React.ClipboardEvent) => {
          e.preventDefault();
          const clip = e.clipboardData;
          const asHTML = clip.getData('text/html');
          const clean = asHTML
            ? sanitizeRich(asHTML)
            : escapeToParagraphs(clip.getData('text/plain'));
          /* insertHTML rather than a Range, so the paste joins the browser's
             own undo stack the way typing does. */
          exec('insertHTML', clean);
        }}
      />
      {/* ↑ no children, no dangerouslySetInnerHTML. That is the freeze. */}
    </div>
  );
}

/** Plain-text paste: blank lines become paragraphs, single ones become breaks. */
function escapeToParagraphs(text: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));
  return (text || '')
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/* ── keeping the caret ──────────────────────────────────────
 * The commands that change block structure — lists, quote, heading — rebuild
 * the nodes the caret was sitting in, and Chromium then leaves it at the
 * START of the rebuilt block. Type "Hello world", press the bullet button,
 * carry on typing, and you get "XHello world".
 *
 * So the caret is measured before the command as a plain character offset
 * into the box's text, and put back at the same offset afterwards. An offset
 * survives the rebuild because the TEXT survives it — only the wrapping
 * changes. Bold and italic do not move the caret and are unaffected either
 * way; this just costs them a no-op.
 *
 * Only for a collapsed caret. With a real selection the browser's own result
 * is the right one — bolding a phrase should leave the phrase selected — and
 * restoring a single offset would silently collapse it.
 * ───────────────────────────────────────────────────────────── */

function runKeepingCaret(el: HTMLElement | null, c: Cmd) {
  const sel = window.getSelection();
  const collapsed = !!sel?.isCollapsed;
  const before = el && collapsed ? caretOffset(el) : null;
  c.run();
  if (el && before !== null) setCaretOffset(el, before);
}

/** Where the caret is, counted in characters from the start of the box. */
function caretOffset(el: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!el.contains(r.startContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().length;
}

function setCaretOffset(el: HTMLElement, target: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let node: Node | null;
  const r = document.createRange();

  while ((node = walk.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (seen + len >= target) {
      r.setStart(node, Math.max(0, Math.min(len, target - seen)));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    seen += len;
  }

  /* Past the end — the command removed text, or there is none. */
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}
