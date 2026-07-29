'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { chunk } from '../../lib/speech.ts';

/* Read a block of text aloud, using the browser's own speech synthesiser.
 *
 * The Web Speech API rather than a paid voice service: no key, no server hop,
 * no per-character bill, and nothing to keep running. The voice is whatever the
 * visitor's OS ships, which is plainer than a hosted neural voice but is also
 * the voice they already chose. Browsers without it get no button at all rather
 * than one that does nothing.
 *
 * This is not a substitute for a screen reader — someone using one already has
 * a better version of this. It is for everyone else: reading with your eyes
 * elsewhere, long prose, or simply preferring to listen. */

export function Speak({ text, label = 'Listen', className = '' }: {
  /** what to read; nothing renders if it is blank */
  text: string;
  label?: string;
  className?: string;
}) {
  /* Resolved after mount: `speechSynthesis` cannot be probed on the server, and
     rendering the button unconditionally would mean showing a dead one. */
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  /* Bumped on every start and stop. Utterance callbacks captured an older
     value are stale — cancel() delivers `onerror` to everything still queued,
     and without this each one would race to reset the button. */
  const run = useRef(0);

  useEffect(() => { setSupported('speechSynthesis' in window); }, []);

  /* Navigating away mid-sentence should not keep talking over the next page. */
  useEffect(() => () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    run.current++;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const start = useCallback(() => {
    const parts = chunk(text);
    if (!parts.length) return;

    const mine = ++run.current;
    speechSynthesis.cancel();
    setSpeaking(true);

    const say = (n: number) => {
      if (mine !== run.current) return;
      if (n >= parts.length) { setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(parts[n]);
      u.lang = document.documentElement.lang || 'en';
      u.onend = () => say(n + 1);
      u.onerror = () => { if (mine === run.current) setSpeaking(false); };
      speechSynthesis.speak(u);
    };
    say(0);
  }, [text]);

  /* A text change under a running utterance — paging the reader — should read
     the new text, not finish the old. */
  useEffect(() => {
    if (speaking) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!supported || !text.trim()) return null;

  return (
    <button
      type="button"
      className={`btn speak${speaking ? ' is-speaking' : ''}${className ? ` ${className}` : ''}`}
      onClick={speaking ? stop : start}
      aria-label={speaking ? 'Stop reading aloud' : `${label} — read this aloud`}
    >
      <Glyph name={speaking ? 'stop' : 'speak'} width={4} />
      {speaking ? 'Stop' : label}
    </button>
  );
}
