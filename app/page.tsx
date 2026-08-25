import Link from 'next/link';
import { getSection } from '../lib/cms-server.ts';
import { EditableText } from '../components/cms/EditableText.tsx';
import { EditableImage } from '../components/cms/EditableImage.tsx';
import { Glyph } from '../components/site/Glyph.tsx';
import { QuickRail } from '../components/site/QuickRail.tsx';
import { Reel } from '../components/site/Reel.tsx';
import { pad, mediaURL } from '../lib/media.ts';
import { group, isScriptPage } from '../lib/chapters.ts';

/* The dashboard. A server component: every editable value is passed to a leaf
   <EditableText> as `value`, so visitor markup and editor markup are the same. */

export default async function HomePage() {
  const [home, pages, status] = await Promise.all([
    getSection('home'),
    getSection('pages'),
    getSection('status'),
  ]);

  const first = pages.items[0];

  /* CHAPTERS, not pages. This rail listed the first few drafts, which made it
     a second copy of the strip below it — the same ten thumbnails, numbered
     twice. A chapter is the unit a reader picks, so the rail lists those and
     the drafts panel keeps the pages. `count` caps the list the same way it
     always did; /read holds the rest. */
  const rank = group(pages.chapters, pages.items)
    .slice(0, Math.max(0, home.startHere.count));

  return (
    <section className="view view--home">
      <h1 className="sr-only">Fruit Pop Comic</h1>

      <div className="dash">
        {/* THE FIRST SCREEN — the hero, the chapter rail and quick access.
            A wrapper only so those three can be sized against the window as
            one unit on a desktop; it is `display:contents` everywhere else,
            so on a phone the five panels are still five siblings of .dash and
            nothing about that layout knows this element exists. */}
        <div className="dash__screen">
        {/* THE HERO */}
        {/* The channel hue is set on the SLAB, not on the tile inside it. The
            plinth under a cut panel is painted by the slab — a clip-path clips
            a box-shadow away with everything else — so the slab is what has to
            know which channel it belongs to.

            `slab--bare` because this one has no ribbon: the padding-top on a
            .slab exists only to hold the caption box that overhangs its corner,
            and without one it is a gap over the artwork. */}
        <div className="slab slab--bare dash__hot" style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}>
          <Link className="ch hero" href="/read">
            <EditableText as="span" className="ch__badge" path="home.hero.badge" value={home.hero.badge} />
            {/* .ch__in is the tile's interior. The cut corners live on a clip-path,
                and a clip-path clips a border square, so the white keyline is the
                outer element's own background showing through its padding — which
                only works if something inside carries the cut through to the
                interior edge. This is that something. */}
            <span className="ch__in">
              <span className="hero__screen">
                {/* The biggest picture on the site, and until now the only one
                    with no way to change it — it is page one's artwork, so it
                    was editable everywhere except where it is actually seen.
                    EditableImage puts the replace control on it in edit mode
                    and renders the same bare <img> for everyone else. */}
                {first ? (
                  <EditableImage
                    path="pages.items.0.image"
                    value={first.image}
                    alt=""
                    width={1080}
                    height={1620}
                  />
                ) : null}
                <span className="ch__scan" aria-hidden="true" />
              </span>
              <span className="hero__body">
                <EditableText as="span" className="hero__title" path="home.hero.title" value={home.hero.title} />
                <EditableText as="span" className="hero__sub" path="home.hero.sub" value={home.hero.sub} multiline />
                <EditableText as="span" className="btn btn--solid" path="home.hero.cta" value={home.hero.cta} />
                {/* The shelf the button hangs over is the pages themselves,
                    drifting. `slice(1)` because page one is the artwork
                    directly above it — the same drawing twice on one screen
                    reads as a bug rather than a slideshow. */}
                <Reel pages={pages.items.slice(1).map((p) => mediaURL(p.image))} />
              </span>
            </span>
          </Link>
        </div>

        {/* START HERE — the real drafts in order, no invented metrics */}
        <div className="slab dash__start" style={{ '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)' } as React.CSSProperties}>
          <EditableText as="span" className="ribbon" path="home.ribbons.start" value={home.ribbons.start} />
          <div className="pane">
            <h2 className="sr-only">Start here — the chapters in order</h2>
            <ol className="rank">
              {rank.map((g, i) => {
                const cover = g.pages[0];
                /* A chapter with no pages yet still gets a row — it is part of
                   the shape of the comic — but it has nowhere to open, so it
                   points at the shelf rather than at a page that isn't there. */
                const href = cover ? `/read/${cover.index + 1}` : '/read';
                const art = cover && !isScriptPage(cover.page)
                  ? mediaURL(cover.page.thumb || cover.page.image)
                  : '';
                return (
                  <li key={g.chapter?.id ?? `unsorted-${i}`}>
                    <Link className="rank__row" href={href}>
                      <span className="rank__n">{g.chapter ? pad(i) : '—'}</span>
                      {art ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="rank__thumb" src={art} alt="" width={38} height={57} />
                      ) : (
                        <span className="rank__thumb rank__thumb--blank" aria-hidden="true" />
                      )}
                      <span className="rank__label">{g.chapter?.title ?? 'Unsorted'}</span>
                      <span className="rank__chip">
                        {g.pages.length} {g.pages.length === 1 ? 'page' : 'pages'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="rank__foot">
              <Link className="rank__all" href="/read">
                <EditableText as="span" path="home.startHere.seeAll" value={home.startHere.seeAll} />
              </Link>
            </p>
          </div>
        </div>

        {/* QUICK ACCESS */}
        <div className="slab dash__quick" style={{ '--ch': 'var(--indigo)', '--ch-dp': 'var(--indigo-dp)' } as React.CSSProperties}>
          <EditableText as="span" className="ribbon" path="home.ribbons.quick" value={home.ribbons.quick} />
          <div className="pane quick">
            <h2 className="sr-only">Jump to a section</h2>
            <QuickRail>
              {home.quick.map((t, i) => (
                <Link
                  key={t.id}
                  className="ch ch--mini"
                  href={t.href}
                  style={{
                    '--ch': `var(--${t.hue})`,
                    '--ch-dp': `var(--${t.hue}-dp)`,
                    '--ch-ink': t.hue === 'indigo' ? '#fff' : 'var(--navy)',
                  } as React.CSSProperties}
                >
                  <span className="ch__in">
                    <span className="ch__screen ch__screen--glyph" aria-hidden="true">
                      <Glyph name={t.glyph} width={4.5} />
                    </span>
                    <span className="ch__plate">
                      <EditableText as="span" className="ch__name" path={`home.quick.${i}.label`} value={t.label} />
                      <EditableText as="span" className="ch__sub" path={`home.quick.${i}.sub`} value={t.sub} />
                    </span>
                  </span>
                </Link>
              ))}
            </QuickRail>
          </div>
        </div>

        </div>

        {/* THE DRAFTS */}
        <div className="slab dash__drafts" style={{ '--ch': 'var(--cyan)', '--ch-dp': 'var(--cyan-dp)' } as React.CSSProperties}>
          <EditableText as="span" className="ribbon" path="home.ribbons.drafts" value={home.ribbons.drafts} />
          <div className="pane">
            <h2 className="sr-only">Every page draft</h2>
            <div className="cardrow">
              {pages.items.map((p, i) => (
                <Link
                  key={p.id}
                  className="card"
                  href={`/read/${i + 1}`}
                  aria-label={`${p.isDraft ? 'Draft' : 'Page'} ${pad(i)} of ${pages.items.length}`}
                >
                  {i === 0 && <span className="badge">Start</span>}
                  <EditableImage path={`pages.items.${i}.thumb`} value={p.thumb || p.image} alt="" width={144} height={216} />
                  <span className="card__foot">
                    <span className="card__n">{pad(i)}</span>
                    <span className="card__stage">{p.stage}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* BUILD STATUS — where a portal puts a daily mission */}
        <div className="slab dash__status" style={{ '--ch': 'var(--peach)', '--ch-dp': 'var(--peach-dp)' } as React.CSSProperties}>
          <EditableText as="span" className="ribbon" path="home.ribbons.status" value={home.ribbons.status} />
          <div className="pane">
            <h2 className="sr-only">What is finished and what is pending</h2>
            <ul className="status">
              {status.rows.map((r, i) => (
                <li key={r.id}>
                  <span className={`status__mark status__mark--${r.state}`} aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {r.state === 'done' ? <path d="M2 6.5 5 9.5 10 3" />
                        : r.state === 'wip' ? <path d="M2 6h8" />
                        : <circle cx="6" cy="6" r="3.6" />}
                    </svg>
                  </span>
                  <EditableText as="span" className="status__label" path={`status.rows.${i}.label`} value={r.label} />
                  <EditableText as="span" className="status__note" path={`status.rows.${i}.note`} value={r.note} />
                  {r.chip ? (
                    <EditableText
                      as="span"
                      className={`status__chip${r.state === 'done' ? ' status__chip--done' : ''}`}
                      path={`status.rows.${i}.chip`}
                      value={r.chip}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}
