'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { LineAudio } from '../cms/LineAudio.tsx';
import { useCmsValue } from '../../lib/cms-context.tsx';
import { scriptLines } from '../../lib/script.ts';
import { tracksOf } from '../../lib/clips.ts';
import { hydrate, pause, playable, play, resume, stop, stopIfOwner, unlock, useTts } from '../../lib/tts.ts';
import type { PageClip } from '../../content/pages.ts';

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
 *   - a beat can be RECORDED. Where the creator has uploaded a take it plays in
 *     their voice; every other line is synthesised as before. Partial pages are
 *     the normal case and the point — one recording is worth making without
 *     waiting for the other thirty — so recorded lines are marked, and the
 *     live region names which voice is speaking.
 *
 * The line being spoken is marked with aria-current, so following along works
 * by eye and by screen reader both. */

export function PageScript({ index, page, script, isDraft, audio }: {
  /** page index, for the CMS path and the heading */
  index: number;
  /** 1-based page number as shown to the reader */
  page: number;
  script: string;
  isDraft: boolean;
  /** recordings for individual beats; most pages have none */
  audio: PageClip[];
}) {
  const text = useCmsValue(`pages.items.${index}.script`, script);
  const clips = useCmsValue(`pages.items.${index}.audio`, audio);
  const lines = useMemo(() => scriptLines(text), [text]);
  /* One track per line, in line order — so `tts.block` stays the line index
     and every highlight and jump path below is untouched by recordings. */
  const tracks = useMemo(() => tracksOf(lines, clips ?? []), [lines, clips]);

  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;

  /* Where the next Play starts. Moved by clicking a line, by selecting text
     inside one, or reset when the page changes. */
  const [from, setFrom] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const [ok, setOk] = useState(false);
  /* Also hydrate here: this column can be the only thing on the page that
     plays, and the stored voice and speed must be in place before it does. */
  useEffect(() => { setOk(playable()); hydrate(); }, []);

  /* A new page is a new script; carrying playback across would read the wrong
     page's lines under the right page's artwork. Only this column's own
     playback is stopped — silencing whoever else holds the channel would be a
     side effect of a page turn nobody asked for. */
  useEffect(() => {
    setFrom(0);
    return () => { stopIfOwner(id); };
  }, [index, id]);

  const jump = useCallback((i: number) => {
    setFrom(i);
    if (mine && tts.speaking) play(id, tracks, i);
  }, [mine, tts.speaking, id, tracks]);

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

  const start = () => play(id, tracks, from);

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
                /* Synchronously, inside the gesture: the audio element can
                   only be blessed for later playback from a real click, and
                   the first recording may be several lines down the page.
                   See lib/audio.ts. */
                unlock();
                if (!mine || !tts.speaking) start();
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
          without the visual highlight being the only signal. It also names
          which voice is speaking: a page part-recorded and part-synthesised
          switches voice mid-scene, and hearing why is better than wondering. */}
      <p className="sr-only" aria-live="polite">
        {mine && tts.speaking
          ? `Reading line ${tts.block + 1} of ${lines.length}${tts.kind === 'clip' ? ', recorded' : ''}.`
          : ''}
      </p>

      <ol
        className="script__lines"
        ref={list}
        onPointerUp={onSelect}
        onKeyUp={onSelect}
      >
        {lines.map((l) => {
          const live = mine && tts.speaking && tts.block === l.i;
          const recorded = tracks[l.i]?.src != null;
          return (
            <li
              key={l.i}
              data-line={l.i}
              data-kind={l.kind}
              /* Marks a line the creator has recorded. Its job is to explain
                 the voice change before it happens rather than after: on a
                 part-recorded page the switch between a real take and the
                 synthesiser is otherwise indistinguishable from a fault. */
              data-clip={recorded ? '' : undefined}
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
                  onClick={() => { unlock(); play(id, tracks, l.i); }}
                  aria-label={
                    `Play from line ${l.i + 1}${l.who ? `, ${l.who}` : ''}`
                    + `${recorded ? ' — recorded' : ''}`
                  }
                >
                  <Glyph name="play" width={4} />
                </button>
              )}
              {l.who && <b className="script__who">{l.who}</b>}
              <span className="script__said">{l.text}</span>
              <LineAudio path={`pages.items.${index}.audio`} clips={clips ?? []}
                lineKey={l.key} said={l.speech} />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
