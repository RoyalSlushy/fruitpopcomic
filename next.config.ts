import type { NextConfig } from 'next';

/* Where uploaded media is served from.
 *
 * `mediaURL()` runs IN THE BROWSER, so it can only read a NEXT_PUBLIC_ name.
 * Setting only SUPABASE_URL used to be a silent trap: the editor signed in,
 * saved and uploaded — all server-side, all using SUPABASE_URL — and then
 * every uploaded image and every recording resolved to a bare object key,
 * which a browser reads as a path relative to the current page. Images showed
 * as broken; recordings 404'd and fell back to the synthesiser, so read-aloud
 * looked like it was ignoring the upload rather than failing to fetch it.
 *
 * One is now the other's default, resolved here at build time, so the two
 * variables cannot disagree about where storage lives. */
const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

const supabaseHost = (() => {
  try {
    return storageBase ? new URL(storageBase).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* Inlined into the client bundle, so lib/media.ts can build a storage URL
     whichever of the two variables the deployment happens to set. */
  env: { NEXT_PUBLIC_SUPABASE_URL: storageBase },
  /* The static site kept its editor at /admin/. That directory is gone — the
     editor is now a mode of the site itself — so send old links to it. */
  async redirects() {
    return [{ source: '/admin', destination: '/#cms', permanent: false },
            { source: '/admin/:path*', destination: '/#cms', permanent: false }];
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
};

export default nextConfig;
