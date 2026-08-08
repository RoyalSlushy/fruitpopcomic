import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptLines } from './script.ts';
import {
  clipSrc, hasClips, orphanClips, stepsOf, tracksOf, withClip, withoutClip,
} from './clips.ts';
import type { PageClip } from '../content/pages.ts';

/* Pairing recordings to beats, and flattening the result into a playlist.
   This is where the feature is actually decided, so it is where the tests are:
   lib/tts.ts only walks what comes out of here. */

const SCRIPT = 'PANEL 1\nRONNIE: Where is it?\nThe stand is empty.';
const lines = () => scriptLines(SCRIPT);

const clipFor = (text: string, src = 'pages/take.mp3'): PageClip => {
  const l = scriptLines(SCRIPT).find((x) => x.text === text || x.speech === text);
  assert.ok(l, `no line matching ${text}`);
  return { key: l.key, src, said: l.speech };
};

test('a page with no recordings is every line synthesised', () => {
  const t = tracksOf(lines(), []);
  assert.equal(t.length, 3);
  assert.deepEqual(t.map((x) => x.src), [null, null, null]);
});

test('tracks stay index-aligned with lines — the reader depends on it', () => {
  const l = lines();
  const t = tracksOf(l, [clipFor('The stand is empty.')]);
  assert.equal(t.length, l.length);
  assert.deepEqual(t.map((x) => x.speech), l.map((x) => x.speech));
  assert.deepEqual(t.map((x) => x.src), [null, null, 'pages/take.mp3']);
});

test('a clip with a blank src is not a recording', () => {
  const c = clipFor('The stand is empty.', '');
  assert.equal(clipSrc([c], c.key), null);
  assert.deepEqual(tracksOf(lines(), [c]).map((x) => x.src), [null, null, null]);
  assert.equal(hasClips(lines(), [c]), false);
});

test('a clip for a line that is not on this page is simply not played', () => {
  const stray: PageClip = { key: 'nosuchkey', src: 'pages/x.mp3', said: 'gone' };
  assert.deepEqual(tracksOf(lines(), [stray]).map((x) => x.src), [null, null, null]);
});

test('reordering orphans nothing; rewriting a line orphans exactly that line', () => {
  const clips = [clipFor('PANEL 1'), clipFor('The stand is empty.')];

  const moved = scriptLines('The stand is empty.\nRONNIE: Where is it?\nPANEL 1');
  assert.deepEqual(orphanClips(moved, clips), []);
  assert.equal(hasClips(moved, clips), true);

  const edited = scriptLines('PANEL 1\nRONNIE: Where is it?\nThe stand is bare.');
  const lost = orphanClips(edited, clips);
  assert.equal(lost.length, 1);
  assert.equal(lost[0]?.said, 'The stand is empty.',
    'the orphan still says what it says, which is what makes it repairable');
});

test('recording a line twice replaces the take rather than stacking one', () => {
  const l = lines();
  const key = l[0]!.key;
  const once = withClip([], key, 'a.mp3', 'PANEL 1');
  const twice = withClip(once, key, 'b.mp3', 'PANEL 1');
  assert.equal(twice.length, 1);
  assert.equal(clipSrc(twice, key), 'b.mp3');
});

test('clearing removes only the one clip', () => {
  const l = lines();
  const clips = withClip(withClip([], l[0]!.key, 'a.mp3', 'x'), l[2]!.key, 'b.mp3', 'y');
  const left = withoutClip(clips, l[0]!.key);
  assert.equal(left.length, 1);
  assert.equal(clipSrc(left, l[0]!.key), null);
  assert.equal(clipSrc(left, l[2]!.key), 'b.mp3');
});

/* ── the playlist ─────────────────────────────────────────── */

test('a recorded line is one step; an unrecorded one is its speech', () => {
  const steps = stepsOf(tracksOf(lines(), [clipFor('PANEL 1')]));
  assert.equal(steps[0]?.kind, 'clip');
  assert.equal(steps[0]?.block, 0);
  assert.equal(steps.filter((s) => s.kind === 'clip').length, 1);
  assert.ok(steps.slice(1).every((s) => s.kind === 'speech'));
});

test('a clip step carries the words too, so a failed take can still be read', () => {
  const [step] = stepsOf(tracksOf(lines(), [clipFor('PANEL 1')]));
  assert.equal(step?.kind, 'clip');
  assert.equal(step?.kind === 'clip' && step.speech, 'PANEL 1');
});

test('`from` skips the lines before it and keeps the real block numbers', () => {
  const steps = stepsOf(tracksOf(lines(), []), 2);
  assert.ok(steps.length > 0);
  assert.ok(steps.every((s) => s.block === 2),
    'block is the LINE index, not the step index');
});

test('a from past the end plays nothing rather than throwing', () => {
  assert.deepEqual(stepsOf(tracksOf(lines(), []), 99), []);
  assert.deepEqual(stepsOf([], 0), []);
});

test('long speech is chunked, and every chunk reports the same line', () => {
  const long = `${'Something happens here. '.repeat(20)}`;
  const steps = stepsOf([{ speech: long, src: null }]);
  assert.ok(steps.length > 1, 'Chrome truncates a long utterance, so it is split');
  assert.ok(steps.every((s) => s.block === 0));
});

test('an empty line contributes no step at all', () => {
  assert.deepEqual(stepsOf([{ speech: '   ', src: null }]), []);
});

/* ── playing one part ─────────────────────────────────────── */

test('`to` bounds playback without renumbering the blocks', () => {
  const tracks = tracksOf(lines(), []);
  const steps = stepsOf(tracks, 1, 2);
  assert.ok(steps.length > 0);
  assert.ok(steps.every((s) => s.block === 1),
    'block stays an index into the PAGE, or the highlight points at the wrong line');
});

test('`to` defaults to the end, so an unbounded call is unchanged', () => {
  const tracks = tracksOf(lines(), []);
  assert.deepEqual(stepsOf(tracks, 0), stepsOf(tracks, 0, tracks.length));
});

test('an empty or inverted range plays nothing rather than everything', () => {
  const tracks = tracksOf(lines(), []);
  assert.deepEqual(stepsOf(tracks, 1, 1), []);
  assert.deepEqual(stepsOf(tracks, 2, 1), []);
});

test('a bounded range still plays a recording where one exists', () => {
  const tracks = tracksOf(lines(), [clipFor('The stand is empty.')]);
  const steps = stepsOf(tracks, 2, 3);
  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.kind, 'clip');
  assert.equal(steps[0]?.block, 2);
});
