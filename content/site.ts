/* Shell chrome: the channel rail, the promo card, the footer.
   Edited in place through the CMS; the database only stores overrides. */

export type NavItem = {
  id: string;
  label: string;
  sub: string;
  href: string;
  /** shown in the mobile bottom bar */
  tab: boolean;
};

export type SiteContent = {
  title: string;
  nav: NavItem[];
  promo: { title: string; body: string; cta: string; ctaHref: string };
  footer: { copyright: string; build: string };
};

export const site: SiteContent = {
  title: 'Fruit Pop Comic',
  nav: [
    { id: 'home',  label: 'Home',  sub: 'Dashboard',           href: '/',      tab: true  },
    { id: 'read',  label: 'Read',  sub: 'Start from page one', href: '/read',  tab: true  },
    { id: 'cast',  label: 'Cast',  sub: "Who's who",           href: '/cast',  tab: true  },
    { id: 'wiki',  label: 'Wiki',  sub: 'The world',           href: '/wiki',  tab: true  },
    { id: 'art',   label: 'Art',   sub: 'Extras',              href: '/art',   tab: true  },
    { id: 'about', label: 'About', sub: 'The project',         href: '/about', tab: false },
  ],
  promo: {
    title: 'Draft build',
    body: 'The pages here are working roughs — pencils, not finished art. The wiki is genuinely empty.',
    cta: "What's real",
    ctaHref: '/about',
  },
  footer: {
    copyright: 'Art and characters © the creator of Fruit Pop Comic.',
    build: 'Draft build · pages are working roughs',
  },
};
