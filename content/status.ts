/* Build status — where a manga portal would put a daily mission, this puts
   what is and isn't finished.

   Every row here must be checkable against the actual repository. It is the
   site's honesty surface: if one of these stops being true, change it. */

export type StatusState = 'done' | 'wip' | 'none';

export type StatusRow = {
  id: string;
  label: string;
  state: StatusState;
  note: string;
  /** small pill on the right; blank omits it */
  chip: string;
};

export type StatusContent = { rows: StatusRow[] };

export const status: StatusContent = {
  rows: [
    { id: 'st1', label: 'Character art', state: 'done', note: 'Finished',     chip: '5 sheets' },
    { id: 'st2', label: 'Comic pages',   state: 'wip',  note: 'Rough drafts', chip: '10' },
    { id: 'st3', label: 'Reading order', state: 'wip',  note: 'Provisional',  chip: 'unset' },
    { id: 'st4', label: 'Wiki',          state: 'none', note: 'Not started',  chip: 'empty' },
    { id: 'st5', label: 'Logo',          state: 'wip',  note: 'Raster only',  chip: 'SVG wanted' },
  ],
};
