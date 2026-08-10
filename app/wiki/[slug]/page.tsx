import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSection } from '../../../lib/cms-server.ts';
import { EditableText } from '../../../components/cms/EditableText.tsx';
import { EditableFigure } from '../../../components/cms/EditableFigure.tsx';
import { Speak } from '../../../components/site/Speak.tsx';
import { WikiBlocks } from '../../../components/site/WikiBlocks.tsx';
import { WikiTag } from '../../../components/site/WikiTag.tsx';
import { passage, toSpeech } from '../../../lib/speech.ts';
import { blocksOf, blocksToHTML } from '../../../lib/wiki.ts';

export async function generateStaticParams() {
  const wiki = await getSection('wiki');
  return wiki.entries.filter((e) => e.published).map((e) => ({ slug: e.slug }));
}

export default async function WikiEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wiki = await getSection('wiki');
  const entry = wiki.entries.find((e) => e.slug === slug && e.published);
  if (!entry) notFound();
  const i = wiki.entries.indexOf(entry);

  /* One panel per section rather than one panel for the lot. Every panel here
     is rotated a fraction of a degree, and a rotation pivots about the centre:
     a forty-paragraph entry in a single box swings its far corners well out of
     the column. Split, each box is short enough for the tilt to read as a tilt.

     `blocksOf` is also where an entry still holding the legacy one-string body
     gets cut into the same shape, so both kinds render through this one path.
     See lib/wiki.ts. */
  const blocks = blocksOf(entry);
  const gold = { '--ch': 'var(--gold)', '--ch-dp': 'var(--gold-dp)', '--ch-ink': 'var(--navy)' } as React.CSSProperties;

  return (
    <section className="view view--panel view--wiki">
      <div className="slab slab--bare" style={gold}>
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">Wiki</h1>
              <Speak text={passage(entry.title, entry.summary, toSpeech(blocksToHTML(blocks)))} />
            </div>
            <div className="wiki">
              <p className="wiki__back"><Link className="btn" href="/wiki">← All entries</Link></p>
              <article className="wiki__article">
                <EditableFigure
                  className="wiki__hero"
                  path={`wiki.entries.${i}.image`}
                  value={entry.image}
                  alt=""
                />
                <WikiTag entryIndex={i} category={entry.category} categories={wiki.categories} />
                <EditableText as="h2" path={`wiki.entries.${i}.title`} value={entry.title} />
                <EditableText
                  as="p" className="wiki__sum"
                  path={`wiki.entries.${i}.summary`} value={entry.summary} multiline
                />
              </article>
            </div>
          </div>
        </div>
      </div>

      <WikiBlocks entryIndex={i} blocks={entry.blocks} body={entry.body} style={gold} />
    </section>
  );
}
