/* The About page, as blocks rather than one HTML blob so each paragraph is
   separately editable in place. */

export type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string };

export type AboutContent = {
  reader: { notice: string };
  cast: { notice: string };
  blocks: Block[];
};

export const about: AboutContent = {
  reader: {
    notice: 'These are rough drafts. Working pencils, not finished pages — no final linework, colour or lettering. Order is provisional.',
  },
  cast: {
    notice: 'Names not recorded yet. Only one is known from the drafts — Ronnie. The rest are described, not named, until the creator says otherwise.',
  },
  blocks: [
    { kind: 'h2', text: 'Fruit Pop Comic' },
    { kind: 'p',  text: 'A webcomic, and the hub for everything around it — the pages themselves, the cast, and the world they live in, all in one place instead of scattered across platforms.' },

    { kind: 'h3', text: "What's real here, and what isn't" },
    { kind: 'p',  text: "Everything on this site is the creator's own work. The logo and the character art are finished. The comic pages are rough drafts — working pencils in a single colour, shown to establish page format and panel grammar, not final art. The wiki is genuinely empty." },
    { kind: 'p',  text: "Nothing has been invented to fill space: no page counts, no release dates, no reader numbers, no character names beyond the one the drafts actually give. The dashboard's Build status panel is the whole of it — where a portal would put a daily mission, this one puts what is and isn't finished." },

    { kind: 'h3', text: 'Reading it' },
    { kind: 'p',  text: 'Pages are 1080 × 1620 — a 2:3 portrait that fills a phone screen almost exactly. Use the arrows, the filmstrip, or the arrow keys.' },

    { kind: 'h3', text: 'A note on access' },
    { kind: 'p',  text: "Dialogue is hand-lettered into the artwork, so it can't be selected, searched, translated, or read by a screen reader. Transcripts would fix that and would have to be written by hand. It's an open decision, flagged rather than quietly skipped." },
  ],
};
