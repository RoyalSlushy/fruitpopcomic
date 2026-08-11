import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, linkify, type LinkTerm } from './wikilinks.ts';
import type { WikiEntry } from '../content/wiki.ts';

const entry = (slug: string, title: string, published = true): WikiEntry => ({
  id: slug, slug, title, category: 'character',
  summary: '', blocks: [], body: '', image: '', published,
});

const IDX = buildIndex([
  entry('ronnie-omalley', 'Ronnie O’Malley'),
  entry('pittscoke', 'Pittscoke'),
  entry('power-fruits', 'Power Fruits'),
  entry('pomeroys', 'Pomeroys'),
  entry('the-orchard', 'The Orchard'),
  entry('mcintosh', 'McIntosh / The Crimson Comet'),
  entry('star-keys', 'Rank and Star Keys'),
]);

const link = (html: string, self = 'x') => linkify(html, IDX, self, new Set());

test('the index carries titles, aliases and article-stripped names', () => {
  const has = (t: string) => IDX.some((x: LinkTerm) => x.text === t);
  assert.ok(has('Ronnie O’Malley'));
  assert.ok(has('Ronnie'));            // alias
  assert.ok(has('Lady Starburst'));    // alias
  assert.ok(has('Orchard'));           // "The Orchard" without the article
  assert.ok(has('McIntosh'));          // one half of an "A / B" title
  assert.ok(has('Crimson Comet'));
});

test('the index is longest-first so the specific term wins', () => {
  const lens = IDX.map((t) => t.text.length);
  assert.deepEqual(lens, [...lens].sort((a, b) => b - a));
});

test('a plain mention becomes a link', () => {
  assert.equal(
    link('<p>She lives in Pittscoke.</p>'),
    '<p>She lives in <a class="wikilink" href="/wiki/pittscoke">Pittscoke</a>.</p>',
  );
});

/* The encyclopedia rule. */
test('only the first mention in an entry is linked', () => {
  const out = link('<p>Pittscoke is cold. Pittscoke is foggy.</p>');
  assert.equal((out.match(/wikilink/g) ?? []).length, 1);
  assert.match(out, /<a[^>]*>Pittscoke<\/a> is cold\. Pittscoke is foggy\./);
});

test('the first-mention rule spans the blocks of one entry', () => {
  const used = new Set<string>();
  const a = linkify('<p>Pittscoke.</p>', IDX, 'x', used);
  const b = linkify('<p>Pittscoke again.</p>', IDX, 'x', used);
  assert.match(a, /wikilink/);
  assert.doesNotMatch(b, /wikilink/);
});

test('an entry never links to itself', () => {
  assert.equal(link('<p>Pittscoke is cold.</p>', 'pittscoke'), '<p>Pittscoke is cold.</p>');
});

test('the longer name wins over the shorter one inside it', () => {
  const out = link('<p>She ate the Power Fruits.</p>');
  assert.match(out, />Power Fruits</);
  assert.doesNotMatch(out, />Fruits</);
});

test('a word is not matched inside a longer word', () => {
  /* "Pomeroys" must not be found inside "Pomeroyish", nor "Ronnie" in
     "Ronnieton". */
  assert.doesNotMatch(link('<p>Pomeroyish behaviour.</p>'), /wikilink/);
  assert.doesNotMatch(link('<p>Ronnieton.</p>'), /wikilink/);
});

test('a possessive still links just the name', () => {
  assert.match(link('<p>Ronnie’s dog.</p>'), /<a[^>]*>Ronnie<\/a>’s dog/);
});

test('text already inside a link is left alone', () => {
  const html = '<p><a href="/x">Visit Pittscoke</a> today.</p>';
  assert.equal(link(html), html);
});

test('headings are not linked', () => {
  const html = '<h3>Pittscoke</h3><h4>Pittscoke</h4>';
  assert.equal(link(html), html);
});

test('markup and attributes are never touched', () => {
  const html = '<p class="Pittscoke" title="Pittscoke">Pittscoke</p>';
  const out = link(html);
  assert.match(out, /<p class="Pittscoke" title="Pittscoke">/);
  assert.equal((out.match(/wikilink/g) ?? []).length, 1);
});

test('case-sensitive by default, so ordinary words stay ordinary', () => {
  assert.doesNotMatch(link('<p>a pittscoke of a time</p>'), /wikilink/);
});

test('loose terms match either case', () => {
  assert.match(link('<p>He earned a star key.</p>'), /<a[^>]*>star key<\/a>/);
  assert.match(link('<p>Star Keys are valor marks.</p>'), /<a[^>]*>Star Keys<\/a>/);
});

test('unpublished entries are not linkable', () => {
  const idx = buildIndex([entry('secret', 'Secretsville', false)]);
  assert.equal(linkify('<p>Secretsville.</p>', idx, 'x', new Set()), '<p>Secretsville.</p>');
});

test('empty and text-free input survive', () => {
  assert.equal(link(''), '');
  assert.equal(link('<hr>'), '<hr>');
});

/* Nothing may be lost: stripping the tags this adds must give back the
   original text exactly. */
test('linking never changes the words', () => {
  const html = '<p>Ronnie went to Pittscoke to find the Power Fruits.</p>';
  const out = link(html).replace(/<a class="wikilink"[^>]*>/g, '').replace(/<\/a>/g, '');
  assert.equal(out, html);
});
