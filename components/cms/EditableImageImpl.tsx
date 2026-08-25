'use client';

import { useRef, useState } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';
import { mediaURL } from '../../lib/media.ts';
import { folderFor, uploadMedia } from './upload.ts';

/* Click to replace. The file goes to /api/cms/upload, which is the only thing
   holding a service-role key; the returned object key is written into the
   draft, and the storage-path convention in lib/media.ts renders it. */
export default function EditableImageImpl({
  path, src, alt, className, width, height,
}: {
  path: string;
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { write } = useCms();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      write(path, await uploadMedia(file, folderFor(path)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="cms-img" data-cms-path={path} data-cms-label={labelFor(path) ?? path}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={className} src={mediaURL(src)} alt={alt} width={width} height={height} />
      {/* An icon, not the word "Replace". The control now appears over artwork
          as well as over thumbnails — the dashboard hero is a full-bleed
          drawing — and a text pill wide enough to read was covering the very
          thing you were deciding whether to change. Black disc, white glyph:
          legible on pale paper and on dark ink alike, which a gold pill was
          not. The label survives as the accessible name and the tooltip. */}
      <button
        type="button"
        className="cms-img__btn"
        title={`Replace ${labelFor(path) ?? 'image'}`}
        aria-label={`Replace ${labelFor(path) ?? 'image'}`}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
      >
        {busy ? <span className="cms-img__spin" aria-hidden="true" /> : <CameraIcon />}
      </button>
      {err && <span className="cms-img__err" role="alert">{err}</span>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = '';
        }}
      />
    </span>
  );
}

/* Inline rather than from components/site/Glyph.tsx: that file ships to
   visitors, and an icon only the editor draws does not belong in it. */
export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.25-.67l.7-1.05A1.5 1.5 0 0 1 9.9 4.6h4.2a1.5 1.5 0 0 1 1.25.68l.7 1.05A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </svg>
  );
}
