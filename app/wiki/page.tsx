import Link from 'next/link';
import { getSection } from '../../lib/cms-server.ts';
import { EditableText } from '../../components/cms/EditableText.tsx';
import { WikiIndexList } from '../../components/site/WikiIndexList.tsx';

export default async function WikiIndex() {
  const wiki = await getSection('wiki');
  const live = wiki.entries.filter((e) => e.published);

  return (
    <section className="view view--panel">
      <div className="slab slab--bare" style={{ '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)', '--ch-ink': 'var(--navy)' } as React.CSSProperties}>
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">Wiki</h1>
              {live.length > 0 && <p className="panel__count"><span>{live.length}</span></p>}
            </div>

            {/* The empty state appears only when the shelf is genuinely empty. */}
            {live.length === 0 ? (
              <div className="empty">
                <div className="empty__mark" aria-hidden="true">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 14h18a6 6 0 0 1 6 6v30a6 6 0 0 0-6-6H8z" />
                    <path d="M56 14H38a6 6 0 0 0-6 6v30a6 6 0 0 1 6-6h18z" />
                  </svg>
                </div>
                <EditableText as="h2" path="wiki.empty.title" value={wiki.empty.title} />
                <EditableText as="p" path="wiki.empty.body" value={wiki.empty.body} multiline />
                <Link className="btn btn--solid" href={wiki.empty.ctaHref}>{wiki.empty.cta}</Link>
              </div>
            ) : (
              /* Grouping lives in a client component so an entry whose
                 category changes in the editor walks to its new shelf without
                 a save-and-reload. See WikiIndexList for the shape. */
              <WikiIndexList categories={wiki.categories} entries={wiki.entries} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
