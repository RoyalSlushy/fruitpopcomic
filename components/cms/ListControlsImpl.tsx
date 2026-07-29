'use client';

import { useCms } from '../../lib/cms-context.tsx';
import { templateForList, labelFor } from '../../lib/cms-schema.ts';

/* The template is the same object the merge uses as the base for stored items
   past the end of the code defaults — one definition, so an added item and a
   merged item are the same shape by construction rather than by coincidence. */
export default function ListControlsImpl({
  listPath, index, length, addOnly = false,
}: {
  listPath: string;
  index: number;
  length: number;
  addOnly?: boolean;
}) {
  const { listInsert, listRemove, listMove } = useCms();
  const what = labelFor(`${listPath}.0`) ?? 'item';

  const add = () => {
    const item = templateForList(listPath) as Record<string, unknown>;
    /* Ids are what let the merge match items across a reorder, so every new
       item gets one rather than relying on its index. */
    if (item && typeof item === 'object' && 'id' in item) {
      item.id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    }
    listInsert(listPath, index, item);
  };

  if (addOnly) {
    return (
      <button type="button" className="cms-list__add" onClick={add}>
        + Add {what}
      </button>
    );
  }

  return (
    <span className="cms-list" role="group" aria-label={`Reorder or remove ${what} ${index + 1}`}>
      <button
        type="button" className="cms-list__btn" aria-label="Move up"
        disabled={index === 0}
        onClick={(e) => { e.preventDefault(); listMove(listPath, index, index - 1); }}
      >↑</button>
      <button
        type="button" className="cms-list__btn" aria-label="Move down"
        disabled={index >= length - 1}
        onClick={(e) => { e.preventDefault(); listMove(listPath, index, index + 1); }}
      >↓</button>
      <button
        type="button" className="cms-list__btn cms-list__btn--del" aria-label="Delete"
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Delete this ${what}? It stays deleted — the code default will not bring it back.`)) {
            listRemove(listPath, index);
          }
        }}
      >×</button>
    </span>
  );
}
