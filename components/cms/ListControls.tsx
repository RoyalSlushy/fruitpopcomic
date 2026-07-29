'use client';

import dynamic from 'next/dynamic';
import { useEditMode } from '../../lib/cms-context.tsx';

/* Add / move / delete for a list. Renders nothing at all for visitors, so the
   markup they receive is unchanged by the CMS existing. */
const Impl = dynamic(() => import('./ListControlsImpl.tsx'), { ssr: false });

export type ListControlsProps = {
  /** the LIST path, e.g. "status.rows" */
  listPath: string;
  index: number;
  length: number;
};

export function ListControls(props: ListControlsProps) {
  if (!useEditMode()) return null;
  return <Impl {...props} />;
}

/** The trailing "+ Add" button for a list. */
export function ListAdd({ listPath, length }: { listPath: string; length: number }) {
  if (!useEditMode()) return null;
  return <Impl listPath={listPath} index={length} length={length} addOnly />;
}
