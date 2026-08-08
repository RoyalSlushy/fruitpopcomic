import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashText, scriptLines, speechOf } from './script.ts';

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

/* ── beat keys ────────────────────────────────────────────────
   A key is what a recording is filed under, so what changes it and what does
   not is the whole contract. Editing a line must detach its take; moving a
   line must not. */

test('a key is stable under whitespace and case, which are not edits', () => {
  const [a] = scriptLines('The stand is empty.');
  const [b] = scriptLines('  The   stand  is empty.  ');
  const [c] = scriptLines('THE STAND IS EMPTY.');
  assert.equal(a?.key, b?.key);
  /* c is a `mark`, not prose — but the words are the same, so the take is. */
  assert.equal(a?.key, c?.key);
});

test('rewriting a line changes its key and leaves its neighbours alone', () => {
  const before = scriptLines('One\nTwo\nThree');
  const after = scriptLines('One\nTwo, actually\nThree');
  assert.equal(before[0]?.key, after[0]?.key);
  assert.equal(before[2]?.key, after[2]?.key);
  assert.notEqual(before[1]?.key, after[1]?.key);
});

test('inserting and reordering move keys around rather than changing them', () => {
  const before = scriptLines('One\nTwo');
  const after = scriptLines('Nought\nTwo\nOne');
  assert.equal(after[2]?.key, before[0]?.key, 'One kept its key at a new index');
  assert.equal(after[1]?.key, before[1]?.key, 'Two kept its key');
});

test('a cue keys on the speaker as well as the words', () => {
  const [a] = scriptLines('RONNIE: hello');
  const [b] = scriptLines('SAM: hello');
  const [c] = scriptLines('hello');
  assert.notEqual(a?.key, b?.key);
  assert.notEqual(a?.key, c?.key);
});

test('a repeated beat gets its own key per occurrence, in order', () => {
  const l = scriptLines('Again\nAgain\nAgain');
  const keys = l.map((x) => x.key);
  assert.equal(new Set(keys).size, 3, 'three distinct keys');
  assert.equal(keys[0], scriptLines('Again')[0]?.key, 'the first is the plain hash');
  assert.equal(keys[1], `${keys[0]}-1`);
  assert.equal(keys[2], `${keys[0]}-2`);
});

test('every key is safe to use as a CMS value and a DOM attribute', () => {
  for (const l of scriptLines('PANEL 1\nRONNIE: Where is it?\n(she checks)\nplain')) {
    assert.match(l.key, /^[0-9a-z]+(-\d+)?$/, l.text);
  }
});

test('hashText is deterministic and spreads', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
  assert.equal(hashText(''), hashText(''));
});
