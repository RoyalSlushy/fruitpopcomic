import Link from 'next/link';

/* The app's own 404. Without this file Next serves its bare built-in page,
   which lands outside the shell and looks nothing like the site. Reachable
   from any missed path, and from notFound() in /wiki/[slug] — which every
   slug hits while the wiki is still empty. */

export default function NotFound() {
  return (
    <section className="view view--panel">
      <div className="panel" style={{ '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)', '--ch-ink': 'var(--navy)' } as React.CSSProperties}>
        <div className="panel__bar">
          <Link className="btn btn--back" href="/">Menu</Link>
          <h1 className="panel__title">Not found</h1>
        </div>

        <div className="empty">
          <div className="empty__mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="32" cy="32" r="24" />
              <path d="M24 26h.02M40 26h.02" />
              <path d="M23 43c5-5 13-5 18 0" />
            </svg>
          </div>
          <h2>There is nothing at this address</h2>
          <p>
            The page may have moved, or it may never have existed. The menu has
            everything the site actually holds.
          </p>
          <Link className="btn btn--solid" href="/">Back to the menu</Link>
        </div>
      </div>
    </section>
  );
}
