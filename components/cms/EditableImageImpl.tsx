'use client';

import { useRef, useState } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';
import { mediaURL } from '../../lib/media.ts';

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
      const body = new FormData();
      body.append('file', file);
      body.append('folder', path.split('.')[0] ?? 'uploads');
      const res = await fetch('/api/cms/upload', { method: 'POST', body });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !json.path) throw new Error(json.error || `HTTP ${res.status}`);
      write(path, json.path);
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
      <button
        type="button"
        className="cms-img__btn"
        aria-label={`Replace ${labelFor(path) ?? 'image'}`}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
      >
        {busy ? '…' : 'Replace'}
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
