import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitBody } from './wiki.ts';

test('empty body splits to nothing', () => {
  assert.deepEqual(splitBody(''), { lead: '', sections: [] });
  assert.deepEqual(splitBody('   '), { lead: '', sections: [] });
});

test('a body with no headings is all lead', () => {
  const { lead, sections } = splitBody('<p>One paragraph.</p>');
  assert.equal(lead, '<p>One paragraph.</p>');
  assert.deepEqual(sections, []);
});

test('lead and sections split at h3 boundaries', () => {
  const { lead, sections } = splitBody(
    '<p>Intro.</p>\n<h3>Appearance</h3>\n<p>Tall.</p>\n<h3>Powers</h3>\n<p>Blasts.</p>',
  );
  assert.equal(lead, '<p>Intro.</p>');
  const [look, power] = sections;
  assert.ok(look && power);
  assert.equal(look.heading, 'Appearance');
  assert.equal(power.heading, 'Powers');
  assert.match(look.html, /^<h3>Appearance<\/h3>/);
  assert.match(power.html, /Blasts/);
});

test('a body opening on a heading has no lead', () => {
  const { lead, sections } = splitBody('<h3>Quick facts</h3><ul><li>a</li></ul>');
  assert.equal(lead, '');
  const [only] = sections;
  assert.ok(only);
  assert.equal(only.heading, 'Quick facts');
});

/* The whole point: rendering the pieces must render the original. */
test('nothing is added or dropped', () => {
  const body = '<p>Lead.</p><h3>A</h3><p>one</p><h3>B</h3><p>two</p>';
  const { lead, sections } = splitBody(body);
  assert.equal(lead + sections.map((s) => s.html).join(''), body);
});

test('heading text survives tags and entities', () => {
  const { sections } = splitBody('<h3>Powers &amp; <em>abilities</em></h3><p>x</p>');
  assert.equal(sections[0]?.heading, 'Powers & abilities');
});

test('h3 attributes do not break the split', () => {
  const { sections } = splitBody('<h3 class="x" id="y">Arc</h3><p>x</p>');
  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.heading, 'Arc');
});

/* h2 and h4 are not boundaries — only the level the entries section with. */
test('other heading levels are not boundaries', () => {
  const { lead, sections } = splitBody('<h2>Title</h2><p>x</p><h4>Sub</h4><p>y</p>');
  assert.equal(sections.length, 0);
  assert.match(lead, /^<h2>/);
});

/* ── blocks ─────────────────────────────────────────────────── */

import { blocksOf, isBlankBlock, blocksToHTML, toHTML } from './wiki.ts';

const block = (over: Partial<{ id: string; heading: string; html: string; image: string; caption: string }> = {}) =>
  ({ id: 'x', heading: '', html: '', image: '', caption: '', ...over });

test('toHTML auto-paragraphs plain text and passes markup through', () => {
  assert.equal(toHTML('one\n\ntwo'), '<p>one</p><p>two</p>');
  assert.equal(toHTML('a\nb'), '<p>a<br>b</p>');
  assert.equal(toHTML('<p>already</p>'), '<p>already</p>');
  assert.equal(toHTML('  '), '');
  assert.equal(toHTML('a & b'), '<p>a &amp; b</p>');
});

test('stored blocks win over the legacy body', () => {
  const out = blocksOf({ blocks: [block({ heading: 'Kept', html: '<p>x</p>' })], body: '<p>ignored</p>' });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.heading, 'Kept');
});

test('an entry with no blocks falls back to the legacy body', () => {
  const out = blocksOf({ blocks: [], body: '<p>Lead.</p><h3>One</h3><p>a</p>' });
  assert.equal(out.length, 2);
  assert.equal(out[0]?.heading, '');
  assert.equal(out[1]?.heading, 'One');
  /* The <h3> became the block's heading and must not also remain in its
     markup, or the page would draw the heading twice. */
  assert.ok(!/<h3/i.test(out[1]?.html ?? ''));
});

/* The editor addresses a block by index, so the array it renders has to be
   the array that is stored — same length, same order, blanks included. */
test('blocksOf preserves index, blank blocks and all', () => {
  const out = blocksOf({
    blocks: [block({ id: 'a', html: '<p>one</p>' }), block({ id: 'b' }), block({ id: 'c', html: '<p>three</p>' })],
    body: '',
  });
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((b) => b.id), ['a', 'b', 'c']);
});

test('block html is sanitised on the way out', () => {
  const out = blocksOf({ blocks: [block({ html: '<p onclick="x()">hi</p><script>y()</script>' })], body: '' });
  assert.equal(out[0]?.html, '<p>hi</p>');
});

test('isBlankBlock only counts what a reader would see', () => {
  assert.ok(isBlankBlock(block()));
  assert.ok(isBlankBlock(block({ html: '<p><br></p>' })));
  assert.ok(isBlankBlock(block({ caption: 'orphan caption' })));   // no picture to caption
  assert.ok(!isBlankBlock(block({ heading: 'A' })));
  assert.ok(!isBlankBlock(block({ image: '/x.png' })));
  assert.ok(!isBlankBlock(block({ html: '<p>a</p>' })));
});

test('blocksToHTML rebuilds one readable string for speech', () => {
  const html = blocksToHTML([
    block({ heading: 'One', html: '<p>a</p>' }),
    block({ heading: '', html: '<p>b</p>', caption: 'ignored without a picture' }),
  ]);
  assert.match(html, /<h3>One<\/h3><p>a<\/p>/);
  assert.match(html, /<p>b<\/p>/);
});
