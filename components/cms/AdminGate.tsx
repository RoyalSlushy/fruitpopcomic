'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { CMS_OPEN } from './CmsHatch.tsx';

/* The only admin-related thing a visitor downloads: this file.
 *
 * The marker cookie is read HERE, on the client, rather than with cookies() in
 * the layout. A cookies() call in a root layout makes every route dynamic and
 * takes the whole site off the CDN — for everyone, forever, to detect something
 * that is false for almost every request. */

const AdminRoot = dynamic(() => import('./AdminRoot.tsx'), { ssr: false });

const HINT = /(?:^|;\s*)fp_cms_ui=1(?:;|$)/;
/* The marker's own name, spelled once more so closing can clear it. It is the
   readable half of the pair — the session cookie is httpOnly and only the
   server can touch it. */
const MARKER = 'fp_cms_ui';

export function AdminGate() {
  const [wanted, setWanted] = useState(false);
  /* Whether a click asked for this, as opposed to a marker cookie or a #cms
     landing. Only a click earns the focus. */
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const check = () => {
      if (HINT.test(document.cookie) || location.hash === '#cms') setWanted(true);
    };
    const open = () => { setAsked(true); setWanted(true); };
    check();
    /* #cms is the bootstrap for a first sign-in. Without this listener it only
       works on a full page load, because a hash change does not remount. */
    addEventListener('hashchange', check);
    /* The footer gear. Same destination, no hash left in the URL. */
    addEventListener(CMS_OPEN, open);
    return () => {
      removeEventListener('hashchange', check);
      removeEventListener(CMS_OPEN, open);
    };
  }, []);

  /* Putting the editor away. Two things ask for this: pressing Done, and
     clicking off the sign-in box. Both mean "I am not editing", so both take
     the whole editor off the page rather than leaving a password field parked
     over the site.

     Clearing the marker is what makes it stick. The marker is the only reason
     this component loads the editor on a page load nobody asked for, so a
     dismissal that left it set would be undone by the next reload. It carries
     no authority either way — signing out is the logout route's job, and it
     clears the signed session cookie server-side. */
  const close = useCallback(() => {
    setWanted(false);
    setAsked(false);
    document.cookie = `${MARKER}=; Max-Age=0; path=/; SameSite=Strict`;
    /* #cms is the other thing `check` reopens from, and it survives a reload
       in the URL. Dropped without a navigation, so nothing scrolls. */
    if (location.hash === '#cms') {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }, []);

  /* Forging the marker gets you the editor shell and a 401 on every write.
     It grants nothing — the session cookie is httpOnly and signed, and the
     database has no write policy at all. */
  if (!wanted) return null;
  return <AdminRoot autoFocus={asked} onClose={close} />;
}
