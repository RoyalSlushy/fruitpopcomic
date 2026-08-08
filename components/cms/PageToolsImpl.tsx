'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCms, useCmsValue } from '../../lib/cms-context.tsx';
import { labelFor } from '../../lib/cms-schema.ts';
import { mediaURL } from '../../lib/media.ts';
import { folderFor, uploadMedia } from './upload.ts';
import LineAudioImpl from './LineAudioImpl.tsx';
import { scriptLines } from '../../lib/script.ts';
import { clipSrc, orphanClips, withClip, withoutClip } from '../../lib/clips.ts';
import type { PageClip } from '../../content/pages.ts';

/* Everything you can change about the page you are looking at, in one sheet.
 *
 * It exists because the reader had no editing affordance at all. The page image
 * was a plain <img> — the drawing itself, the one thing a comic CMS has to be
 * able to replace, was reachable from nowhere — and the script was a dashed box
 * in a column that is a drawer on a phone. Both of the site's other affordances
 * are hover-shaped: a chip on hover, a Replace button over an image on hover.
 * A phone has no hover, so on a phone they did not exist.
 *
 * So the gesture the reader already has does the work. In edit mode a tap on
 * the page raises this instead of retracting the chrome; a tap outside it, or
 * Escape, puts it away. Nothing here is phone-only — the same tap works with a
 * mouse, and one surface that behaves the same everywhere beats a desktop copy
 * and a phone copy that drift apart.
 *
 * Portalled to <body> deliberately. The reader's own history is a list of
 * things that could be seen and not touched, all of them positioned boxes
 * nested inside a filtered, clipped, contained subtree; a direct child of body
 * has no ancestor that can contain it, clip it, or eat its taps. */

type Field = 'image' | 'thumb';

export default function PageToolsImpl({
  index, page, image, thumb, script, audio, onClose,
}: {
  index: number;
  page: number;
  image: string;
  thumb: string;
  script: string;
  audio: PageClip[];
  onClose: () => void;
}) {
  const { write } = useCms();
  const imagePath = `pages.items.${index}.image`;
  const thumbPath = `pages.items.${index}.thumb`;
  const scriptPath = `pages.items.${index}.script`;
  const audioPath = `pages.items.${index}.audio`;

  const src = useCmsValue(imagePath, image);
  const thumbSrc = useCmsValue(thumbPath, thumb);
  const text = useCmsValue(scriptPath, script);
  const clips: PageClip[] = useCmsValue(audioPath, audio) ?? [];

  /* Read from the SAVED script rather than the textarea draft: a key computed
     from half-typed words would file a recording under a beat that stops
     existing the moment the sentence is finished. */
  const lines = scriptLines(text);
  const orphans = orphanClips(lines, clips);

  const sheet = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const target = useRef<Field>('image');
  const [busy, setBusy] = useState<Field | null>(null);
  const [err, setErr] = useState<string | null>(null);

  /* The script box is a plain textarea rather than the contenteditable the
     rest of the CMS uses, and that is the point: this is the phone's editor,
     where a real form control gets a real keyboard, an undo stack and a
     selection that does not fight the page's own gestures. */
  const [draft, setDraft] = useState(script);
  useEffect(() => { setDraft(text); }, [text]);

  /* Committed on blur, and again on the way out — dismissing the sheet by
     tapping away unmounts it, and an unmount does not reliably blur. Read
     through refs so the cleanup cannot commit a stale draft. */
  const live = useRef({ draft, text });
  live.current = { draft, text };
  const commit = useCallback(() => {
    const { draft: d, text: t } = live.current;
    const next = d.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (next !== t) write(scriptPath, next);
  }, [scriptPath, write]);
  useEffect(() => commit, [commit]);

  const pick = async (f: File) => {
    const field = target.current;
    setBusy(field);
    setErr(null);
    const path = field === 'image' ? imagePath : thumbPath;
    try {
      write(path, await uploadMedia(f, folderFor(path)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const choose = (field: Field) => {
    target.current = field;
    file.current?.click();
  };

  /* Same dismissal the reader's drawers use, and for the same reason:
     pointerdown cannot race the compatibility mouse events a touch screen
     synthesises after a tap. The press that opened this sheet was dispatched
     before the listener existed, so it cannot close itself on the way up. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!sheet.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();                  // the reader must not also act on it
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="pgt"
      ref={sheet}
      role="dialog"
      aria-label={`Page ${page} — image and script`}
    >
      <div className="pgt__bar">
        <span className="pgt__tag">Page {String(page).padStart(2, '0')}</span>
        <button className="pgt__x" type="button" onClick={onClose} aria-label="Close page options">
          ✕
        </button>
      </div>

      <div className="pgt__row">
        <span className="pgt__shot">
          {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaURL(src)} alt="" width={44} height={66} />
            : <span className="pgt__blank" aria-hidden="true">—</span>}
        </span>
        <span className="pgt__col">
          <b>{labelFor(imagePath) ?? 'Page image'}</b>
          {/* A page with no drawing is not broken, it is a script page — the
              running order is built before the art is. Saying so here is what
              makes "Upload" read as finishing the page rather than fixing it. */}
          <span className="pgt__meta">{src || 'Not drawn yet — this page is its script until a drawing lands here.'}</span>
        </span>
        <button
          className="pgt__btn"
          type="button"
          disabled={busy !== null}
          onClick={() => choose('image')}
        >
          {busy === 'image' ? 'Uploading…' : src ? 'Replace' : 'Upload'}
        </button>
      </div>

      <div className="pgt__row">
        <span className="pgt__shot">
          {thumbSrc || src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaURL(thumbSrc || src)} alt="" width={44} height={66} />
            : <span className="pgt__blank" aria-hidden="true">—</span>}
        </span>
        <span className="pgt__col">
          <b>{labelFor(thumbPath) ?? 'Thumbnail'}</b>
          <span className="pgt__meta">{thumbSrc || 'Empty — the strip falls back to the page image.'}</span>
        </span>
        <button
          className="pgt__btn"
          type="button"
          disabled={busy !== null}
          onClick={() => choose('thumb')}
        >
          {busy === 'thumb' ? 'Uploading…' : thumbSrc ? 'Replace' : 'Upload'}
        </button>
      </div>

      <label className="pgt__script">
        <b>Script</b>
        {/* The schema's own words for this field, which are a sentence rather
            than a name — as a heading it wrapped to two lines, as a hint under
            one it is the instruction it was written to be. */}
        <span className="pgt__meta">{labelFor(scriptPath)?.replace(/^[^—]*—\s*/, '') ?? 'One beat per line.'}</span>
        <textarea
          className="pgt__text"
          value={draft}
          rows={6}
          spellCheck
          placeholder={'One beat per line.\nNAME: a line of dialogue.'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          /* The reader turns pages on the arrow keys, and the sheet's own
             Escape listener sits on the document. Neither may reach a key
             pressed inside a text box, so Escape is handled here instead of
             doing nothing at all. */
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { commit(); onClose(); }
          }}
        />
      </label>

      {/* Recordings.
          The per-line control in the script column is a hover affordance, and
          the whole reason this sheet exists is that hover affordances do not
          exist on a phone. So every beat is listed here too — same control,
          reachable by tap. */}
      {lines.length > 0 && (
        <div className="pgt__script">
          <b>Recordings</b>
          <ul className="pgt__orphans">
            {lines.map((l) => (
              <li className="pgt__orphan" key={l.key}>
                <q>{l.text}</q>
                {clipSrc(clips, l.key) !== null && <b aria-hidden="true">●</b>}
                <LineAudioImpl
                  path={audioPath}
                  clips={clips}
                  lineKey={l.key}
                  said={l.speech}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Takes whose line has since been rewritten. They are kept, named by
          what they say, and repairable — losing a recording silently because
          a typo was fixed is not a trade this project makes anywhere else. */}
      {orphans.length > 0 && (
        <div className="pgt__script">
          <b>Recordings with no line</b>
          <ul className="pgt__orphans">
            {orphans.map((c) => (
              <li className="pgt__orphan" key={c.key}>
                <q>{c.said || 'unnamed'}</q>
                <select
                  className="pgt__select"
                  value=""
                  aria-label={`Re-attach the recording of "${c.said}" to a line`}
                  onChange={(e) => {
                    const to = e.target.value;
                    if (!to) return;
                    const line = lines.find((l) => l.key === to);
                    if (!line) return;
                    write(audioPath,
                      withClip(withoutClip(clips, c.key), line.key, c.src, line.speech));
                  }}
                >
                  <option value="">Re-attach to…</option>
                  {lines.map((l) => (
                    <option key={l.key} value={l.key}>{l.text}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cms-clip__btn cms-clip__btn--off"
                  onClick={() => write(audioPath, withoutClip(clips, c.key))}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && <p className="pgt__err" role="alert">{err}</p>}
      <p className="pgt__note">Held as a draft until you press Save on the editor bar.</p>

      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = '';
        }}
      />
    </div>,
    /* An element outside the full-screen one is not rendered at all, so in
       cinematic mode <body> is the one place this must not go. The Reader
       closes the sheet whenever that root changes under it. */
    document.fullscreenElement ?? document.body,
  );
}
