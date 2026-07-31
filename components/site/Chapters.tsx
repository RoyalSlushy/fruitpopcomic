'use client';

import Link from 'next/link';
import { Glyph } from './Glyph.tsx';
import { NoteTip } from './NoteTip.tsx';
import { EditableText } from '../cms/EditableText.tsx';
import { ListControls, ListAdd } from '../cms/ListControls.tsx';
import { useCmsValue } from '../../lib/cms-context.tsx';
import { group, isScriptPage } from '../../lib/chapters.ts';
import { mediaURL, pad } from '../../lib/media.ts';
import type { Chapter, ComicPage } from '../../content/pages.ts';

/* The way in.
 *
 * /read used to open the reader on page one. It now opens the shelf, because
 * "start reading" and "go back to where I was" are different intentions and
 * dropping straight into page one only ever served the first of them.
 *
 * It lists CHAPTERS. Each one used to unroll into a scrolling strip of every
 * page it holds, which made the chapter list a page list wearing headings: ten
 * thumbnails to skim before the next title, and the more the comic grows the
 * worse that trade gets. A chapter is a cover, a name, a line about it and a
 * count — and the reader's own Pages control is where a particular page is
 * chosen, which is where you already are when you want one.
 *
 * A client component, and that is load-bearing for the same reason Gallery is:
 * both lists here can change LENGTH in the editor, and a server-rendered list
 * cannot grow a node in response to a draft. Adding a chapter would silently
 * do nothing while reordering appeared to work. */

export function Chapters({ chapters, items, notice }: {
  chapters: Chapter[];
  items: ComicPage[];
  notice: string;
}) {
  const chs = useCmsValue('pages.chapters', chapters);
  const pages = useCmsValue('pages.items', items);
  const groups = group(chs, pages);

  return (
    <section className="view view--panel">
      <div
        className="slab slab--bare"
        style={{ '--ch': 'var(--magenta)', '--ch-dp': 'var(--magenta-dp)', '--ch-ink': '#fff' } as React.CSSProperties}
      >
        <div className="panel">
          <div className="panel__in">
            <div className="panel__bar">
              <Link className="btn btn--back" href="/">Menu</Link>
              <h1 className="panel__title">Read</h1>
              <NoteTip label="About these pages" text={notice} path="about.reader.notice" />
              <p className="panel__count"><span>{pages.length}</span></p>
            </div>

            <div className="shelf">
              {groups.map((g, gi) => {
                const first = g.pages[0];
                const ci = g.chapter ? chs.findIndex((c) => c.id === g.chapter?.id) : -1;

                return (
                  <article className="chapter" key={g.chapter?.id ?? `unsorted-${gi}`}>
                    {/* The chapter's first page, standing for the chapter. Not
                        a link and not in the tab order: the entry has exactly
                        one destination and it is the button beside it, so this
                        is a cover rather than a second copy of it. */}
                    <span className="chapter__cover" aria-hidden="true">
                      {first && !isScriptPage(first.page) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaURL(first.page.thumb || first.page.image)}
                          alt="" width={92} height={138} loading="lazy"
                        />
                      ) : (
                        <span className="thumb__blank">
                          <Glyph name="script" width={5} />
                        </span>
                      )}
                    </span>

                    <div className="chapter__body">
                      <div className="chapter__head">
                        <span className="chapter__n" aria-hidden="true">
                          {g.chapter ? pad(gi) : '—'}
                        </span>
                        <div className="chapter__title">
                          {g.chapter && ci >= 0 ? (
                            <EditableText as="h2" path={`pages.chapters.${ci}.title`} value={g.chapter.title} />
                          ) : (
                            <h2>Unsorted</h2>
                          )}
                          {g.chapter && ci >= 0 ? (
                            <EditableText
                              as="p" className="chapter__blurb"
                              path={`pages.chapters.${ci}.blurb`} value={g.chapter.blurb} multiline
                            />
                          ) : (
                            <p className="chapter__blurb">
                              Pages that are not in a chapter yet. They are listed here
                              rather than hidden.
                            </p>
                          )}
                        </div>
                        <span className="chapter__count">
                          {g.pages.length} {g.pages.length === 1 ? 'page' : 'pages'}
                        </span>
                        {ci >= 0 && (
                          <ListControls listPath="pages.chapters" index={ci} length={chs.length} />
                        )}
                      </div>

                      {g.pages.length === 0 ? (
                        <p className="chapter__none">
                          No pages in this chapter yet.
                        </p>
                      ) : (
                        first && (
                          <p className="chapter__go">
                            <Link className="btn btn--solid" href={`/read/${first.index + 1}`}>
                              Start reading →
                            </Link>
                          </p>
                        )
                      )}
                    </div>
                  </article>
                );
              })}

              <p className="shelf__add">
                <ListAdd listPath="pages.chapters" length={chs.length} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
