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
  /** Already-sanitised HTML from the server. */
  value: string;
  className?: string;
};

export function EditableRich({ path, value, className }: EditableRichProps) {
  const html = useCmsValue(path, value);
  const editing = useEditMode();

  /* Sanitised again on the way out even though the server did it, because in
     edit mode this value is the DRAFT — it never went through the server. */
  if (!editing) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <Impl path={path} html={sanitizeRich(html)} className={className} />;
}
