import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  chunkForSpeech, sentences, toSpeech, passage, MAX_CHUNK, HEAD_CHUNK,
} from './tts-chunk.ts';

describe('sentences', () => {
  test('splits on every terminator the engine reads as one', () => {
    assert.deepEqual(
      sentences('One. Two! Three? Four; five.'),
      ['One.', 'Two!', 'Three?', 'Four;', 'five.'],
    );
  });

  test('an abbreviation is not the end of a sentence', () => {
    assert.deepEqual(sentences('Mrs. Park was late.'), ['Mrs. Park was late.']);
    assert.deepEqual(sentences('Pencils, e.g. blue ones.'), ['Pencils, e.g. blue ones.']);
  });

  test('a closing quote belongs to the sentence it closes', () => {
    assert.deepEqual(sentences('"Stop." She did not.'), ['"Stop."', 'She did not.']);
  });
});

describe('chunkForSpeech', () => {
  test('blank text yields nothing to say', () => {
    assert.deepEqual(chunkForSpeech(''), []);
    assert.deepEqual(chunkForSpeech('   \n  '), []);
    assert.deepEqual(chunkForSpeech(undefined as unknown as string), []);
  });

  test('short text stays in one piece', () => {
    assert.deepEqual(chunkForSpeech('Two characters, one hoodie.'),
      ['Two characters, one hoodie.']);
  });

  test('sentences pack together up to the budget', () => {
    assert.deepEqual(chunkForSpeech('One. Two. Three.', { max: 12, head: 12 }),
      ['One. Two.', 'Three.']);
  });

  test('the first chunk gets the smaller budget, so audio starts sooner', () => {
    const text = 'Alpha beta gamma. Delta epsilon zeta. Eta theta iota. Kappa lambda mu.';
    const parts = chunkForSpeech(text, { max: 80, head: 20 });
    assert.ok(parts[0]!.length <= 20, parts.join(' | '));
    assert.ok(parts[1]!.length > 20, parts.join(' | '));
  });

  test('every chunk stays within the budget', () => {
    const long = 'The comic pages are rough drafts, working pencils in a single colour, '
      + 'shown to establish page format and panel grammar, not final art. '.repeat(8);
    for (const part of chunkForSpeech(long)) {
      assert.ok(part.length <= MAX_CHUNK, `"${part}" is ${part.length} chars`);
    }
  });

  test('no word is dropped or duplicated', () => {
    const source = 'Alpha beta. Gamma delta epsilon! Zeta? Eta theta iota kappa lambda.';
    const words = chunkForSpeech(source, { max: 20, head: 20 })
      .join(' ').replace(/[.,!?;]/g, '').split(/\s+/).filter(Boolean);
    assert.deepEqual(words, source.replace(/[.,!?;]/g, '').split(/\s+/).filter(Boolean));
  });

  test('a sentence longer than the budget breaks at a clause mark, mark kept', () => {
    const parts = chunkForSpeech('aaaa bbbb, cccc dddd, eeee ffff.', { max: 16, head: 16 });
    assert.ok(parts.every((p) => p.length <= 16), parts.join(' | '));
    assert.equal(parts[0], 'aaaa bbbb,');
  });

  test('a hard break gets a comma, never an invented full stop', () => {
    const parts = chunkForSpeech('aaaa bbbb cccc dddd eeee ffff gggg', { max: 12, head: 12 });
    assert.ok(parts.every((p) => p.length <= 13), parts.join(' | '));
    for (const p of parts.slice(0, -1)) {
      assert.ok(p.endsWith(','), `mid-sentence break should breathe, got "${p}"`);
    }
  });

  test('a single unbroken run is cut rather than blowing the budget', () => {
    const parts = chunkForSpeech('x'.repeat(40), { max: 10, head: 10 });
    assert.ok(parts.every((p) => p.length <= 11), parts.join(' | '));
  });

  test('the tail lands on a full stop so the passage sounds finished', () => {
    assert.deepEqual(chunkForSpeech('No terminator here'), ['No terminator here.']);
  });

  test('punctuation the writer typed is never changed', () => {
    assert.deepEqual(chunkForSpeech('Where is it?! Gone…'), ['Where is it?! Gone…']);
  });

  test('markdown is read as the words, not as the symbols', () => {
    assert.deepEqual(
      chunkForSpeech('## Ronnie\n\nShe is **fast**, and _late_, see [the wiki](/wiki).'),
      ['Ronnie. She is fast, and late, see the wiki.'],
    );
    assert.deepEqual(chunkForSpeech('- one\n- two'), ['one. two.']);
    assert.deepEqual(chunkForSpeech('A paragraph\n\nAnd another'), ['A paragraph. And another.']);
    assert.deepEqual(chunkForSpeech('Use `npm run dev` now.'), ['Use npm run dev now.']);
  });

  test('a bare asterisk is left alone — it is not emphasis', () => {
    assert.deepEqual(chunkForSpeech('Two * three.'), ['Two * three.']);
  });

  test('the shipped defaults are the ones the route and the docs quote', () => {
    assert.equal(MAX_CHUNK, 450);
    assert.ok(HEAD_CHUNK < MAX_CHUNK);
  });
});

describe('toSpeech', () => {
  test('tags never get read out', () => {
    assert.equal(toSpeech('<p>One</p><p>Two</p>'), 'One. Two.');
  });

  test('entities become the character they stand for', () => {
    assert.equal(toSpeech('<p>Salt &amp; pepper</p>'), 'Salt & pepper.');
  });

  test('an empty body is empty, not a stray full stop', () => {
    assert.equal(toSpeech(''), '');
    assert.equal(toSpeech('<p></p>'), '');
  });
});

describe('passage', () => {
  test('parts are joined with a pause between them', () => {
    assert.equal(passage('Ronnie', 'She is fast.'), 'Ronnie. She is fast');
  });

  test('blanks are dropped rather than leaving double stops', () => {
    assert.equal(passage('Ronnie', '', undefined, 'Fast'), 'Ronnie. Fast');
  });
});

describe('the two failure modes the budget exists to avoid', () => {
  test('a long opening sentence still respects the head budget', () => {
    const parts = chunkForSpeech('a '.repeat(200).trim() + '.', { max: 450, head: 180 });
    assert.ok(parts[0]!.length <= 180, `first chunk is ${parts[0]!.length}: "${parts[0]}"`);
  });

  test('no chunk is a runt, because a fragment is read flat', () => {
    /* Greedy packing lands exactly here: a long sentence, then a short one that
       just failed to fit beside it. */
    const text = `${'word '.repeat(88).trim()}. Short one. ${'other '.repeat(80).trim()}.`;
    const parts = chunkForSpeech(text);
    for (const p of parts.slice(0, -1)) {
      assert.ok(p.length >= 60, `"${p}" is ${p.length} chars — too short to read well`);
    }
    for (const p of parts) assert.ok(p.length <= MAX_CHUNK, `${p.length} > ${MAX_CHUNK}`);
  });

  test('merging a runt never breaks the budget', () => {
    const parts = chunkForSpeech('aaaaaaaa. bb. cccccccc. dd.', { max: 12, head: 12 });
    for (const p of parts) assert.ok(p.length <= 12, `"${p}" is ${p.length}`);
  });
});
