'use client';

import { useEffect, useId, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { VoiceMenu } from './VoiceMenu.tsx';
import { hydrate, speak, stop, supported, useTts } from '../../lib/tts.ts';

/* Read a block of text aloud, using the browser's own speech synthesiser.
 *
 * The Web Speech API rather than a paid voice service: no key, no server hop,
 * no per-character bill, and nothing to keep running. That used to mean
 * settling for whatever the browser picked, which is usually the oldest synth
 * installed — so the voice is now chosen rather than accepted, and the picker
 * that does it rides along beside this button on every surface that reads
 * aloud. See lib/voices.ts. Browsers with no synthesiser at all get no button
 * rather than one that does nothing.
 *
 * This is not a substitute for a screen reader — someone using one already has
 * a better version of this. It is for everyone else: reading with your eyes
 * elsewhere, long prose, or simply preferring to listen.
 *
 * The queue itself lives in lib/tts.ts, because the reader has a second thing
 * that can speak. `owner` is how this button knows the transcript column took
 * the channel from it and renders idle again instead of lying. */

export function Speak({ text, label = 'Listen', className = '', picker = true }: {
  /** what to read; nothing renders if it is blank */
  text: string;
  label?: string;
  className?: string;
  /** whether the voice picker rides along. Off where this button is already
   *  INSIDE a picker's panel — the reader's dock puts it there, so the panel
   *  would otherwise offer to open itself. */
  picker?: boolean;
}) {
  /* Resolved after mount: `speechSynthesis` cannot be probed on the server, and
     rendering the button unconditionally would mean showing a dead one. */
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(supported()); hydrate(); }, []);

  const id = useId();
  const tts = useTts();
  const mine = tts.owner === id;

  /* Navigating away mid-sentence should not keep talking over the next page. */
  useEffect(() => () => { stop(); }, []);

  /* A text change under a running utterance — paging the reader — should read
     the new text, not finish the old. */
  useEffect(() => {
    if (mine) speak(id, [text]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!ok || !text.trim()) return null;

  /* A fragment, not a wrapper: both land as children of whatever bar this sits
     in, so adding the picker does not change any existing layout. Where there
     is nothing to read there is no button and no picker either. */
  return (
    <>
      <button
        type="button"
        className={`btn speak${mine ? ' is-speaking' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => (mine ? stop() : speak(id, [text]))}
        aria-label={mine ? 'Stop reading aloud' : `${label} — read this aloud`}
      >
        <Glyph name={mine ? 'stop' : 'speak'} width={4} />
        {mine ? 'Stop' : label}
      </button>
      {picker && <VoiceMenu />}
    </>
  );
}
