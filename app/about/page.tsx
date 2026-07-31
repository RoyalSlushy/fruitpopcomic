import Link from 'next/link';
import { getSection } from '../../lib/cms-server.ts';
import { EditableText } from '../../components/cms/EditableText.tsx';
import { AudioPlayer } from '../../components/site/AudioPlayer.tsx';
import { passage } from '../../lib/tts-chunk.ts';

export default async function AboutPage() {
  const about = await getSection('about');
  /* Headings included: they are how you follow the shape of the page by ear. */
  const spoken = passage(...about.blocks.map((b) => b.text));

  return (
    <section className="view view--panel">
      <div className="slab slab--bare" style={{ '--ch': 'var(--indigo)', '--ch-dp': 'var(--indigo-dp)', '--ch-ink': '#fff' } as React.CSSProperties}>
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">About</h1>
              <AudioPlayer text={spoken} />
            </div>
            <div className="prose">
              {about.blocks.map((b, i) => (
                <EditableText
                  key={i}
                  as={b.kind}
                  path={`about.blocks.${i}.text`}
                  value={b.text}
                  multiline={b.kind === 'p'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
