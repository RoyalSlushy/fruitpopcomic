import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { deepMerge, mergeSection, DEFAULTS, isSectionKey } from './cms.ts';
import {
  getByPath, setByPath, insertAt, removeAt, moveItem, normalizePath, sectionOf,
} from './path.ts';

/* Console noise: the merge warns on every deliberate mismatch below. */
const quiet = <T>(fn: () => T): T => {
  const w = console.warn;
  console.warn = () => {};
  try { return fn(); } finally { console.warn = w; }
};

describe('paths', () => {
  test('normalizePath replaces indices with *', () => {
    assert.equal(normalizePath('team.members.2.photo'), 'team.members.*.photo');
    assert.equal(normalizePath('pages.items.10'), 'pages.items.*');
    assert.equal(normalizePath('site.title'), 'site.title');
    // "2x" is not an index
    assert.equal(normalizePath('a.2x.b'), 'a.2x.b');
  });

  test('sectionOf is the first segment', () => {
    assert.equal(sectionOf('pages.items.0.stage'), 'pages');
    assert.equal(sectionOf('site'), 'site');
  });

  test('getByPath walks objects and arrays, undefined off the end', () => {
    const o = { a: { b: [{ c: 1 }, { c: 2 }] } };
    assert.equal(getByPath(o, 'a.b.1.c'), 2);
    assert.equal(getByPath(o, 'a.b.9.c'), undefined);
    assert.equal(getByPath(o, 'a.nope.c'), undefined);
    assert.deepEqual(getByPath(o, ''), o);
  });

  test('setByPath is immutable and shares untouched branches', () => {
    const o = { a: { b: [{ c: 1 }, { c: 2 }] }, keep: { deep: true } };
    const next = setByPath(o, 'a.b.1.c', 99);
    assert.equal(getByPath(next, 'a.b.1.c'), 99);
    assert.equal(getByPath(o, 'a.b.1.c'), 2, 'original untouched');
    assert.notEqual(next.a, o.a, 'path is cloned');
    assert.equal(next.keep, o.keep, 'untouched branch is shared');
  });

  test('setByPath creates missing structure', () => {
    assert.deepEqual(setByPath({}, 'a.b.0.c', 7), { a: { b: [{ c: 7 }] } });
  });

  test('list ops', () => {
    const o = { l: ['a', 'b', 'c'] };
    assert.deepEqual(insertAt(o, 'l', 1, 'x').l, ['a', 'x', 'b', 'c']);
    assert.deepEqual(insertAt(o, 'l', 99, 'x').l, ['a', 'b', 'c', 'x'], 'clamps');
    assert.deepEqual(removeAt(o, 'l', 0).l, ['b', 'c']);
    assert.deepEqual(removeAt(o, 'l', 99).l, ['a', 'b', 'c'], 'out of range is a no-op');
    assert.deepEqual(moveItem(o, 'l', 0, 2).l, ['b', 'c', 'a']);
    assert.deepEqual(moveItem(o, 'l', 2, 0).l, ['c', 'a', 'b']);
    assert.deepEqual(o.l, ['a', 'b', 'c'], 'original untouched');
  });
});

describe('merge — the load-bearing behaviour', () => {
  test('empty database yields the code defaults exactly', () => {
    for (const key of Object.keys(DEFAULTS)) {
      assert.deepEqual(mergeSection(key as never, undefined), DEFAULTS[key as never]);
    }
  });

  test('a field added in CODE appears even when the array is already stored', () => {
    // the DB was written before `stage` existed
    const base = { items: [{ id: 'a', text: 'one', stage: 'blue' }] };
    const stored = { items: [{ id: 'a', text: 'EDITED' }] };
    const out = deepMerge(base, stored, 'x');
    assert.deepEqual(out.items[0], { id: 'a', text: 'EDITED', stage: 'blue' });
  });

  test('item-wise merge across several items', () => {
    const base = { items: [{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: 3 }] };
    const stored = { items: [{ a: 9 }, { b: 9 }, {}] };
    const out = deepMerge(base, stored, 'x');
    assert.deepEqual(out.items, [{ a: 9, b: 1 }, { a: 2, b: 9 }, { a: 3, b: 3 }]);
  });

  test('a DELETED item stays deleted — defaults do not resurrect it', () => {
    const base = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
    const stored = { items: [{ id: 'a' }, { id: 'c' }] };
    const out = deepMerge(base, stored, 'x');
    assert.equal(out.items.length, 2);
    assert.deepEqual(out.items.map((i) => i.id), ['a', 'c']);
  });

  test('an emptied list stays empty', () => {
    const out = deepMerge({ items: [{ id: 'a' }] }, { items: [] }, 'x');
    assert.deepEqual(out.items, []);
  });

  test('items past the end of the defaults merge over the schema template', () => {
    // pages.items.* template supplies stage/isDraft/alt for a user-added page
    const stored = {
      items: [
        ...DEFAULTS.pages.items,
        { id: 'new', image: 'uploads/new.jpg', thumb: 'uploads/new.jpg' },
      ],
    };
    const out = mergeSection('pages', stored);
    const added = out.items[10]!;
    assert.equal(added.id, 'new');
    assert.equal(added.stage, 'blue', 'from the template');
    assert.equal(added.isDraft, true, 'from the template');
    assert.equal(added.alt, '', 'from the template');
    // and crucially NOT from items[0]
    assert.notEqual(added.image, DEFAULTS.pages.items[0]!.image);
  });

  test('an extra item does not inherit item 0 real content', () => {
    const stored = { items: [...DEFAULTS.status.rows, { id: 'x', label: 'New thing' }] };
    const out = mergeSection('status', { rows: stored.items });
    const added = out.rows[5]!;
    assert.equal(added.label, 'New thing');
    assert.notEqual(added.note, DEFAULTS.status.rows[0]!.note);
    assert.equal(added.note, '', 'template blank, not row 0');
  });

  test('type mismatches keep the code value', () => {
    quiet(() => {
      // code object, DB string
      assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: 'oops' }, 'x'), { a: { b: 1 } });
      // code array, DB object
      assert.deepEqual(deepMerge({ a: [1, 2] }, { a: { 0: 9 } }, 'x'), { a: [1, 2] });
      // code string, DB number
      assert.deepEqual(deepMerge({ a: 'text' }, { a: 42 }, 'x'), { a: 'text' });
      // code array, DB string
      assert.deepEqual(deepMerge({ a: [1] }, { a: 'no' }, 'x'), { a: [1] });
    });
  });

  test('null is a stored value; undefined means not overridden', () => {
    assert.deepEqual(deepMerge({ a: 'x', b: 'y' }, { a: null }, 'p'), { a: null, b: 'y' });
    assert.deepEqual(deepMerge({ a: 'x' }, { a: undefined }, 'p'), { a: 'x' });
    assert.deepEqual(deepMerge({ a: 'x' }, {}, 'p'), { a: 'x' });
  });

  test('booleans and numbers round-trip', () => {
    const out = deepMerge({ n: 1, b: true }, { n: 0, b: false }, 'p');
    assert.deepEqual(out, { n: 0, b: false });
  });

  test('code owns shape: a stored key the code no longer has is dropped', () => {
    const out = quiet(() =>
      deepMerge({ a: 1 }, { a: 2, legacy: 'stale' }, 'p')) as Record<string, unknown>;
    assert.equal(out.a, 2, 'known keys still merge');
    assert.ok(!('legacy' in out), 'unknown key does not reach the render');
  });

  test('array items match by identity, so a reorder does not smear fields', () => {
    // code gains `stage`; the DB has the same two items in the OTHER order
    const base = { items: [{ id: 'a', stage: 'blue' }, { id: 'b', stage: 'final' }] };
    const stored = { items: [{ id: 'b' }, { id: 'a' }] };
    const out = deepMerge(base, stored, 'x');
    assert.deepEqual(out.items, [{ id: 'b', stage: 'final' }, { id: 'a', stage: 'blue' }]);
  });

  test('setByPath refuses undefined — it would silently revert through JSON', () => {
    assert.throws(() => setByPath({ a: 1 }, 'a', undefined), /undefined is not storable/);
    assert.doesNotThrow(() => setByPath({ a: 1 }, 'a', null));
  });

  test('setByPath refuses prototype-polluting keys', () => {
    assert.throws(() => setByPath({}, '__proto__.x', 1), /reserved key/);
    assert.throws(() => setByPath({}, 'a.constructor.x', 1), /reserved key/);
  });

  test('a stored __proto__ key cannot reach the merged output', () => {
    const out = quiet(() =>
      deepMerge({ a: 1 }, JSON.parse('{"a":2,"__proto__":{"polluted":true}}'), 'p'));
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.deepEqual(out, { a: 2 });
  });

  test('a non-object stored section is ignored wholesale', () => {
    quiet(() => {
      assert.deepEqual(mergeSection('site', 'garbage'), DEFAULTS.site);
      assert.deepEqual(mergeSection('site', 42), DEFAULTS.site);
      assert.deepEqual(mergeSection('site', []), DEFAULTS.site);
    });
  });

  test('null section falls through to null, not a crash', () => {
    assert.doesNotThrow(() => mergeSection('site', null));
  });

  test('deeply nested partial overrides', () => {
    const out = mergeSection('home', { hero: { title: 'New headline' } });
    assert.equal(out.hero.title, 'New headline');
    assert.equal(out.hero.kicker, DEFAULTS.home.hero.kicker, 'siblings survive');
    assert.equal(out.ribbons.hot, DEFAULTS.home.ribbons.hot, 'other branches survive');
    assert.deepEqual(out.quick, DEFAULTS.home.quick);
  });

  test('the merge never mutates DEFAULTS', () => {
    const before = JSON.stringify(DEFAULTS);
    mergeSection('pages', { items: [{ id: 'zzz', stage: 'final' }] });
    mergeSection('home', { hero: { title: 'x' } });
    assert.equal(JSON.stringify(DEFAULTS), before);
  });

  test('isSectionKey gates unknown keys', () => {
    assert.ok(isSectionKey('pages'));
    assert.ok(!isSectionKey('__proto__'));
    assert.ok(!isSectionKey('nope'));
    assert.ok(!isSectionKey(1));
  });
});
