'use client';

import dynamic from 'next/dynamic';
import { useEditMode } from '../../lib/cms-context.tsx';

/* What a held page offers. Renders nothing at all for visitors, so the markup
   they receive is unchanged by the CMS existing — same split as ListControls
   and PageTools. */
const Impl = dynamic(() => import('./PageMenuImpl.tsx'), { ssr: false });

export type PageMenuProps = {
  /** the LIST path, e.g. "pages.items" */
  listPath: string;
  /** index into that flat list */
  index: number;
  /** 1-based page number as shown to the reader, for the heading */
  page: number;
  /** the held page's chapter id, so a page added after it joins the same one */
  chapter: string;
  /** open the full image/script sheet for this page */
  onEdit: () => void;
  onClose: () => void;
};

export function PageMenu(props: PageMenuProps) {
  if (!useEditMode()) return null;
  return <Impl {...props} />;
}
