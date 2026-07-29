'use client';

import dynamic from 'next/dynamic';
import type { ElementType } from 'react';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';

/* The visitor-facing half, and all of it that ships to visitors.
 *
 * `dynamic()` sits at module scope on purpose: next/dynamic is React.lazy
 * underneath, so the factory runs on the first render of <Impl/> and never at
 * import time. Edit mode is false for every visitor, <Impl/> never renders, and
 * the admin chunk is never requested. Calling dynamic() inside the component
 * body would instead create a fresh lazy type per render and remount the node
 * on every keystroke. */
const Impl = dynamic(() => import('./EditableTextImpl.tsx'), { ssr: false });

export type EditableTextProps = {
  path: string;
  value: string;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  /** allow newlines; Enter inserts one and Cmd/Ctrl+Enter commits */
  multiline?: boolean;
};

export function EditableText({
  path, value, as: As = 'span', className, style, multiline,
}: EditableTextProps) {
  const text = useCmsValue(path, value);
  const editing = useEditMode();

  /* Identical markup to hand-written HTML: no role, no tabIndex, no data-*. */
  if (!editing) return <As className={className} style={style}>{text}</As>;

  return <Impl as={As} path={path} text={text} className={className} style={style} multiline={multiline} />;
}
