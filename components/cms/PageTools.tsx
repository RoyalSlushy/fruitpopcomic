'use client';

import dynamic from 'next/dynamic';
import { useEditMode } from '../../lib/cms-context.tsx';

/* The reader's own editing surface. Renders nothing at all for visitors, so
   the markup they receive is unchanged by the CMS existing — same split as
   ListControls and EditableImage. */
const Impl = dynamic(() => import('./PageToolsImpl.tsx'), { ssr: false });

export type PageToolsProps = {
  /** index into the FLAT running order — the thing pages.items is */
  index: number;
  /** 1-based page number as shown to the reader, for the heading */
  page: number;
  /** server values, used until a draft overrides them */
  image: string;
  thumb: string;
  script: string;
  onClose: () => void;
};

export function PageTools(props: PageToolsProps) {
  if (!useEditMode()) return null;
  return <Impl {...props} />;
}
