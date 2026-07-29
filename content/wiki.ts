/* The wiki. It ships empty on purpose.

   An empty shelf is honest; an invented one is not. The empty state below is
   shown only while `entries` is genuinely empty — add entries through the CMS
   and the index replaces it. */

export type WikiCategory = 'character' | 'place' | 'term' | 'lore';

export type WikiEntry = {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  summary: string;
  /** Plain text is auto-paragraphed; HTML is passed through if you write it. */
  body: string;
  image: string;
  published: boolean;
};

export type WikiContent = {
  categories: { id: WikiCategory; label: string }[];
  empty: { title: string; body: string; cta: string; ctaHref: string };
  entries: WikiEntry[];
};

export const wiki: WikiContent = {
  categories: [
    { id: 'character', label: 'Characters' },
    { id: 'place',     label: 'Places' },
    { id: 'term',      label: 'Terms' },
    { id: 'lore',      label: 'Lore' },
  ],
  empty: {
    title: 'Nothing written yet',
    body: 'The wiki is real and it is empty. Characters, places, and lore go here once the creator writes them — an empty shelf is honest, an invented one isn’t.',
    cta: 'See the cast instead',
    ctaHref: '/cast',
  },
  entries: [],
};
