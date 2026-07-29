import type { NextConfig } from 'next';

/* The Supabase host is only needed for images uploaded through the CMS.
   Everything shipped in the repo lives under /public and needs no allowlist. */
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
