'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { LineAudio } from '../cms/LineAudio.tsx';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { effectiveSnippets, pageLines } from '../../lib/script.ts';
import { tracksOf } from '../../lib/clips.ts';
import {
  hydrate, pause, playable, play, resume, stop, stopIfOwner, unlock, useTts,
} from '../../lib/tts.ts';
import type { PageClip, ScriptSnippet } from '../../content/pages.ts';

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

export function PageScript({ index, script, snippets, audio, onTheatre }: {
  /** page index, for the CMS path and the heading */
  index: number;
  /** the legacy single-string script; read when `snippets` is empty */
  script: string;
  /** the script split into ordered sections */
  snippets: ScriptSnippet[];
  /** recordings for individual beats; most pages have none */
  audio: PageClip[];
  /** enter theatre mode; absent where the reader cannot offer it */
  onTheatre?: () => void;
}) {
  const text = useCmsValue(`pages.items.${index}.script`, script);
  const snips = useCmsValue(`pages.items.${index}.snippets`, snippets);
  const clips = useCmsValue(`pages.items.${index}.audio`, audio);
  /* A panel's NAME is the creator's own scaffolding and is never rendered, but
     the GROUPING is, so that a part can carry a control to play just itself.
     `lines` stays the flat list every index below refers to. */
  const { lines, sections } = useMemo(
    () => pageLines(effectiveSnippets(snips, text)), [snips, text],
  );
  /* One track per line, in line order — so `tts.block` stays the line index
     and every highlight and jump path below is untouched by recordings. */
  const tracks = useMemo(() => tracksOf(lines, clips ?? []), [lines, clips]);

  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;
  const editing = useEditMode();

  /* Where the next Play starts. Moved by clicking a line, by selecting text
     inside one, or reset when the page changes. */
  const [from, setFrom] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const livePart = useRef<HTMLLIElement>(null);

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

  /* Rewriting the script under a running read.
     `lib/tts.ts` walks a queue it snapshotted, so a reorder leaves the audio
     playing the old order while `tts.block` indexes it — the highlight would
     land on the wrong beat. Stopping is the truthful answer to "you just
     changed what I was reading"; a highlight that lies is not.

     Keyed on STRUCTURE, not on text, or it would stop on every keystroke. And
     gated on edit mode, because only an editor can reorder — a visitor must
     never pay for this. */
  const shape = editing ? `${sections.map((x) => x.id).join('|')}:${lines.length}` : '';
  useEffect(() => {
    if (!editing) return;
    stopIfOwner(id);
    setFrom(0);
  }, [shape, editing, id]);

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

  /* The part the live beat is inside, so its button reads as playing while the
     read passes through it. Playback runs on past the panel's edge, so this
     moves from one part to the next on its own. */
  /* Only parts with beats in them are shown — an empty panel is real structure
     in the editor and nothing at all to a reader. Counting the shown ones is
     what keeps a lone "Part 1" from appearing next to a panel nobody can see. */
  const parts = sections.filter((sec) => sec.lines.length > 0);
  const partLive = mine && tts.speaking
    ? parts.findIndex((sec) => tts.block >= sec.from && tts.block < sec.from + sec.lines.length)
    : -1;

  /* Follow the read. The column is a drawer on a phone and a short column on a
     desktop, so a part four screens down is otherwise reached by hand while
     the words for it are already playing. Scoped to the column's own scroll
     box — `block:'nearest'` moves it only when the part is actually out of
     view, so a part already on screen does not jitter every time the beat
     changes. */
  useEffect(() => {
    if (partLive < 0) return;
    livePart.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [partLive]);


  /* Three states, not two. Panels that exist but hold no words are structure
     the creator authored, so saying "no script yet" over them would be false —
     someone did start. */
  if (!lines.length) {
    const started = sections.length > 0;
    return (
      <aside className="script script--empty" aria-labelledby={`${id}-h`}>
        <h2 className="script__head" id={`${id}-h`}>
          <Glyph name="script" width={5} />
          Script
        </h2>
        <p className="script__none">
          {started ? 'Nothing written in this page\u2019s panels yet.' : 'No script for this page yet.'}
        </p>
        <p className="script__why">
          {started
            ? 'The panels are laid out; the words have still to be typed into them.'
            : 'The dialogue is lettered into the drawing, so it cannot be read out of '
              + 'the page — it has to be written out by hand. Until it is, this column '
              + 'stays empty rather than guessing at it.'}
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
        </h2>

        {/* Where "Draft 08" used to sit — outside the heading, because a
            control is not part of a heading's text. The page number was
            already on the artwork's corner and again in the bar, so this slot
            was its third copy, and the one place in the column with room for
            the control that matters. */}
        {ok && onTheatre && (
          <button
            type="button"
            className="script__theatre"
            onClick={() => { unlock(); onTheatre(); }}
            aria-label="Theatre mode — the page and its words, read straight through"
          >
            <Glyph name="play" width={4} />
            Theatre
          </button>
        )}

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

      {/* Grouped by panel, each with a control that STARTS there — playback
          runs on through the parts after it rather than stopping at the
          panel's edge, so pressing one is "read from here", not "read only
          this". The panel's NAME is not rendered: it is the creator's
          scaffolding and readers were never meant to see it, so the control
          names itself by position instead.

          One part is the whole page, and the transport above already plays
          that, so the control appears only once there is more than one part to
          choose between. */}
      <ol
        className="script__lines"
        ref={list}
        onPointerUp={onSelect}
        onKeyUp={onSelect}
      >
        {parts.map((sec, n) => (
          <li
            className={`script__part${partLive === n ? ' is-live' : ''}`}
            key={sec.id || n}
            ref={partLive === n ? livePart : undefined}
            /* The whole part is the target, not a button inside it. A part is
               a block of prose and the obvious thing to press is the words,
               so a separate control beside them was one target too many.
               Ignored when the press was a selection or landed on a control
               of its own — selecting text inside a line already means "start
               here", and it must not also mean "start the part". */
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button,a,input,select,textarea')) return;
              if (!getSelection()?.isCollapsed) return;
              unlock();
              setFrom(sec.from);
              play(id, tracks, sec.from);
            }}
            aria-label={parts.length > 1 ? `Part ${n + 1} of ${parts.length}` : undefined}
          >
            <ol className="script__lines">
              {sec.lines.map((l) => {
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
          </li>
        ))}
      </ol>
    </aside>
  );
}
