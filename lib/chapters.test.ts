import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterOf, group, isScriptPage, siblings } from './chapters.ts';
import type { Chapter, ComicPage } from '../content/pages.ts';

const ch = (id: string, title = id): Chapter => ({ id, title, blurb: '' });

const pg = (id: string, chapter: string, image = `/${id}.jpg`): ComicPage => ({
  id, image, thumb: '', stage: 'blue', isDraft: true, alt: '', chapter, script: '',
});

test('chapters come back in declared order, pages in running order', () => {
  const g = group([ch('a'), ch('b')], [
    pg('p1', 'a'), pg('p2', 'b'), pg('p3', 'a'),
  ]);
  assert.deepEqual(g.map((x) => x.chapter?.id), ['a', 'b']);
  assert.deepEqual(g[0]?.pages.map((p) => p.page.id), ['p1', 'p3']);
  assert.deepEqual(g[1]?.pages.map((p) => p.page.id), ['p2']);
});

test('the index carried alongside each page is its place in the flat order', () => {
  const g = group([ch('a')], [pg('p1', 'a'), pg('p2', 'a'), pg('p3', 'a')]);
  assert.deepEqual(g[0]?.pages.map((p) => p.index), [0, 1, 2]);
});

/* The rule the whole module exists for. */
test('a page naming a chapter that does not exist is still reachable', () => {
  const g = group([ch('a')], [pg('p1', 'a'), pg('p2', 'typo')]);
  assert.equal(g.length, 2);
  assert.equal(g[1]?.chapter, null);
  assert.deepEqual(g[1]?.pages.map((p) => p.page.id), ['p2']);
});

test('a page with no chapter at all lands in the same unsorted bucket', () => {
  const g = group([ch('a')], [pg('p1', ''), pg('p2', 'a')]);
  assert.equal(g.at(-1)?.chapter, null);
  assert.deepEqual(g.at(-1)?.pages.map((p) => p.page.id), ['p1']);
});

test('no unsorted heading appears when there is nothing under it', () => {
  const g = group([ch('a')], [pg('p1', 'a')]);
  assert.equal(g.length, 1);
});

test('an empty chapter is kept, so it can be seen and filled', () => {
  const g = group([ch('a'), ch('empty')], [pg('p1', 'a')]);
  assert.equal(g.length, 2);
  assert.deepEqual(g[1]?.pages, []);
});

test('no page is ever dropped, whatever the chapter ids say', () => {
  const items = [pg('p1', 'a'), pg('p2', ''), pg('p3', 'gone'), pg('p4', 'b')];
  const total = group([ch('a'), ch('b')], items)
    .reduce((n, g) => n + g.pages.length, 0);
  assert.equal(total, items.length);
});

test('siblings scopes paging to the chapter the page is in', () => {
  const items = [pg('p1', 'a'), pg('p2', 'b'), pg('p3', 'a')];
  const s = siblings([ch('a'), ch('b')], items, 0);
  assert.deepEqual(s.map((p) => p.page.id), ['p1', 'p3']);
  assert.deepEqual(s.map((p) => p.index), [0, 2]);
});

test('siblings of an unsorted page are the other unsorted ones', () => {
  const items = [pg('p1', 'a'), pg('p2', ''), pg('p3', 'nope')];
  assert.deepEqual(
    siblings([ch('a')], items, 1).map((p) => p.page.id),
    ['p2', 'p3'],
  );
});

test('siblings of an index that is not there is empty, not a crash', () => {
  assert.deepEqual(siblings([ch('a')], [pg('p1', 'a')], 9), []);
});

test('chapterOf resolves the chapter, or null when nothing matches', () => {
  const chapters = [ch('a', 'First')];
  assert.equal(chapterOf(chapters, pg('p1', 'a'))?.title, 'First');
  assert.equal(chapterOf(chapters, pg('p2', 'zz')), null);
  assert.equal(chapterOf(chapters, undefined), null);
});

test('a page with no image is a script page', () => {
  assert.equal(isScriptPage(pg('p1', 'a', '')), true);
  assert.equal(isScriptPage(pg('p2', 'a', '   ')), true, 'whitespace is not a drawing');
  assert.equal(isScriptPage(pg('p3', 'a', '/real.jpg')), false);
  assert.equal(isScriptPage(undefined), false);
});
