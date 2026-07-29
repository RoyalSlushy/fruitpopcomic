import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSection } from '../lib/cms-server.ts';
import { CmsProvider } from '../lib/cms-context.tsx';
import { Shell } from '../components/site/Shell.tsx';
import { Starfield } from '../components/site/Starfield.tsx';
import { AdminGate } from '../components/cms/AdminGate.tsx';

export const metadata: Metadata = {
  title: 'Fruit Pop Comic',
  description: 'Fruit Pop Comic — read the comic, meet the cast, and dig into the world.',
  icons: { icon: '/logo/monogram.png' },
};

export const viewport: Viewport = {
  themeColor: '#0C1326',
  viewportFit: 'cover',        // the tab bar pads with env(safe-area-inset-bottom)
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, pages, sheets] = await Promise.all([
    getSection('site'),
    getSection('pages'),
    getSection('sheets'),
  ]);

  /* Counted, not claimed. */
  const counts = {
    pages: pages.items.length,
    cast: sheets.items
      .filter((s) => s.kind === 'cast')
      .reduce((a, s) => a + (s.figures || 0), 0),
  };

  return (
    <html lang="en">
      {/* Shuttleblock. The kit is domain-locked: every domain that serves this
          page must be listed in the Adobe Fonts web project, localhost and any
          Vercel preview alias included, or the request 403s and the site falls
          back to system sans. */}
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/bcx0xsy.css" />
      </head>
      <body>
        <Starfield />
        <div className="nebula" aria-hidden="true" />
        <a className="skip" href="#main">Skip to content</a>

        <CmsProvider>
          <Shell site={site} counts={counts}>{children}</Shell>
          <AdminGate />
        </CmsProvider>
      </body>
    </html>
  );
}
