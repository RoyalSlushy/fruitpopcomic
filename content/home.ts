/* The dashboard. Ribbon labels are content because they are the panel
   headings a visitor actually reads. */

export type QuickTile = {
  id: string;
  label: string;
  sub: string;
  href: string;
  /** which inline SVG the tile draws; see components/site/Glyph.tsx */
  glyph: string;
  hue: string;
};

export type HomeContent = {
  /* No `hot`: the hero panel carries no ribbon. It is the only panel whose
     subject is obvious from the panel, and a caption box over the artwork was
     labelling a picture that needed no label. */
  ribbons: { start: string; drafts: string; status: string; quick: string };
  hero: { badge: string; title: string; sub: string; cta: string };
  startHere: { seeAll: string; count: number };
  quick: QuickTile[];
};

export const home: HomeContent = {
  ribbons: {
    start:  'Start here',
    drafts: 'The drafts',
    status: 'Build status',
    quick:  'Quick access',
  },
  hero: {
    badge:  'Drafts',
    title:  'Start at the beginning',
    sub:    'Ten rough pages, in the order they were drawn. Arrows, filmstrip, or the keyboard.',
    cta:    'Read now →',
  },
  startHere: {
    seeAll: 'See all chapters →',
    /* how many chapters the rail lists before the "see all" link */
    count: 5,
  },
  quick: [
    { id: 'cast',  label: 'Cast',  sub: "Who's who",   href: '/cast',  glyph: 'cast', hue: 'cyan'   },
    { id: 'wiki',  label: 'Wiki',  sub: 'The world',   href: '/wiki',  glyph: 'wiki', hue: 'gold'   },
    { id: 'art',   label: 'Art',   sub: 'Extras',      href: '/art',   glyph: 'star', hue: 'peach'  },
    { id: 'about', label: 'About', sub: 'The project', href: '/about', glyph: 'info', hue: 'indigo' },
  ],
};
