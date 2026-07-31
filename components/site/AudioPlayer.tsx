'use client';

import { useEffect, useId, useMemo } from 'react';
import { Glyph } from './Glyph.tsx';
import { VoiceMenu } from './VoiceMenu.tsx';
import { clearError, hydrate, pause, resume, speak, stop, useTts } from '../../lib/tts.ts';

/* Read a passage aloud, in a voice that was chosen rather than accepted.
 *
 * The engine is Kokoro — an 82M-parameter open-weight model on a small server
 * of ours, not a paid API and not the browser's own synthesiser. What that
 * buys is the thing the browser could never promise: everyone hears the same
 * voice, and it is a good one. What it costs is a network round trip per
 * chunk, which is why lib/tts.ts fetches the next one while this one plays.
 *
 * This is not a substitute for a screen reader — someone using one already has
 * a better version of this. It is for everyone else: reading with your eyes
 * elsewhere, long prose, or simply preferring to listen.
 *
 * The queue itself lives in lib/tts.ts, because a page can have more than one
 * of these and the reader also has a transcript column that speaks. `owner` is
 * how this button knows the channel was taken from it and renders idle again
 * instead of lying about what is playing.
 *
 * Nothing renders until the readiness probe answers. A deployment with no
 * KOKORO_URL offers no button rather than one that fails when pressed — the
 * same rule the rest of the site follows about controls that cannot work. */

export function AudioPlayer({ text, label = 'Listen', className = '' }: {
  /** what to read: one passage, or blocks that are separately addressable */
  text: string | string[];
  label?: string;
  className?: string;
}) {
  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;

  const blocks = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const joined = blocks.join(' ').trim();

  useEffect(() => { hydrate(); }, []);

  /* Navigating away mid-sentence should not keep talking over the next page. */
  useEffect(() => () => { stop(); }, []);

  /* A text change under a running passage — paging the reader — should read
     the new text, not finish the old. */
  useEffect(() => {
    if (mine) speak(id, blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  if (tts.ready !== true || !joined) return null;

  const failed = mine && tts.error !== null;
  const busy = mine && tts.loading && !tts.paused;
  const playing = mine && tts.speaking && !tts.paused && !tts.loading;
  const held = mine && tts.paused;

  const press = () => {
    if (failed) { clearError(); speak(id, blocks); return; }
    if (held) { resume(); return; }
    if (mine && tts.speaking) { pause(); return; }
    speak(id, blocks);
  };

  const face = failed ? { glyph: 'speak', word: 'Try again' }
    : busy ? { glyph: 'speak', word: 'Loading' }
      : playing ? { glyph: 'pause', word: 'Pause' }
        : held ? { glyph: 'play', word: 'Resume' }
          : { glyph: 'speak', word: label };

  /* A fragment, not a wrapper: every part lands as a child of whatever bar
     this sits in, so adding it does not change any existing layout. */
  return (
    <>
      <button
        type="button"
        className={`btn speak${playing ? ' is-speaking' : ''}${busy ? ' is-loading' : ''}`
          + `${failed ? ' is-error' : ''}${className ? ` ${className}` : ''}`}
        onClick={press}
        aria-label={
          failed ? `Read-aloud failed: ${tts.error}. Try again`
            : playing ? 'Pause reading aloud'
              : held ? 'Resume reading aloud'
                : `${label} — read this aloud`
        }
      >
        <Glyph name={face.glyph} width={4} />
        {face.word}
      </button>

      {/* Only while there is something to stop. A stop button on a passage
          nobody started is a dead control. */}
      {mine && (tts.speaking || tts.loading) && (
        <button
          type="button"
          className="btn btn--mark tipped"
          onClick={stop}
          aria-label="Stop reading aloud"
          data-tip="Stop"
        >
          <Glyph name="stop" width={5} />
        </button>
      )}

      {/* The engine's own words. Spoken audio failing silently would look like
          a button that does nothing. */}
      {failed && <span className="speak__err" role="alert">{tts.error}</span>}

      <VoiceMenu />
    </>
  );
}
