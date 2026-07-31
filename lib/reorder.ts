/* Turning "I dropped it here" into the move a list actually performs.
 *
 * Dragging thinks in GAPS: an item is dropped into the space before some
 * position. moveItem() thinks in INDICES, and it splices the item out before
 * putting it back — so once the source has been lifted, every gap after it has
 * shifted down by one. Off-by-one here means a page that lands next to where
 * you dropped it, which is the kind of bug that survives a demo and annoys
 * someone for a year.
 *
 * Pure. No DOM, no React.
 */

/**
 * The index to hand moveItem(), given the gap the pointer was released over.
 *
 * `before` is a gap, so it ranges 0..length inclusive: 0 is "in front of
 * everything", length is "after everything".
 */
export function dropTo(from: number, before: number): number {
  return before > from ? before - 1 : before;
}

/** True when the drop would leave the list exactly as it was. */
export const isNoop = (from: number, before: number): boolean =>
  before === from || before === from + 1;

/**
 * The gap nearest a pointer, given each item's box.
 *
 * Boxes arrive in list order and carry the index they represent, which is not
 * necessarily their position in the array: the reader's filmstrip shows one
 * chapter, so the boxes hold flat indices with gaps between them.
 *
 * The comparison is horizontal because every list this drives — the desktop
 * rail and the phone's grid — flows left to right. The nearest box is found in
 * two dimensions first, so a grid picks the right row before it picks a side.
 */
export function gapAt(
  boxes: { index: number; x: number; y: number; right: number }[],
  px: number,
  py: number,
): { before: number; over: number; side: 'before' | 'after' } | null {
  if (!boxes.length) return null;

  let best = boxes[0]!;
  let bestD = Infinity;
  for (const b of boxes) {
    const dx = px - b.x;
    const dy = py - b.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = b; }
  }

  const side = px < best.x ? 'before' : 'after';
  return {
    over: best.index,
    side,
    before: side === 'before' ? best.index : best.index + 1,
  };
}
