import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  beats, effectiveSnippets, hasScript, hashText, pageLines, scriptLines, speechOf,
} from './script.ts';

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

/* ── prose splits per sentence ────────────────────────────────
   The creator writes narrative paragraphs, not one beat per line. A page
   arrived as a single 600-character beat: the highlight could not move and a
   "line recording" was the whole page. */

test('a prose paragraph becomes one beat per sentence', () => {
  const l = scriptLines('Sparks fell. She looked up. The stand was empty.');
  assert.equal(l.length, 3);
  assert.deepEqual(l.map((x) => x.text),
    ['Sparks fell.', 'She looked up.', 'The stand was empty.']);
  assert.deepEqual(l.map((x) => x.i), [0, 1, 2]);
  assert.equal(new Set(l.map((x) => x.key)).size, 3, 'each is separately recordable');
  assert.ok(l.every((x) => x.kind === 'prose'));
});

test('a cue, a note and a slug stay whole however many sentences they hold', () => {
  const [cue] = scriptLines('RONNIE: Get down. Now.');
  assert.equal(cue?.kind, 'cue');
  assert.equal(cue?.text, 'Get down. Now.', 'cutting this would invent a pause');

  const [note] = scriptLines('(she ducks. he does not)');
  assert.equal(note?.kind, 'note');
  assert.equal(note?.text, 'she ducks. he does not');

  const [mark] = scriptLines('PANEL 1. LATER.');
  assert.equal(mark?.kind, 'mark');
  assert.equal(mark?.text, 'PANEL 1. LATER.');
});

test('beats() is the one line filter, and it composes', () => {
  const a = 'One\n\n  Two  ';
  const b = '\nThree\n';
  assert.deepEqual(beats(a).concat(beats(b)), beats(`${a}\n${b}`),
    'this is what licenses pageLines concatenating bodies');
  assert.deepEqual(beats(''), []);
});

/* ── a page of snippets ───────────────────────────────────────
   Parsed as ONE script so beat indices and keys are unique page-wide. */

const snip = (id: string, body: string, title = '') => ({ id, title, body });

test('one snippet is byte-identical to parsing its body alone', () => {
  /* The migration guarantee: every clip already recorded stays attached. */
  for (const s of ['PANEL 1\nRONNIE: Where is it?\nThe stand is empty.',
                   'Sparks fell. She looked up.',
                   '']) {
    assert.deepEqual(pageLines([snip('a', s)]).lines, scriptLines(s), s);
  }
});

test('beat indices run continuously across snippet boundaries', () => {
  const { lines, sections } = pageLines([snip('a', 'One\nTwo'), snip('b', 'Three')]);
  assert.deepEqual(lines.map((l) => l.i), [0, 1, 2]);
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.from, 0);
  assert.equal(sections[1]?.from, 2);
  assert.equal(sections[1]?.lines[0]?.i, 2, 'a section knows where it starts');
  assert.deepEqual(sections.flatMap((s) => s.lines), lines);
});

test('a titled but empty snippet survives as structure with no beats', () => {
  const { lines, sections } = pageLines([snip('a', '', 'Panel 1'), snip('b', 'Hi')]);
  assert.equal(sections.length, 2, 'the empty panel is real and must not vanish');
  assert.equal(sections[0]?.title, 'Panel 1');
  assert.deepEqual(sections[0]?.lines, []);
  assert.equal(lines.length, 1);
});

test('an empty page parses to nothing at all', () => {
  assert.deepEqual(pageLines([]), { lines: [], sections: [] });
});

test('slicing survives blank and whitespace-only lines inside a body', () => {
  const { sections } = pageLines([snip('a', '\n  \nOne\n\n'), snip('b', 'Two\n   ')]);
  assert.deepEqual(sections[0]?.lines.map((l) => l.text), ['One']);
  assert.deepEqual(sections[1]?.lines.map((l) => l.text), ['Two']);
});

test('the same beat in two snippets gets distinct keys, in document order', () => {
  const { lines } = pageLines([snip('a', 'Again'), snip('b', 'Other'), snip('c', 'Again')]);
  assert.notEqual(lines[0]?.key, lines[2]?.key, 'or one take would play under both');
  assert.equal(lines[2]?.key, `${lines[0]?.key}-1`);
});

test('reordering swaps duplicate keys and leaves every other key alone', () => {
  /* Pinning the one cost of parsing page-wide. Where the SAME beat appears in
     two snippets, the pair is told apart only by order, so reordering swaps
     them. Both recorded: inaudible. Only one recorded: the take moves onto the
     other occurrence, and neither orphanClips nor `said` can detect it —
     duplicates say the same thing by definition. There is no repair path, so
     this test is the record of it. */
  const before = pageLines([snip('a', 'Again\nAlpha'), snip('c', 'Again\nBeta')]);
  const after = pageLines([snip('c', 'Again\nBeta'), snip('a', 'Again\nAlpha')]);

  const keyOfText = (m: typeof before, t: string) => m.lines.find((l) => l.text === t)?.key;
  assert.equal(keyOfText(before, 'Alpha'), keyOfText(after, 'Alpha'), 'unique beats are stable');
  assert.equal(keyOfText(before, 'Beta'), keyOfText(after, 'Beta'));

  const dupBefore = before.lines.filter((l) => l.text === 'Again').map((l) => l.key);
  const dupAfter = after.lines.filter((l) => l.text === 'Again').map((l) => l.key);
  assert.deepEqual(dupBefore, dupAfter, 'the keys stay put; the beats under them swap');
});

test('effectiveSnippets folds a legacy script without writing anything', () => {
  assert.deepEqual(effectiveSnippets([], 'Old text.'),
    [{ id: 'legacy', title: '', body: 'Old text.' }]);
  assert.deepEqual(effectiveSnippets(undefined, 'Old text.').length, 1);
  assert.deepEqual(effectiveSnippets([], '   '), [], 'a blank legacy is not a snippet');
  assert.deepEqual(effectiveSnippets([], ''), []);

  const real = [snip('a', 'New.')];
  assert.deepEqual(effectiveSnippets(real, 'Old text.'), real, 'snippets win when present');
});

test('a legacy page reads exactly as it did before snippets existed', () => {
  const legacy = 'Sparks fell. She looked up.';
  assert.deepEqual(pageLines(effectiveSnippets([], legacy)).lines, scriptLines(legacy));
});

test('hasScript counts beats, not headings', () => {
  assert.equal(hasScript(pageLines([snip('a', '', 'Panel 1')])), false);
  assert.equal(hasScript(pageLines([snip('a', 'Hi')])), true);
  assert.equal(hasScript(pageLines([])), false);
});
