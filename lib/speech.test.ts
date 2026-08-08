import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { chunk, sentences, toSpeech, passage, MAX_CHUNK } from './speech.ts';

describe('chunk', () => {
  test('blank text yields nothing to say', () => {
    assert.deepEqual(chunk(''), []);
    assert.deepEqual(chunk('   \n  '), []);
  });

  test('short text stays in one piece', () => {
    assert.deepEqual(chunk('Two characters, one hoodie.'), ['Two characters, one hoodie.']);
  });

  test('sentences pack together up to the budget', () => {
    const parts = chunk('One. Two. Three.', 12);
    assert.deepEqual(parts, ['One. Two.', 'Three.']);
  });

  test('every chunk stays within the budget', () => {
    const long = 'The comic pages are rough drafts, working pencils in a single colour, '
      + 'shown to establish page format and panel grammar, not final art. '.repeat(6);
    for (const part of chunk(long)) {
      assert.ok(part.length <= MAX_CHUNK, `"${part}" is ${part.length} chars`);
    }
  });

  test('no text is dropped or duplicated', () => {
    const source = 'Alpha beta. Gamma delta epsilon! Zeta? Eta theta iota kappa lambda.';
    const rejoined = chunk(source, 20).join(' ').replace(/\s+/g, ' ');
    assert.equal(rejoined, source);
  });

  test('a sentence longer than the budget breaks at a comma', () => {
    const parts = chunk('aaaa bbbb, cccc dddd, eeee ffff.', 16);
    assert.ok(parts.every((p) => p.length <= 16), parts.join(' | '));
    assert.equal(parts[0], 'aaaa bbbb,');
  });

  test('an unbroken run still gets split rather than hanging', () => {
    const parts = chunk('x'.repeat(500), 100);
    assert.ok(parts.length >= 5);
    assert.ok(parts.every((p) => p.length <= 100));
    assert.equal(parts.join(''), 'x'.repeat(500));
  });

  test('whitespace and newlines collapse', () => {
    assert.deepEqual(chunk('One.\n\n   Two.'), ['One. Two.']);
  });
});

describe('toSpeech', () => {
  test('tag names are never spoken', () => {
    assert.equal(toSpeech('<p>Hello <em>there</em></p>'), 'Hello there.');
  });

  test('paragraphs become a pause, not a run-on', () => {
    assert.equal(toSpeech('<p>One</p><p>Two</p>'), 'One. Two.');
  });

  test('entities decode', () => {
    assert.equal(toSpeech('<p>Salt &amp; Pepper &#39;s</p>'), "Salt & Pepper 's.");
  });

  test('an unknown entity is left alone rather than eaten', () => {
    assert.equal(toSpeech('<p>&zzz; done</p>'), '&zzz; done.');
  });

  test('runs of full stops collapse', () => {
    assert.equal(toSpeech('<p>One.</p><p>Two.</p>'), 'One. Two.');
  });

  test('plain text passes through', () => {
    assert.equal(toSpeech('Just words.'), 'Just words.');
  });

  test('empty input is empty output', () => {
    assert.equal(toSpeech(''), '');
  });
});

describe('passage', () => {
  test('blanks are dropped, not left as gaps', () => {
    assert.equal(passage('Title', '', undefined, 'Body'), 'Title. Body');
  });

  test('existing terminal punctuation is not doubled', () => {
    assert.equal(passage('Title.', 'Body.'), 'Title. Body');
  });

  test('nothing to say is the empty string', () => {
    assert.equal(passage('', undefined), '');
  });
});

/* ── sentences ────────────────────────────────────────────────
   Extracted out of chunk() so the site has one sentence rule. It matters more
   than it used to: a beat in a script is now a sentence, so a bad split is a
   visible line with its own highlight and its own recording slot, not just an
   inaudible utterance boundary. */

test('a paragraph splits one entry per sentence', () => {
  assert.deepEqual(
    sentences('Sparks fell. She looked up! Was it over?'),
    ['Sparks fell.', 'She looked up!', 'Was it over?'],
  );
});

test('an abbreviation does not end a sentence', () => {
  assert.deepEqual(sentences('Mrs. Park went home.'), ['Mrs. Park went home.']);
  assert.deepEqual(sentences('Dr. Vance and Mr. Roe left.'), ['Dr. Vance and Mr. Roe left.']);
  assert.deepEqual(sentences('She met J. Roe today.'), ['She met J. Roe today.']);
});

test('a decimal point is not a sentence end', () => {
  assert.deepEqual(sentences('It cost 3.5 credits.'), ['It cost 3.5 credits.']);
});

test('a sentence longer than the chunk budget is still ONE sentence', () => {
  const long = `${'and on '.repeat(60)}end.`;
  const out = sentences(long);
  assert.equal(out.length, 1, 'the length budget belongs to chunk(), not here');
  assert.ok(out[0]!.length > MAX_CHUNK);
});

test('blank and whitespace-only text yields nothing', () => {
  assert.deepEqual(sentences(''), []);
  assert.deepEqual(sentences('   \n\t '), []);
});

test('chunk still honours its budget now that it shares the sentence rule', () => {
  const long = `${'and on '.repeat(60)}end.`;
  for (const c of chunk(long)) assert.ok(c.length <= MAX_CHUNK, c);
  /* and the ordinary case is untouched */
  assert.deepEqual(chunk('One. Two. Three.'), ['One. Two. Three.']);
});
