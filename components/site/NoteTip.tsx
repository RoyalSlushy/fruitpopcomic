'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { EditableText } from '../cms/EditableText.tsx';

/* The standing note, folded into the heading.
 *
 * It used to be a permanent band across the top of the reader, which meant the
 * same sentence taxed every page turn forever. As a mark in the heading it is
 * there when wanted and silent otherwise.
 *
 * Hover-revealed content has three obligations under WCAG 1.4.13, and this
 * meets all three:
 *
 *   dismissible — Escape closes it and returns focus to the mark
 *   hoverable   — the panel is adjacent to its trigger with no gap to cross,
 *                 so the pointer can move onto it without it vanishing
 *   persistent  — it stays until the pointer leaves, focus leaves, or Escape
 *
 * On top of that it opens on click as well as hover, which is the only way a
 * touch visitor gets it at all, and `aria-describedby` hands the text to a
 * screen reader from the mark itself — so the note is never *only* reachable
 * by hovering. */

export function NoteTip({ label, text, path }: {
  /** what the mark announces itself as */
  label: string;
  text: string;
  /** CMS path, so the note is still editable in place */
  path: string;
}) {
  const [open, setOpen] = useState(false);
  /* Escape has to beat the CSS as well as the state. Dismissing returns focus
     to the mark, the mark is inside the tip, and `:focus-within` would light
     the panel straight back up — so "dismissed" is a flag that overrides the
     reveal until the pointer or the focus actually leaves. Without it Escape
     looks broken, which is the failure mode WCAG 1.4.13 exists to prevent. */
  const [dismissed, setDismissed] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  const close = useCallback((restore = false) => {
    setOpen(false);
    if (restore) { setDismissed(true); btn.current?.focus(); }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open || wrap.current?.contains(document.activeElement)) close(true);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    addEventListener('keydown', onKey);
    addEventListener('pointerdown', onDown);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  if (!text.trim()) return null;

  return (
    <span
      className="tip"
      ref={wrap}
      data-open={open ? 'true' : 'false'}
      data-dismissed={dismissed ? 'true' : 'false'}
      onPointerLeave={() => setDismissed(false)}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setDismissed(false);
      }}
    >
      <button
        type="button"
        className="tip__mark"
        ref={btn}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={id}
        onClick={() => { setDismissed(false); setOpen((v) => !v); }}
      >
        <Glyph name="info" width={5} />
      </button>
      {/* Rendered always, hidden by visibility rather than by `hidden`, so the
          CSS hover reveal has something to reveal. aria-describedby reaches a
          visibility-hidden node by spec, which is what keeps this readable
          without a pointer. */}
      <span className="tip__body" id={id} role="note">
        <EditableText as="span" path={path} value={text} multiline />
      </span>
    </span>
  );
}
