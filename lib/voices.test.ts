import { test } from 'node:test';
import assert from 'node:assert/strict';
import { best, rank, score, split, type VoiceInfo } from './voices.ts';

/* The ranking is the whole feature: a picker that lists voices in the order the
   browser happens to report them is no better than the default it replaces.
   The cases below are real voice names from the three platforms. */

const v = (name: string, over: Partial<VoiceInfo> = {}): VoiceInfo => ({
  voiceURI: name,
  name,
  lang: 'en-US',
  localService: true,
  isDefault: false,
  ...over,
});

test('language beats every quality signal', () => {
  const wrongLangNeural = v('Microsoft Katja Online (Natural)', { lang: 'de-DE', localService: false });
  const rightLangPlain = v('Alex', { lang: 'en-US' });
  assert.ok(score(rightLangPlain, 'en') > score(wrongLangNeural, 'en'),
    'a plain English voice must outrank a superb German one when reading English');
});

test('neural and premium voices outrank the legacy synths beside them', () => {
  const list = [
    v('Alex'),
    v('Microsoft Aria Online (Natural)', { localService: false }),
    v('Daniel'),
  ];
  assert.equal(best(list, 'en')?.name, 'Microsoft Aria Online (Natural)');
});

test("macOS novelty voices sink, even though they sort first alphabetically", () => {
  const list = [v('Albert'), v('Bad News'), v('Bells'), v('Samantha')];
  const order = rank(list, 'en').map((x) => x.name);
  assert.equal(order[0], 'Samantha');
  assert.deepEqual(order.slice(1).sort(), ['Albert', 'Bad News', 'Bells']);
});

test('compact and eloquence variants rank below their full counterparts', () => {
  const list = [v('Samantha (Compact)'), v('Samantha')];
  assert.equal(best(list, 'en')?.name, 'Samantha');
});

test('an exact locale match edges out a same-language one', () => {
  const list = [v('Voice GB', { lang: 'en-GB' }), v('Voice US', { lang: 'en-US' })];
  assert.equal(best(list, 'en-US')?.name, 'Voice US');
});

test('ranking keeps every voice — other languages go last, not away', () => {
  const list = [
    v('Kyoko', { lang: 'ja-JP' }),
    v('Samantha', { lang: 'en-US' }),
    v('Anna', { lang: 'de-DE' }),
  ];
  const order = rank(list, 'en');
  assert.equal(order.length, 3, 'nothing is dropped');
  assert.equal(order[0]?.name, 'Samantha');
});

test('ties keep their original order rather than shuffling per engine', () => {
  const list = [v('One'), v('Two'), v('Three')];
  assert.deepEqual(rank(list, 'en').map((x) => x.name), ['One', 'Two', 'Three']);
  /* Same input, same output — the picker must not reorder between renders. */
  assert.deepEqual(rank(list, 'en').map((x) => x.name), ['One', 'Two', 'Three']);
});

test('rank does not mutate what it is given', () => {
  const list = [v('Albert'), v('Samantha')];
  rank(list, 'en');
  assert.deepEqual(list.map((x) => x.name), ['Albert', 'Samantha']);
});

test('split recommends the neural voices when the device has any', () => {
  const { top, rest } = split([
    v('Albert'),
    v('Samantha'),
    v('Microsoft Aria Online (Natural)', { localService: false }),
    v('Microsoft Ryan Online (Natural)', { localService: false }),
  ], 'en');
  assert.deepEqual(top.map((x) => x.name),
    ['Microsoft Aria Online (Natural)', 'Microsoft Ryan Online (Natural)']);
  assert.deepEqual(rest.map((x) => x.name), ['Samantha', 'Albert']);
});

/* The case an absolute threshold gets wrong. Google's voices are the best
   thing on Android and Chrome OS and none of them says "natural" anywhere. */
test('split still recommends something when nothing is branded neural', () => {
  const { top } = split([
    v('Google UK English Female', { lang: 'en-GB', localService: false }),
    v('Google US English', { localService: false }),
    v('Albert'),
    v('Bad News'),
  ], 'en');
  assert.ok(top.length > 0, 'the recommended group must never be empty');
  assert.ok(top.some((x) => x.name.startsWith('Google')));
  assert.ok(!top.some((x) => x.name === 'Bad News'), 'and must not recommend a joke');
});

test('split never recommends a voice in the wrong language', () => {
  const { top, rest } = split([
    v('Microsoft Katja Online (Natural)', { lang: 'de-DE', localService: false }),
    v('Samantha', { lang: 'en-US' }),
  ], 'en');
  assert.deepEqual(top.map((x) => x.name), ['Samantha']);
  assert.deepEqual(rest.map((x) => x.name), ['Microsoft Katja Online (Natural)']);
});

test('split keeps every voice across the two groups', () => {
  const list = [v('Alex'), v('Samantha'), v('Kyoko', { lang: 'ja-JP' }), v('Albert')];
  const { top, rest } = split(list, 'en');
  assert.equal(top.length + rest.length, list.length);
  assert.equal(new Set([...top, ...rest]).size, list.length, 'and none twice');
});

test('split copes with a device that reports nothing', () => {
  assert.deepEqual(split([], 'en'), { top: [], rest: [] });
});

test('an empty list resolves to nothing rather than throwing', () => {
  assert.equal(best([], 'en'), null);
  assert.deepEqual(rank([], 'en'), []);
});

test('missing or odd metadata does not blow up the sort', () => {
  const odd = [
    { voiceURI: 'a', name: '', lang: '', localService: true, isDefault: false },
    v('Samantha'),
  ];
  assert.equal(best(odd, 'en')?.name, 'Samantha');
});
