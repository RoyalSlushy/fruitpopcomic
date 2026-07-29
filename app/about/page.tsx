import Link from 'next/link';
import { getSection } from '../../lib/cms-server.ts';
import { EditableText } from '../../components/cms/EditableText.tsx';

export default async function AboutPage() {
  const about = await getSection('about');
  return (
    <section className="view view--panel">
      <div className="panel" style={{ '--ch': 'var(--indigo)', '--ch-dp': 'var(--indigo-dp)', '--ch-ink': '#fff' } as React.CSSProperties}>
        <div className="panel__bar">
          <Link className="btn btn--back" href="/">Menu</Link>
          <h1 className="panel__title">About</h1>
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
    </section>
  );
}
