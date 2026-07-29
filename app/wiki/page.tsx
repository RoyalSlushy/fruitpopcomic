import Link from 'next/link';
import { getSection } from '../../lib/cms-server.ts';
import { EditableText } from '../../components/cms/EditableText.tsx';
import { EditableImage } from '../../components/cms/EditableImage.tsx';

export default async function WikiIndex() {
  const wiki = await getSection('wiki');
  const live = wiki.entries.filter((e) => e.published);

  return (
    <section className="view view--panel">
      <div className="panel" style={{ '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)', '--ch-ink': 'var(--navy)' } as React.CSSProperties}>
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
          <div className="wiki">
            {wiki.categories.map((cat) => {
              const rows = live.filter((e) => e.category === cat.id);
              if (!rows.length) return null;
              return (
                <section className="wiki__group" key={cat.id}>
                  <h3 className="wiki__cat">{cat.label}</h3>
                  <ul className="wiki__list">
                    {rows.map((e) => {
                      const i = wiki.entries.indexOf(e);
                      return (
                        <li key={e.id || e.slug}>
                          <Link className="wiki__card" href={`/wiki/${encodeURIComponent(e.slug)}`}>
                            {e.image
                              ? <EditableImage path={`wiki.entries.${i}.image`} value={e.image} alt="" width={120} height={120} />
                              : <span className="wiki__card-mark" aria-hidden="true" />}
                            <span className="wiki__card-body">
                              <EditableText as="span" className="wiki__card-title" path={`wiki.entries.${i}.title`} value={e.title} />
                              {e.summary && (
                                <EditableText as="span" className="wiki__card-sum" path={`wiki.entries.${i}.summary`} value={e.summary} multiline />
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
