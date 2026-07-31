import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropTo, gapAt, isNoop } from './reorder.ts';
import { moveItem } from './path.ts';

/* dropTo is only correct in combination with moveItem, so it is tested through
   it: drop into a gap, and check the item landed where the gap was. */
const move = (letters: string, from: number, before: number): string => {
  const root = { list: letters.split('') };
  return (moveItem(root, 'list', from, dropTo(from, before)).list as string[]).join('');
};

test('dragging forward lands in the gap the pointer was over', () => {
  //                     gap: 0 1 2 3 4
  //                          |a|b|c|d|
  assert.equal(move('abcd', 0, 2), 'bacd', 'a into the gap after b');
  assert.equal(move('abcd', 0, 3), 'bcad');
  assert.equal(move('abcd', 0, 4), 'bcda', 'a to the very end');
});

test('dragging backward lands in the gap the pointer was over', () => {
  assert.equal(move('abcd', 3, 0), 'dabc', 'd to the very front');
  assert.equal(move('abcd', 3, 1), 'adbc');
  assert.equal(move('abcd', 2, 1), 'acbd');
});

test('the two gaps either side of an item are no-ops', () => {
  for (const before of [1, 2]) {
    assert.equal(move('abcd', 1, before), 'abcd', `gap ${before}`);
    assert.ok(isNoop(1, before));
  }
  assert.ok(!isNoop(1, 0));
  assert.ok(!isNoop(1, 3));
});

test('a one-item list cannot be reordered into a different one', () => {
  assert.equal(move('a', 0, 0), 'a');
  assert.equal(move('a', 0, 1), 'a');
});

test('every gap in a four-item list produces a valid permutation', () => {
  const src = 'abcd';
  for (let from = 0; from < 4; from++) {
    for (let before = 0; before <= 4; before++) {
      const out = move(src, from, before);
      assert.equal(out.length, 4, `${from}->${before} kept the length`);
      assert.deepEqual([...out].sort().join(''), src, `${from}->${before} kept every item`);
    }
  }
});

/* ── gapAt ── */

const box = (index: number, x: number, y = 50) => ({ index, x, y, right: x + 30 });

test('the gap is chosen by which side of the nearest item the pointer is on', () => {
  const boxes = [box(0, 50), box(1, 150), box(2, 250)];
  assert.deepEqual(gapAt(boxes, 140, 50), { over: 1, side: 'before', before: 1 });
  assert.deepEqual(gapAt(boxes, 160, 50), { over: 1, side: 'after', before: 2 });
});

test('past the last item the gap is the end of the list', () => {
  const boxes = [box(0, 50), box(1, 150)];
  assert.equal(gapAt(boxes, 400, 50)?.before, 2);
});

test('before the first item the gap is the front of the list', () => {
  const boxes = [box(0, 50), box(1, 150)];
  assert.equal(gapAt(boxes, 0, 50)?.before, 0);
});

/* A grid has to pick the row before it picks a side, or a pointer low and left
   snaps to the item above it. */
test('in a grid the nearest box wins on both axes', () => {
  const boxes = [
    box(0, 50, 40), box(1, 150, 40), box(2, 250, 40),
    box(3, 50, 200), box(4, 150, 200), box(5, 250, 200),
  ];
  assert.equal(gapAt(boxes, 140, 195)?.over, 4, 'second row, not the first');
  assert.equal(gapAt(boxes, 140, 45)?.over, 1);
});

test('the indices carried are the ones handed in, not positions', () => {
  /* The reader's filmstrip shows one chapter, so its boxes hold flat indices
     with gaps between them. */
  const boxes = [box(2, 50), box(7, 150), box(9, 250)];
  assert.deepEqual(gapAt(boxes, 260, 50), { over: 9, side: 'after', before: 10 });
  assert.deepEqual(gapAt(boxes, 140, 50), { over: 7, side: 'before', before: 7 });
});

test('an empty list has no gap rather than a wrong one', () => {
  assert.equal(gapAt([], 10, 10), null);
});
