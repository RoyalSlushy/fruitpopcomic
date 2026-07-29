/* ═══════════════════════════════════════════════════════════
   Connection settings. This is the only file you edit to point
   the site at a different Supabase project.

   The key below is the *publishable* (anon) key. It is safe in
   public source — it grants exactly what row level security
   allows, which here is: read published content, nothing else.
   Never put a service-role key in this file.
   ═══════════════════════════════════════════════════════════ */

export const SUPABASE_URL = 'https://rdmxtosklpvwtggakbja.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_1YgAP15sl0aGaywTFJnXkQ_XrAKsBZ6';

/* Content lives in its own Postgres schema rather than `public`.
   PostgREST will not serve it until `fruitpop` is added under
   Settings → API → Exposed schemas. See docs/cms.md. */
export const SUPABASE_SCHEMA = 'fruitpop';

/* Public storage bucket holding uploaded images. */
export const SUPABASE_BUCKET = 'fruitpop';

/* Set false to ignore Supabase entirely and render the content
   bundled in data.js — useful offline, or to check the fallback. */
export const USE_REMOTE = true;
