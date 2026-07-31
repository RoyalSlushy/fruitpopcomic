'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Glyph } from './Glyph.tsx';
import {
  DEFAULTS, PITCH, RATE, hydrate, resolvedVoice, sample, setSettings, supported, useTts,
} from '../../lib/tts.ts';
import { split } from '../../lib/voices.ts';

/* The voice picker.
 *
 * Read-aloud has always been as good as the voice it was handed, and the one
 * the browser hands you by default is usually the oldest thing installed. The
 * good voices are already there — Microsoft's Natural set on Edge, Siri and the
 * Premium downloads on Apple, Google's on Android — sitting in the same list.
 * This is the surface that offers them, sorted so the best one the visitor
 * already owns is at the top.
 *
 * Preview is not a nicety. A list of voice names tells you nothing about what
 * any of them sound like, so picking without hearing is guessing. */

const PREVIEW = 'The stand is empty, and the sky has gone the wrong colour.';

export function VoiceMenu({ className = '' }: { className?: string }) {
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  const tts = useTts();
  const { settings, voices } = tts;

  useEffect(() => { setOk(supported()); hydrate(); }, []);

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

  if (!ok) return null;

  const lang = typeof document !== 'undefined'
    ? document.documentElement.lang || 'en' : 'en';
  const { top: recommended, rest } = split(voices, lang);
  const now = resolvedVoice();

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
            value={settings.voiceURI ?? ''}
            onChange={(e) => setSettings({ voiceURI: e.target.value || null })}
          >
            <option value="">
              Best available{now ? ` — ${now.name}` : ''}
            </option>
            {/* Split rather than sorted-and-hoped-for: the difference between a
                neural voice and a 1990s formant synth is the whole point of
                this control, and a flat list buries it. */}
            {recommended.length > 0 && (
              <optgroup label="Recommended">
                {recommended.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </optgroup>
            )}
            {rest.length > 0 && (
              <optgroup label="Everything else">
                {rest.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} · {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="vm__row" htmlFor={`${id}-r`}>
          <span className="vm__label">Speed</span>
          <input
            id={`${id}-r`}
            className="vm__range"
            type="range"
            min={RATE.min} max={RATE.max} step={RATE.step}
            value={settings.rate}
            onChange={(e) => setSettings({ rate: Number(e.target.value) })}
          />
          <output className="vm__out" htmlFor={`${id}-r`}>{settings.rate.toFixed(1)}×</output>
        </label>

        <label className="vm__row" htmlFor={`${id}-p`}>
          <span className="vm__label">Pitch</span>
          <input
            id={`${id}-p`}
            className="vm__range"
            type="range"
            min={PITCH.min} max={PITCH.max} step={PITCH.step}
            value={settings.pitch}
            onChange={(e) => setSettings({ pitch: Number(e.target.value) })}
          />
          <output className="vm__out" htmlFor={`${id}-p`}>{settings.pitch.toFixed(1)}</output>
        </label>

        <div className="vm__foot">
          <button type="button" className="btn btn--solid" onClick={() => sample(PREVIEW)}>
            <Glyph name="play" width={4} />
            Preview
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setSettings(DEFAULTS)}
            disabled={
              settings.voiceURI === null
              && settings.rate === DEFAULTS.rate
              && settings.pitch === DEFAULTS.pitch
            }
          >
            Reset
          </button>
        </div>

        {voices.length === 0 && (
          <p className="vm__none">
            No voices reported yet. Some browsers only load them after the first
            time something is read aloud.
          </p>
        )}
      </div>
    </div>
  );
}
