import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSection } from '../../../lib/cms-server.ts';
import { EditableText } from '../../../components/cms/EditableText.tsx';
import { EditableImage } from '../../../components/cms/EditableImage.tsx';
import { Speak } from '../../../components/site/Speak.tsx';
import { passage, toSpeech } from '../../../lib/speech.ts';
import { splitBody } from '../../../lib/wiki.ts';

export async function generateStaticParams() {
  const wiki = await getSection('wiki');
  return wiki.entries.filter((e) => e.published).map((e) => ({ slug: e.slug }));
}

/* Bodies are written by the one person who can log in, so HTML is allowed
   through. Plain text is auto-paragraphed for convenience. */
function bodyHTML(body: string): string {
  const s = (body || '').trim();
  if (!s) return '';
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return s.split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
      .replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export default async function WikiEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wiki = await getSection('wiki');
  const entry = wiki.entries.find((e) => e.slug === slug && e.published);
  if (!entry) notFound();
  const i = wiki.entries.indexOf(entry);
  const cat = wiki.categories.find((c) => c.id === entry.category);

  /* One panel per section rather than one panel for the lot. Every panel here
     is rotated a fraction of a degree, and a rotation pivots about the centre:
     a forty-paragraph entry in a single box swings its far corners well out of
     the column. Split, each box is short enough for the tilt to read as a tilt.
     See lib/wiki.ts. */
  const { lead, sections } = splitBody(bodyHTML(entry.body));
  const gold = { '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)', '--ch-ink': 'var(--navy)' } as React.CSSProperties;

  return (
    <section className="view view--panel view--wiki">
      <div className="slab slab--bare" style={gold}>
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">Wiki</h1>
              <Speak text={passage(entry.title, entry.summary, toSpeech(entry.body))} />
            </div>
            <div className="wiki">
              <p className="wiki__back"><Link className="btn" href="/wiki">← All entries</Link></p>
              <article className="wiki__article">
                {entry.image && (
                  <EditableImage className="wiki__hero" path={`wiki.entries.${i}.image`} value={entry.image} alt="" />
                )}
                <p className="wiki__tag">{cat?.label ?? 'Lore'}</p>
                <EditableText as="h2" path={`wiki.entries.${i}.title`} value={entry.title} />
                {entry.summary && (
                  <EditableText as="p" className="wiki__sum" path={`wiki.entries.${i}.summary`} value={entry.summary} multiline />
                )}
                {lead && <div className="prose" dangerouslySetInnerHTML={{ __html: lead }} />}
              </article>
            </div>
          </div>
        </div>
      </div>

      {sections.map((sec, n) => (
        <div className="slab slab--bare wiki__section" key={`${sec.heading}-${n}`} style={gold}>
          <div className="panel">
            <div className="panel__in">
              <div
                className="prose"
                aria-label={sec.heading || undefined}
                dangerouslySetInnerHTML={{ __html: sec.html }}
              />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
