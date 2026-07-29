'use client';

import { useCallback, useEffect, useState } from 'react';
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

export default function AdminRoot({ autoFocus = false }: {
  /** true only when a deliberate click opened this, so landing on a page with
      a stale session never yanks focus into a password box. */
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const cms = useCms();
  const { editMode, enterEditMode, exitEditMode, changedSections, payload, commitSaved, discard } = cms;

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

  const signOut = async () => {
    await fetch('/api/cms/logout', { method: 'POST' });
    exitEditMode();
    setAuthed(false);
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

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="cms-bar cms-bar--gate" data-marker={MARKER}>
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

      <div className="cms-bar" data-marker={MARKER}>
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
