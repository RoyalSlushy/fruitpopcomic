'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/* The only admin-related thing a visitor downloads: this file.
 *
 * The marker cookie is read HERE, on the client, rather than with cookies() in
 * the layout. A cookies() call in a root layout makes every route dynamic and
 * takes the whole site off the CDN — for everyone, forever, to detect something
 * that is false for almost every request. */

const AdminRoot = dynamic(() => import('./AdminRoot.tsx'), { ssr: false });

const HINT = /(?:^|;\s*)fp_cms_ui=1(?:;|$)/;

export function AdminGate() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const check = () => {
      if (HINT.test(document.cookie) || location.hash === '#cms') setWanted(true);
    };
    check();
    /* #cms is the bootstrap for a first sign-in. Without this listener it only
       works on a full page load, because a hash change does not remount. */
    addEventListener('hashchange', check);
    return () => removeEventListener('hashchange', check);
  }, []);

  /* Forging the marker gets you the editor shell and a 401 on every write.
     It grants nothing — the session cookie is httpOnly and signed, and the
     database has no write policy at all. */
  if (!wanted) return null;
  return <AdminRoot />;
}
