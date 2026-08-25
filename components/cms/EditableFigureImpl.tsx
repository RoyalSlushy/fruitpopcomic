'use client';

import { useRef, useState } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';
import { mediaURL } from '../../lib/media.ts';
import { EditableText } from './EditableText.tsx';
import { CameraIcon } from './EditableImageImpl.tsx';
import { folderFor, uploadMedia } from './upload.ts';

/* The editing half of EditableFigure. Only ever loaded in edit mode. */
export default function EditableFigureImpl({
  path, src, alt, className, captionPath, caption,
}: {
  path: string;
  src: string;
  alt: string;
  className?: string;
  captionPath?: string;
  caption: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { write } = useCms();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const what = labelFor(path) ?? 'picture';

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

  const file = (
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
  );

  /* Nothing set yet: an outlined slot rather than a floating button. It has to
     read as "a picture could go here", which a bare button next to a heading
     does not — and it gives the drop target a real size. */
  if (!src) {
    return (
      <div className="cms-fig cms-fig--empty" data-cms-path={path} data-cms-label={what}>
        <button
          type="button"
          className="cms-fig__add"
          disabled={busy}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); input.current?.click(); }}
        >
          {busy ? <span className="cms-img__spin" aria-hidden="true" /> : <CameraIcon />}
          <span>{busy ? 'Uploading…' : `Add ${what.toLowerCase()}`}</span>
        </button>
        {err && <span className="cms-img__err" role="alert">{err}</span>}
        {file}
      </div>
    );
  }

  return (
    <figure className={`${className ?? ''} cms-fig`.trim()} data-cms-path={path} data-cms-label={what}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaURL(src)} alt={alt} />
      <span className="cms-fig__tools">
        <button
          type="button"
          className="cms-img__btn"
          title={`Replace ${what.toLowerCase()}`}
          aria-label={`Replace ${what.toLowerCase()}`}
          disabled={busy}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); input.current?.click(); }}
        >
          {busy ? <span className="cms-img__spin" aria-hidden="true" /> : <CameraIcon />}
        </button>
        <button
          type="button"
          className="cms-img__btn cms-img__btn--del"
          title={`Remove ${what.toLowerCase()}`}
          aria-label={`Remove ${what.toLowerCase()}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            /* Clearing the field, not deleting the block: the words stay put
               and the picture can be added back. No confirm — it is one
               click to undo and nothing else is lost. */
            write(path, '');
          }}
        >✕</button>
      </span>
      {captionPath && (
        <figcaption>
          <EditableText path={captionPath} value={caption} placeholder="Add a caption" />
        </figcaption>
      )}
      {err && <span className="cms-img__err" role="alert">{err}</span>}
      {file}
    </figure>
  );
}
