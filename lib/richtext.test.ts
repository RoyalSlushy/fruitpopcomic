import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRich, isBlankRich, richToText } from './richtext.ts';

test('empty in, empty out', () => {
  assert.equal(sanitizeRich(''), '');
  assert.equal(sanitizeRich('   '), '');
});

test('allowed prose survives unchanged', () => {
  const html = '<p>A <strong>bold</strong> and <em>italic</em> line.</p><ul><li>one</li></ul>';
  assert.equal(sanitizeRich(html), html);
});

test('the facts class is kept, other classes are not', () => {
  assert.equal(sanitizeRich('<ul class="facts"><li>a</li></ul>'), '<ul class="facts"><li>a</li></ul>');
  assert.equal(sanitizeRich('<ul class="evil"><li>a</li></ul>'), '<ul><li>a</li></ul>');
});

/* The point of the file. */
test('scripts are removed, content and all', () => {
  assert.equal(sanitizeRich('<p>hi</p><script>alert(1)</script>'), '<p>hi</p>');
  assert.equal(sanitizeRich('<style>body{display:none}</style><p>hi</p>'), '<p>hi</p>');
});

test('event handlers and styles are stripped from allowed tags', () => {
  assert.equal(sanitizeRich('<p onclick="steal()" style="color:red">hi</p>'), '<p>hi</p>');
});

test('javascript: hrefs are dropped, real ones kept', () => {
  assert.equal(sanitizeRich('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRich('<a href="  JaVaScRiPt:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRich('<a href="data:text/html,<b>">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRich('<a href="/wiki/ronnie">x</a>'), '<a href="/wiki/ronnie">x</a>');
  assert.equal(sanitizeRich('<a href="https://example.com">x</a>'), '<a href="https://example.com">x</a>');
  assert.equal(sanitizeRich('<a href="mailto:a@b.c">x</a>'), '<a href="mailto:a@b.c">x</a>');
});

/* A tab inside the scheme is the classic bypass. */
test('a scheme split by control characters is still caught', () => {
  assert.equal(sanitizeRich('<a href="java\tscript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRich('<a href="java&#x0A;script:alert(1)">x</a>'), '<a>x</a>');
});

test('unknown tags are unwrapped but keep their words', () => {
  assert.equal(sanitizeRich('<div><p>kept</p></div>'), '<p>kept</p>');
  assert.equal(sanitizeRich('<font color="red">words</font>'), 'words');
  assert.equal(sanitizeRich('<span style="x">words</span>'), 'words');
});

test('images are not prose and do not survive here', () => {
  assert.equal(sanitizeRich('<p>a</p><img src="x.png" onerror="go()">'), '<p>a</p>');
});

test('output is balanced', () => {
  assert.equal(sanitizeRich('<p>open'), '<p>open</p>');
  assert.equal(sanitizeRich('</p>stray'), 'stray');
  assert.equal(sanitizeRich('<ul><li>a</ul>'), '<ul><li>a</li></ul>');
});

test('stray angle brackets in text are escaped', () => {
  assert.equal(sanitizeRich('<p>a < b and c > d</p>'), '<p>a &lt; b and c &gt; d</p>');
});

test('real entities pass, bare ampersands are escaped', () => {
  assert.equal(sanitizeRich('<p>Gala &amp; Smith</p>'), '<p>Gala &amp; Smith</p>');
  assert.equal(sanitizeRich('<p>Gala & Smith</p>'), '<p>Gala &amp; Smith</p>');
});

test('sanitising twice changes nothing more', () => {
  const messy = '<div style="x"><p onclick="y">a &amp; <b>b</b><script>z()</script></div>';
  const once = sanitizeRich(messy);
  assert.equal(sanitizeRich(once), once);
});

test('isBlankRich sees through the markup a browser leaves behind', () => {
  assert.ok(isBlankRich(''));
  assert.ok(isBlankRich('<p><br></p>'));
  assert.ok(isBlankRich('<p>&nbsp;</p>'));
  assert.ok(!isBlankRich('<p>a</p>'));
});

test('richToText flattens to one readable line', () => {
  assert.equal(richToText('<p>One.</p><p>Two.</p>'), 'One. Two.');
  assert.equal(richToText('<ul><li>a</li><li>b</li></ul>'), 'a b');
  assert.equal(richToText('<p>Gala &amp; Smith</p>'), 'Gala & Smith');
});

/* What contentEditable actually produces when you turn a paragraph into a
   list. Left alone it round-trips through the parser as an empty paragraph,
   the list, and another empty paragraph. */
test('a block inside a paragraph closes the paragraph', () => {
  assert.equal(
    sanitizeRich('<p><ul><li>a</li></ul></p>'),
    '<ul><li>a</li></ul>',
  );
  assert.equal(
    sanitizeRich('<p>lead<ul><li>a</li></ul></p>'),
    '<p>lead</p><ul><li>a</li></ul>',
  );
  assert.equal(
    sanitizeRich('<p>one<p>two'),
    '<p>one</p><p>two</p>',
  );
});

test('paragraphs holding nothing are dropped', () => {
  assert.equal(sanitizeRich('<p></p><p>real</p><p><br></p>'), '<p>real</p>');
});

test('a list nested in a list is left alone', () => {
  assert.equal(
    sanitizeRich('<ul><li>a<ul><li>b</li></ul></li></ul>'),
    '<ul><li>a<ul><li>b</li></ul></li></ul>',
  );
});
