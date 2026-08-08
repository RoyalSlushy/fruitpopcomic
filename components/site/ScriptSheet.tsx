'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { effectiveSnippets, pageLines } from '../../lib/script.ts';
import { tracksOf } from '../../lib/clips.ts';
import { useCmsValue } from '../../lib/cms-context.tsx';
import {
  hydrate, pause, playable, play, playingTo, resume, stop, stopIfOwner, unlock, useTts,
} from '../../lib/tts.ts';
import type { PageClip, ScriptSnippet } from '../../content/pages.ts';

/* A page that exists in the running order but has not been drawn.
 *
 * It is laid out as a page rather than as a gap, because that is what it is —
 * the chapter can be built before it is drawn.
 *
 * This is the one page that is ENTIRELY text, and until now it was the only
 * one that could not be played: the transcript column is a drawn page's
 * companion, and a script page has no artwork to sit beside, so it got no
 * transport at all. It has the same one now, over the same queue, so a page
 * being undrawn no longer means it is unreadable by ear.
 */
export function ScriptSheet({ index, script, snippets, audio, mediaRef }: {
  index: number;
  /** the legacy single-string script; read when `snippets` is empty */
  script: string;
  snippets: ScriptSnippet[];
  audio: PageClip[];
  /** the reader's zoom target — the sheet stands in for the <img> here */
  mediaRef: (el: HTMLElement | null) => void;
}) {
  const text = useCmsValue(`pages.items.${index}.script`, script);
  const snips = useCmsValue(`pages.items.${index}.snippets`, snippets);
  const clips = useCmsValue(`pages.items.${index}.audio`, audio);
  const { lines, sections } = useMemo(
    () => pageLines(effectiveSnippets(snips, text)), [snips, text],
  );
  const tracks = useMemo(() => tracksOf(lines, clips ?? []), [lines, clips]);

  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;
  const running = mine && tts.speaking;

  const [ok, setOk] = useState(false);
  /* Also hydrate here: this column can be the only thing on the page that
     plays, and the stored voice and speed must be in place before it does. */
  useEffect(() => { setOk(playable()); hydrate(); }, []);

  /* Turning the page must not carry this page's lines into the next one. Only
     this sheet's own playback is stopped. */
  useEffect(() => () => { stopIfOwner(id); }, [index, id]);

  /* Which part's own button reads as playing — only when the queue is bounded
     to exactly that part, so the whole-page transport lights nothing up. */
  const bound = running ? playingTo() : null;
  const partLive = bound === null ? -1 : sections.findIndex(
    (sec) => sec.lines.length > 0
      && tts.block >= sec.from && tts.block < sec.from + sec.lines.length
      && bound === sec.from + sec.lines.length,
  );

  return (
    <div className="sheet" ref={mediaRef}>
      <div className="sheet__bar">
        <p className="sheet__tag">Not drawn yet</p>

        {ok && lines.length > 0 && (
          <span className="script__transport">
            <button
              type="button"
              className={`tbtn${running && !tts.paused ? ' is-on' : ''}`}
              onClick={() => {
                unlock();
                if (!running) play(id, tracks);
                else if (tts.paused) resume();
                else pause();
              }}
              aria-label={running && !tts.paused ? 'Pause reading' : 'Read this page aloud'}
            >
              <Glyph name={running && !tts.paused ? 'pause' : 'play'} width={4} />
            </button>
            <button
              type="button"
              className="tbtn"
              onClick={() => stop()}
              disabled={!running}
              aria-label="Stop reading"
            >
              <Glyph name="stop" width={5} />
            </button>
          </span>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {running
          ? `Reading line ${tts.block + 1} of ${lines.length}${tts.kind === 'clip' ? ', recorded' : ''}.`
          : ''}
      </p>

      {lines.length > 0 ? (
        <ol className="sheet__lines">
          {sections.map((sec, n) => (sec.lines.length === 0 ? null : (
            <li className="sheet__part" key={sec.id || n}>
              {ok && sections.length > 1 && (
                <button
                  type="button"
                  className={`tbtn${partLive === n ? ' is-on' : ''}`}
                  onClick={() => {
                    unlock();
                    play(id, tracks, sec.from, sec.from + sec.lines.length);
                  }}
                  aria-label={`Play part ${n + 1} of ${sections.length} on its own`}
                >
                  <Glyph name="play" width={4} />
                </button>
              )}
              <ol className="sheet__lines">
              {sec.lines.map((l) => {
                const live = running && tts.block === l.i;
                return (
                  <li
                    key={l.i}
                    data-kind={l.kind}
                    data-clip={tracks[l.i]?.src != null ? '' : undefined}
                    className={live ? 'is-live' : undefined}
                    aria-current={live ? 'true' : undefined}
                  >
                    {l.who && <b>{l.who}</b>}
                    <span>{l.text}</span>
                  </li>
                );
              })}
              </ol>
            </li>
          )))}
        </ol>
      ) : (
        <p className="sheet__none">
          {sections.length > 0
            ? 'The panels are laid out; nothing is written in them yet.'
            : 'This page is blank. No drawing, and no script written for it yet.'}
        </p>
      )}
    </div>
  );
}
