'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { EditableText } from '../cms/EditableText.tsx';
import { useCmsValue } from '../../lib/cms-context.tsx';
import { scriptLines, speechOf } from '../../lib/script.ts';
import { pause, resume, speak, stop, supported, useTts } from '../../lib/tts.ts';

/* The written side of a page.
 *
 * Every page on this site is an image, and the dialogue is lettered into the
 * drawing — there is no text layer to lift. So this column holds a script only
 * where the creator has typed one out, and says so plainly where they have not.
 * It is deliberately NOT generated, guessed, or captioned from the artwork:
 * invented dialogue is invented story, and the one rule this project does not
 * bend is that the fiction comes from the creator.
 *
 * What it is for, when a script exists:
 *
 *   - the page becomes readable as text — selectable, searchable, translatable,
 *     and reachable by a screen reader, none of which the artwork is
 *   - read-aloud gets something worth reading. Before this, the only spoken
 *     thing was a one-sentence description of a page nobody can read
 *   - a beat is a jump target: click a line, or select inside it, and playback
 *     moves there
 *
 * The line being spoken is marked with aria-current, so following along works
 * by eye and by screen reader both. */

export function PageScript({ index, page, script, isDraft }: {
  /** page index, for the CMS path and the heading */
  index: number;
  /** 1-based page number as shown to the reader */
  page: number;
  script: string;
  isDraft: boolean;
}) {
  const text = useCmsValue(`pages.items.${index}.script`, script);
  const lines = useMemo(() => scriptLines(text), [text]);
  const speech = useMemo(() => speechOf(lines), [lines]);

  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;

  /* Where the next Play starts. Moved by clicking a line, by selecting text
     inside one, or reset when the page changes. */
  const [from, setFrom] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(supported()); }, []);

  /* A new page is a new script; carrying playback across would read the wrong
     page's lines under the right page's artwork. */
  useEffect(() => {
    setFrom(0);
    return () => { stop(); };
  }, [index]);

  const jump = useCallback((i: number) => {
    setFrom(i);
    if (mine && tts.speaking) speak(id, speech, i);
  }, [mine, tts.speaking, id, speech]);

  /* Selecting text is the other way to say "start here". Reading the selection
     on pointerup and keyup rather than on `selectionchange` means it settles
     once, at the end of the drag, instead of firing for every character. */
  const onSelect = useCallback(() => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode) return;
    const node = sel.anchorNode;
    const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element);
    const line = el?.closest<HTMLElement>('[data-line]');
    if (!line || !list.current?.contains(line)) return;
    jump(Number(line.dataset.line));
  }, [jump]);

  const play = () => speak(id, speech, from);

  if (!lines.length) {
    return (
      <aside className="script script--empty" aria-labelledby={`${id}-h`}>
        <h2 className="script__head" id={`${id}-h`}>
          <Glyph name="script" width={5} />
          Script
        </h2>
        <p className="script__none">
          No script for this page yet.
        </p>
        <p className="script__why">
          The dialogue is lettered into the drawing, so it cannot be read out of
          the page — it has to be written out by hand. Until it is, this column
          stays empty rather than guessing at it.
        </p>
        {/* An empty string still needs a target the editor can click into. */}
        <EditableText as="p" className="script__slot" path={`pages.items.${index}.script`} value={text} multiline />
      </aside>
    );
  }

  return (
    <aside className="script" aria-labelledby={`${id}-h`}>
      <div className="script__bar">
        <h2 className="script__head" id={`${id}-h`}>
          <Glyph name="script" width={5} />
          Script
          <span className="script__page">{isDraft ? 'Draft' : 'Page'} {String(page).padStart(2, '0')}</span>
        </h2>

        {ok && (
          <span className="script__transport">
            <button
              type="button"
              className={`tbtn${mine && tts.speaking && !tts.paused ? ' is-on' : ''}`}
              onClick={() => {
                if (!mine || !tts.speaking) play();
                else if (tts.paused) resume();
                else pause();
              }}
              aria-label={
                mine && tts.speaking && !tts.paused ? 'Pause reading'
                : from > 0 ? `Read aloud from line ${from + 1}`
                : 'Read the script aloud'
              }
            >
              <Glyph name={mine && tts.speaking && !tts.paused ? 'pause' : 'play'} width={4} />
            </button>
            <button
              type="button"
              className="tbtn"
              onClick={() => { stop(); setFrom(0); }}
              disabled={!mine || !tts.speaking}
              aria-label="Stop reading and return to the first line"
            >
              <Glyph name="stop" width={5} />
            </button>
          </span>
        )}
      </div>

      {/* Politely announced, so a screen reader hears which line is live
          without the visual highlight being the only signal. */}
      <p className="sr-only" aria-live="polite">
        {mine && tts.speaking ? `Reading line ${tts.block + 1} of ${lines.length}.` : ''}
      </p>

      <ol
        className="script__lines"
        ref={list}
        onPointerUp={onSelect}
        onKeyUp={onSelect}
      >
        {lines.map((l) => {
          const live = mine && tts.speaking && tts.block === l.i;
          return (
            <li
              key={l.i}
              data-line={l.i}
              data-kind={l.kind}
              /* `is-from` marks where the next Play will start, so it only
                 means anything once the reader has actually moved it. Showing
                 it on line one by default would highlight a choice nobody
                 made. */
              className={`script__line${live ? ' is-live' : ''}${!live && from > 0 && from === l.i ? ' is-from' : ''}`}
              aria-current={live ? 'true' : undefined}
            >
              {ok && (
                <button
                  type="button"
                  className="script__cue"
                  onClick={() => speak(id, speech, l.i)}
                  aria-label={`Read aloud from line ${l.i + 1}${l.who ? `, ${l.who}` : ''}`}
                >
                  <Glyph name="play" width={4} />
                </button>
              )}
              {l.who && <b className="script__who">{l.who}</b>}
              <span className="script__said">{l.text}</span>
            </li>
          );
        })}
      </ol>

      <EditableText as="p" className="script__slot" path={`pages.items.${index}.script`} value={text} multiline />
    </aside>
  );
}
