'use client';

import dynamic from 'next/dynamic';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { sanitizeRich } from '../../lib/richtext.ts';

/* Same split as EditableText and EditableImage: a visitor gets the rendered
   prose and no editor at all. `dynamic()` at module scope so the admin chunk
   is never requested while edit mode is off — see EditableText for why that
   placement matters. */
const Impl = dynamic(() => import('./EditableRichImpl.tsx'), { ssr: false });

export type EditableRichProps = {
  path: string;
  /** Already-sanitised HTML from the server. What the editor edits. */
  value: string;
  /** What to SHOW, when that differs from what to edit — the same prose with
      cross-links woven in. Decoration derived at render time, never stored:
      the box must open on `value` or the next commit would capture the
      generated markup and fossilise it. See lib/wikilinks.ts. */
  display?: string;
  className?: string;
};

export function EditableRich({ path, value, display, className }: EditableRichProps) {
  const html = useCmsValue(path, value);
  const editing = useEditMode();
  /* The draft is the authority the moment it differs from the server value —
      a sentence being rewritten cannot show links computed for the old one. */
  const shown = display !== undefined && html === value ? display : html;

  /* Sanitised again on the way out even though the server did it, because in
     edit mode this value is the DRAFT — it never went through the server. */
  if (!editing) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: shown }} />;
  }
  return <Impl path={path} html={sanitizeRich(html)} display={shown} className={className} />;
}
