import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_VOICE, MAX_TEXT, SPEED, VOICES, clampSpeed, isVoice, ttsURL, voiceLabel,
} from './kokoro.ts';

describe('voices', () => {
  test('the default is one of the offered voices', () => {
    assert.ok(isVoice(DEFAULT_VOICE));
  });

  test('ids are unique, and every one is a real Kokoro id', () => {
    const ids = VOICES.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[ab][fm]_[a-z]+$/);
  });

  test('the allow-list refuses anything it does not know', () => {
    assert.ok(isVoice('af_bella'));
    assert.ok(!isVoice('af_nonesuch'));
    assert.ok(!isVoice(''));
    assert.ok(!isVoice(null));
    assert.ok(!isVoice(42));
    /* The route builds a filesystem-free request, but the id still reaches
       another process — so it has to be one we published, not one we sanitised. */
    assert.ok(!isVoice('../../etc/passwd'));
  });

  test('an unknown id still renders as something', () => {
    assert.equal(voiceLabel('af_bella'), 'Bella');
    assert.equal(voiceLabel('af_nonesuch'), 'af_nonesuch');
  });
});

describe('clampSpeed', () => {
  /* The regression this file exists for: the URL omits ?s= at the default
     speed, so the route parses `null` — and `Number(null)` is 0, which clamps
     to the MINIMUM. Every default-speed request was generated at 0.7×. */
  test('absent means the default, not the minimum', () => {
    assert.equal(clampSpeed(null), SPEED.default);
    assert.equal(clampSpeed(undefined), SPEED.default);
    assert.equal(clampSpeed(''), SPEED.default);
    assert.notEqual(SPEED.default, SPEED.min);
  });

  test('nonsense means the default', () => {
    assert.equal(clampSpeed('quickly'), SPEED.default);
    assert.equal(clampSpeed(NaN), SPEED.default);
    assert.equal(clampSpeed({}), SPEED.default);
  });

  test('out of range is pulled into range', () => {
    assert.equal(clampSpeed(9), SPEED.max);
    assert.equal(clampSpeed(0.1), SPEED.min);
    assert.equal(clampSpeed(-3), SPEED.min);
  });

  test('a real speed survives, to two places', () => {
    assert.equal(clampSpeed(1.35), 1.35);
    assert.equal(clampSpeed('1.2'), 1.2);
    assert.equal(clampSpeed(1.23456), 1.23);
  });
});

describe('ttsURL', () => {
  const parse = (url: string) => new URL(url, 'https://x.test').searchParams;

  test('carries the text, the voice, and the speed when it is not the default', () => {
    const q = parse(ttsURL('Hello there.', 'bm_george', 1.25));
    assert.equal(q.get('t'), 'Hello there.');
    assert.equal(q.get('v'), 'bm_george');
    assert.equal(q.get('s'), '1.25');
  });

  test('leaves the speed out at the default, and that round-trips', () => {
    const q = parse(ttsURL('Hello there.', DEFAULT_VOICE, SPEED.default));
    assert.equal(q.get('s'), null);
    /* The whole point: what the route reads back has to be what was asked for. */
    assert.equal(clampSpeed(q.get('s')), SPEED.default);
  });

  test('every speed the picker can produce round-trips exactly', () => {
    for (let s = SPEED.min; s <= SPEED.max + 1e-9; s += SPEED.step) {
      const want = clampSpeed(s);
      const got = clampSpeed(parse(ttsURL('x', DEFAULT_VOICE, want)).get('s'));
      assert.equal(got, want, `${want} came back as ${got}`);
    }
  });

  test('text that would break a query string is encoded', () => {
    const q = parse(ttsURL('One & two? "three" + four #five', DEFAULT_VOICE, 1));
    assert.equal(q.get('t'), 'One & two? "three" + four #five');
  });

  test('a full chunk fits in a URL a browser and a CDN will carry', () => {
    const url = ttsURL('x'.repeat(MAX_TEXT), 'bm_george', 1.5);
    assert.ok(url.length < 2000, `${url.length} characters is too long for a URL`);
  });
});
