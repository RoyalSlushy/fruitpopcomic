import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { chunk, toSpeech, passage, MAX_CHUNK } from './speech.ts';

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
