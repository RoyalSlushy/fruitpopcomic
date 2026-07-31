'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import { DEFAULTS, SPEED, hydrate, sample, setSettings, useTts } from '../../lib/tts.ts';
import { VOICES } from '../../lib/kokoro.ts';

/* The voice picker.
 *
 * This used to be a rescue operation. The browser's own synthesiser hands you
 * whatever it likes, which is usually the oldest thing installed, and the good
 * voices sat unoffered in the same list as decades of legacy formant synths —
 * so this panel existed to sort that list and hope something decent was in it.
 * What a visitor heard depended entirely on what their machine happened to own.
 *
 * With Kokoro there is no list to rescue. Every visitor has the same thirteen
 * voices because they come from the same model on the same server, so this is
 * now a choice rather than a repair: an accent, a name, and a speed.
 *
 * Preview is still not a nicety. A list of names tells you nothing about what
 * any of them sound like, so picking without hearing is guessing. */

const PREVIEW = 'The stand is empty, and the sky has gone the wrong colour.';

const ACCENTS = ['American', 'British'] as const;

export function VoiceMenu({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  const tts = useTts();
  const { settings } = tts;

  useEffect(() => { hydrate(); }, []);

  const close = useCallback((restore = false) => {
    setOpen(false);
    if (restore) btn.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true); };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    addEventListener('keydown', onKey);
    addEventListener('pointerdown', onDown);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  if (tts.ready !== true) return null;

  const untouched = settings.voice === DEFAULTS.voice && settings.speed === DEFAULTS.speed;

  return (
    <div className={`vm${className ? ` ${className}` : ''}`} ref={wrap}>
      <button
        type="button"
        className={`btn vm__open${open ? ' is-on' : ''}`}
        ref={btn}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Glyph name="voice" width={4} />
        Voice
      </button>

      <div className="vm__panel" id={id} hidden={!open}>
        <p className="vm__head">Read-aloud voice</p>

        <label className="vm__row" htmlFor={`${id}-v`}>
          <span className="vm__label">Voice</span>
          <select
            id={`${id}-v`}
            className="vm__select"
            value={settings.voice}
            onChange={(e) => setSettings({ voice: e.target.value })}
          >
            {ACCENTS.map((accent) => (
              <optgroup key={accent} label={accent}>
                {VOICES.filter((v) => v.accent === accent).map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="vm__row" htmlFor={`${id}-s`}>
          <span className="vm__label">Speed</span>
          <input
            id={`${id}-s`}
            className="vm__range"
            type="range"
            min={SPEED.min} max={SPEED.max} step={SPEED.step}
            value={settings.speed}
            onChange={(e) => setSettings({ speed: Number(e.target.value) })}
          />
          <output className="vm__out" htmlFor={`${id}-s`}>{settings.speed.toFixed(2)}×</output>
        </label>

        {/* Pitch is gone, and it is worth saying why rather than quietly
            dropping a control: Kokoro has no pitch parameter. Its pitch is
            part of the voice, and the voices are the choice above. */}

        <div className="vm__foot">
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => sample(PREVIEW)}
            disabled={tts.loading}
          >
            <Glyph name="play" width={4} />
            {tts.loading ? 'Loading' : 'Preview'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setSettings(DEFAULTS)}
            disabled={untouched}
          >
            Reset
          </button>
        </div>

        {tts.error && <p className="vm__none" role="alert">{tts.error}</p>}
      </div>
    </div>
  );
}
