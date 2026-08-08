'use client';

import dynamic from 'next/dynamic';
import { useEditMode } from '../../lib/cms-context.tsx';
import type { PageClip } from '../../content/pages.ts';

/* Same split as EditableImage: a visitor renders nothing at all here, and the
   implementation — which pulls in the uploader — is in the admin chunk.
   scripts/assert-visitor-bundle.mjs fails the build if that stops being true,
   which is the only reason this file is separate from the one below it. */
const Impl = dynamic(() => import('./LineAudioImpl.tsx'), { ssr: false });

export type LineAudioProps = {
  /** the page's clip list, e.g. "pages.items.3.audio" */
  path: string;
  clips: PageClip[];
  /** the beat's content key from lib/script.ts */
  lineKey: string;
  /** what this line says, stored with the clip so an edit is recoverable */
  said: string;
};

export function LineAudio(props: LineAudioProps) {
  if (!useEditMode()) return null;
  return <Impl {...props} />;
}
