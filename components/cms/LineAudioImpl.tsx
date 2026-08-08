'use client';

import { useRef, useState } from 'react';
import { useCms } from '../../lib/cms-context.tsx';
import { clipSrc, withClip, withoutClip } from '../../lib/clips.ts';
import { folderFor, uploadMedia } from './upload.ts';
import type { LineAudioProps } from './LineAudio.tsx';

/* Attach a recording to one script beat.
 *
 * The whole array is rewritten rather than one index patched. That is not
 * laziness: `mergeArray` takes a list's length and order from what is stored,
 * so replacing the array is the supported operation, and it avoids having to
 * know or maintain a clip's position. `withClip` replaces by key, so recording
 * a line twice does not accumulate rows.
 *
 * `said` goes in with the clip so that editing the line later leaves an orphan
 * that can be read and re-attached instead of an anonymous dead row. */
export default function LineAudioImpl({ path, clips, lineKey, said }: LineAudioProps) {
  const input = useRef<HTMLInputElement>(null);
  const { write } = useCms();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const has = clipSrc(clips, lineKey) !== null;

  const pick = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const src = await uploadMedia(file, folderFor(path));
      write(path, withClip(clips, lineKey, src, said));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="cms-clip" data-cms-label="Line recording">
      <button
        type="button"
        className="cms-clip__btn"
        disabled={busy}
        aria-label={`${has ? 'Replace' : 'Add'} the recording for "${said}"`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
      >
        {busy ? '…' : has ? 'Re-record' : 'Record'}
      </button>

      {has && (
        <button
          type="button"
          className="cms-clip__btn cms-clip__btn--off"
          aria-label={`Remove the recording for "${said}"`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            write(path, withoutClip(clips, lineKey));
          }}
        >
          Clear
        </button>
      )}

      {err && <span className="cms-clip__err" role="alert">{err}</span>}

      <input
        ref={input}
        type="file"
        accept="audio/*"
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
