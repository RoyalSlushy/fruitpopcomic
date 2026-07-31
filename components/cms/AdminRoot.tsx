'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCms } from '../../lib/cms-context.tsx';
import type { Sections } from '../../lib/cms.ts';
import './admin.css';

/* Everything in this module and its imports is the admin chunk. It is only ever
   reached through AdminGate's dynamic({ssr:false}), so a visitor's waterfall
   never contains it. Keep it that way: nothing outside components/cms/*Impl or
   this file may be imported from a non-dynamic path. */

const MARKER = 'fp-cms-admin-chunk';   // grepped for by scripts/assert-visitor-bundle.mjs

type Status = 'idle' | 'saving' | 'saved' | 'error';

export default function AdminRoot({ autoFocus = false, onClose }: {
  /** true only when a deliberate click opened this, so landing on a page with
      a stale session never yanks focus into a password box. */
  autoFocus?: boolean;
  /** Take the editor off the page entirely. See AdminGate. */
  onClose: () => void;
}) {
  const router = useRouter();
  const cms = useCms();
  const { editMode, enterEditMode, exitEditMode, changedSections, payload, commitSaved, discard } = cms;

  /* The bar is fixed to the bottom of the viewport, which is exactly where the
     reader keeps its page strip — those thumbnails could not be reached at
     all. Rather than pick a different corner for it to be in the way of, it
     folds down to a pill. */
  const [slim, setSlim] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const start = useCallback(async () => {
    const res = await fetch('/api/cms/content');
    if (!res.ok) {
      setAuthed(false);
      return;
    }
    const { content } = (await res.json()) as { content: Sections };
    enterEditMode(content);
    setAuthed(true);
  }, [enterEditMode]);

  useEffect(() => { void start(); }, [start]);

  /* An unsaved edit must not vanish to a stray reload. */
  const dirtyCount = editMode ? changedSections().length : 0;
  useEffect(() => {
    if (!dirtyCount) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirtyCount]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/cms/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(json.error ?? 'Could not sign in.');
      return;
    }
    setPassword('');
    await start();
  };

  /* Done means done. Signing out used to drop back to the sign-in box, which
     is the one thing someone who just left the editor is not asking for — it
     left a password field over the site until the page was reloaded. The
     server has cleared both cookies by then, so there is nothing to come back
     to anyway. */
  const signOut = async () => {
    await fetch('/api/cms/logout', { method: 'POST' });
    exitEditMode();
    setAuthed(false);
    onClose();
  };

  const save = async () => {
    const sections = payload();
    if (Object.keys(sections).length === 0) {
      setStatus('saved');
      setMessage('Nothing changed.');
      setTimeout(() => setStatus('idle'), 1800);
      return;
    }
    setStatus('saving');
    setMessage(null);

    /* Blur any open editor first: committing mid-session and then refreshing
       would pull the node out from under the caret. */
    (document.activeElement as HTMLElement | null)?.blur();

    try {
      const res = await fetch('/api/cms/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const json = (await res.json()) as { error?: string; saved?: string[] };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      commitSaved();
      setStatus('saved');
      setMessage(`Saved ${json.saved?.join(', ')}`);
      router.refresh();
      setTimeout(() => setStatus('idle'), 2400);
    } catch (err) {
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  /* The sign-in box is dismissible, and only the sign-in box is: an editing
     session holds unsaved work, so it is closed by Done and by nothing else.
     The gate holds nothing. It is a bar over the site that anyone can raise
     from the footer gear, so putting it away has to be as cheap as opening it
     — a press anywhere outside it, or Escape.

     pointerdown rather than click, for the reason the reader's drawers give:
     it cannot race the compatibility mouse events a touch screen synthesises
     after a tap. The press that opened this one has already been dispatched by
     the time the listener exists, so it cannot close itself on the way up. */
  const gate = useRef<HTMLDivElement>(null);
  const dismissable = authed === false;
  useEffect(() => {
    if (!dismissable) return;
    const onDown = (e: PointerEvent) => {
      if (!gate.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dismissable, onClose]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="cms-bar cms-bar--gate" data-marker={MARKER} ref={gate}>
        <form className="cms-login" onSubmit={signIn}>
          <label className="cms-login__label" htmlFor="cms-pw">Editor password</label>
          <input
            id="cms-pw"
            className="cms-login__input"
            type="password"
            autoComplete="current-password"
            autoFocus={autoFocus}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn--solid" type="submit">Sign in</button>
          {message && <span className="cms-bar__msg cms-bar__msg--bad" role="alert">{message}</span>}
          {/* Clicking away does the same thing. This is the visible half of
              it: a way out that does not have to be guessed at, and the only
              one a keyboard reaches without knowing Escape closes this. */}
          <button
            className="cms-bar__fold"
            type="button"
            onClick={onClose}
            aria-label="Close the editor"
          >
            ✕
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {/* Referenced once so screen readers can explain the affordance without
          repeating it on every field. */}
      <span id="cms-edit-hint" className="sr-only">
        Press F2 or click to edit this text. Enter commits, Escape cancels.
      </span>

      <div className={`cms-bar${slim ? ' is-slim' : ''}`} data-marker={MARKER}>
        <button
          className="cms-bar__fold"
          type="button"
          aria-expanded={!slim}
          aria-label={slim ? 'Show the editor bar' : 'Fold the editor bar out of the way'}
          onClick={() => setSlim((v) => !v)}
        >
          {slim ? '▴' : '▾'}
          {slim && dirtyCount > 0 && <span className="cms-bar__dot" aria-hidden="true" />}
        </button>
        <span className="cms-bar__tag">Editing</span>
        <span className="cms-bar__count">
          {dirtyCount === 0 ? 'No changes' : `${dirtyCount} section${dirtyCount === 1 ? '' : 's'} changed`}
        </span>
        <button className="btn btn--solid" type="button" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" type="button" onClick={discard} disabled={!dirtyCount}>Discard</button>
        <button className="btn" type="button" onClick={signOut}>Done</button>
        {message && (
          <span className={`cms-bar__msg${status === 'error' ? ' cms-bar__msg--bad' : ''}`} role="status">
            {message}
          </span>
        )}
      </div>
    </>
  );
}
