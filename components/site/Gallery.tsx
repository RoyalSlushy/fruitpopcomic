'use client';

import Link from 'next/link';
import { EditableText } from '../cms/EditableText.tsx';
import { EditableImage } from '../cms/EditableImage.tsx';
import { ListControls, ListAdd } from '../cms/ListControls.tsx';
import { Speak } from './Speak.tsx';
import { passage } from '../../lib/speech.ts';
import { useCmsValue } from '../../lib/cms-context.tsx';
import type { Sheet } from '../../content/sheets.ts';

/* Cast and Art are the same grid with a different filter and hue — the static
   build had one component for both and there is no reason to split it.
 *
 * A client component, and that is load-bearing: the LIST ITSELF is read through
 * useCmsValue. Leaf values alone are not enough — adding or deleting an item
 * changes the array's length, and a server-rendered list cannot grow a node in
 * response to a draft. Reordering would appear to work (the values shift under
 * the fixed set of paths) while adding silently did nothing.
 *
 * For a visitor `useCmsValue` returns the server array untouched, so the markup
 * is identical to a server render. */
export function Gallery({
  title, hue, kind, sheets, notice, noticePath,
}: {
  title: string;
  hue: 'cyan' | 'peach';
  kind: 'cast' | 'art';
  /** the whole list, so a path can address an item by its real index */
  sheets: Sheet[];
  notice?: string;
  noticePath?: string;
}) {
  const all = useCmsValue('sheets.items', sheets);
  const items = all.filter((s) => s.kind === kind);
  const count = items.reduce((a, s) => a + (s.figures || 0), 0);

  /* The sheets are drawings; the descriptions under them are the only part
     that can be spoken. Numbering them keeps the list followable by ear. */
  const spoken = passage(
    notice,
    ...items.map((s, n) => passage(`Sheet ${n + 1}`, s.name, s.description)),
  );

  return (
    <section className="view view--panel">
      <div
        className="panel"
        style={{ '--ch': `var(--${hue})`, '--ch-dp': `var(--${hue}-dp)`, '--ch-ink': 'var(--navy)' } as React.CSSProperties}
      >
        <div className="panel__bar">
          <Link className="btn btn--back" href="/">Menu</Link>
          <h1 className="panel__title">{title}</h1>
          <Speak text={spoken} />
          {kind === 'cast' && <p className="panel__count"><span>{count}</span></p>}
        </div>

        {notice && noticePath && (
          <EditableText as="p" className="notice" path={noticePath} value={notice} multiline />
        )}

        <div className={`cast${kind === 'art' ? ' cast--art' : ''}`}>
          {items.map((s) => {
            const i = all.indexOf(s);
            return (
              <figure key={s.id || i}>
                <EditableImage
                  path={`sheets.items.${i}.image`}
                  value={s.image}
                  alt={s.description}
                  width={900}
                  height={1350}
                />
                <figcaption>
                  {s.name && (
                    <>
                      <EditableText as="strong" path={`sheets.items.${i}.name`} value={s.name} />
                      {' — '}
                    </>
                  )}
                  <EditableText
                    as="span"
                    path={`sheets.items.${i}.description`}
                    value={s.description}
                    multiline
                  />
                  <ListControls listPath="sheets.items" index={i} length={all.length} />
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p style={{ padding: '0 clamp(1rem,3vw,1.75rem) clamp(1rem,3vw,1.75rem)' }}>
          <ListAdd listPath="sheets.items" length={all.length} />
        </p>
      </div>
    </section>
  );
}
