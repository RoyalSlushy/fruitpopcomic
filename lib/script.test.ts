import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptLines, speechOf } from './script.ts';

/* The script parser decides three things per line: is it dialogue, who says
   it, and what the synthesiser reads. Every case below is one a creator typing
   into a text box will actually produce. */

test('an empty script parses to nothing at all', () => {
  assert.deepEqual(scriptLines(''), []);
  assert.deepEqual(scriptLines('   \n\n  \n'), []);
});

test('blank lines separate beats and do not become beats', () => {
  const l = scriptLines('One\n\n\nTwo\n');
  assert.equal(l.length, 2);
  assert.deepEqual(l.map((x) => x.i), [0, 1]);
});

test('a NAME: line is a cue, split into speaker and words', () => {
  const [l] = scriptLines('RONNIE: Where did it go?');
  assert.equal(l?.kind, 'cue');
  assert.equal(l?.who, 'RONNIE');
  assert.equal(l?.text, 'Where did it go?');
});

test('names carrying punctuation are still names', () => {
  for (const who of ["RONNIE O'MALLEY", 'MRS. PARK', 'JEAN-LUC', 'VOICE (OFF)']) {
    const [l] = scriptLines(`${who}: hello`);
    assert.equal(l?.who, who, who);
  }
});

test('an ordinary sentence with a colon is not mistaken for dialogue', () => {
  const [l] = scriptLines('She had one rule: never look back.');
  assert.equal(l?.kind, 'prose');
  assert.equal(l?.who, null);
});

test('a lower-case label is not a speaker either', () => {
  const [l] = scriptLines('note: this is just a sentence');
  assert.equal(l?.kind, 'prose');
});

test('a bracketed line is a direction, and loses its brackets', () => {
  for (const [raw, want] of [
    ['(she checks the counter)', 'she checks the counter'],
    ['[the stand is empty]', 'the stand is empty'],
  ] as const) {
    const [l] = scriptLines(raw);
    assert.equal(l?.kind, 'note');
    assert.equal(l?.text, want);
  }
});

test('an all-caps line with no colon is a panel slug', () => {
  const [l] = scriptLines('PANEL 1');
  assert.equal(l?.kind, 'mark');
  assert.equal(l?.text, 'PANEL 1');
});

test('a slug and a parenthetical are different kinds, not one muted style', () => {
  const [slug, aside] = scriptLines('PANEL 1\n(she looks up)');
  assert.equal(slug?.kind, 'mark');
  assert.equal(aside?.kind, 'note');
});

test('a long all-caps line is shouting, not a marker', () => {
  const shout = 'I TOLD YOU NOT TO TOUCH THE THING ON THE COUNTER, NOT EVEN ONCE';
  const [l] = scriptLines(shout);
  assert.equal(l?.kind, 'prose');
});

/* A speaker with nothing after the colon is a line half-typed. It is not
   dialogue — there are no words — so it falls out of the cue branch, and the
   all-caps rule below catches it as a marker. That is the better of the two
   outcomes: a marker is set apart from the body text, whereas prose would
   render a bare "RONNIE:" as if it were something a reader should read. */
test('a speaker with no words after the colon becomes a slug, not body text', () => {
  const [l] = scriptLines('RONNIE:');
  assert.equal(l?.kind, 'mark');
  assert.equal(l?.who, null);
});

test('speech says the speaker aloud so a listener can follow who is talking', () => {
  const lines = scriptLines('PANEL 1\nRONNIE: Where is it?\n(she looks up)');
  assert.deepEqual(speechOf(lines), [
    'PANEL 1',
    'RONNIE. Where is it?',
    'she looks up',
  ]);
});

test('indices are contiguous after blanks are dropped, so a jump target holds', () => {
  const lines = scriptLines('A\n\nB\n   \nC');
  assert.deepEqual(lines.map((l) => l.i), [0, 1, 2]);
  assert.equal(speechOf(lines).length, 3);
});

test('runs of whitespace inside a line collapse', () => {
  const [l] = scriptLines('RONNIE:    far   too    much   space');
  assert.equal(l?.text, 'far too much space');
});
