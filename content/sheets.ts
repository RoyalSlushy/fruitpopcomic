/* Character and art sheets.

   `name` is deliberately optional and deliberately empty. Only one name is
   known from the drafts (Ronnie) and it is not tied to a specific design, so
   these are described rather than named. Leave it blank unless the name is
   genuinely known — an honest description beats an invented identity.

   `figures` is how many people the sheet shows; it sums into the Cast counter
   in the top strip, so the number on screen is always counted, never claimed. */

export type Sheet = {
  id: string;
  kind: 'cast' | 'art';
  image: string;
  figures: number;
  description: string;
  name: string;
};

export type SheetsContent = { items: Sheet[] };

export const sheets: SheetsContent = {
  items: [
    {
      id: 's01', kind: 'cast', figures: 2, name: '',
      image: '/characters/penup_20250418_074701.jpg',
      description: 'Two characters — gold hoodie and green headband; green turtleneck and glasses',
    },
    {
      id: 's02', kind: 'cast', figures: 1, name: '',
      image: '/characters/penup_20250527_133813.jpg',
      description: 'Cropped denim jacket, bantu knots, teal sneakers',
    },
    {
      id: 's03', kind: 'cast', figures: 1, name: '',
      image: '/characters/penup_20250527_143006-1-1.jpg',
      description: 'Pointed ears, rust beret, marigold sweater',
    },
    {
      id: 's04', kind: 'cast', figures: 1, name: '',
      image: '/characters/penup_20250527_150240.jpg',
      description: 'Long blonde hair, school uniform, closed umbrella',
    },
    {
      id: 's05', kind: 'art', figures: 0, name: '',
      image: '/characters/penup_20251219_145410.jpg',
      description: 'Sketch page — poses and expression studies',
    },
  ],
};
