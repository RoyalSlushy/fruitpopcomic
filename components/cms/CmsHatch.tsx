'use client';

import { Gear } from '../site/Glyph.tsx';

/* The way in to the editor: a quiet gear in the footer.
 *
 * It ships to every visitor, and that is fine — it reveals nothing. Opening the
 * editor shell without the password gets you a sign-in form and a 401 on every
 * write; the session cookie is httpOnly and signed, and `site_content` has no
 * write policy at all. The gear is discoverability, not a lock.
 *
 * A custom event rather than a link to #cms: the hash still works and is still
 * the documented bootstrap, but an unknown fragment scrolls the page to the top
 * and then sticks in the URL to be copied and shared. This does neither.
 *
 * Importing AdminRoot from here would undo the whole dynamic() split and put
 * the editor in every visitor's bundle, so this file knows nothing about it —
 * it shouts, and AdminGate listens. */

export const CMS_OPEN = 'fp:cms-open';

export function CmsHatch() {
  return (
    <button
      type="button"
      className="foot__cms"
      aria-label="Open the site editor"
      title="Site editor"
      onClick={() => dispatchEvent(new Event(CMS_OPEN))}
    >
      <Gear />
    </button>
  );
}
