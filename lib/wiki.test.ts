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
