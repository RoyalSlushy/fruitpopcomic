/* Image path convention, shared by the content modules and the database:
 *
 *   https://…   absolute, used as-is
 *   /…          a file committed to public/
 *   anything else → an object key in the public Supabase storage bucket,
 *                   which is what the CMS writes when you upload
 *
 * Safe on the client: it reads only NEXT_PUBLIC_ env. */

export const STORAGE_BUCKET = 'fruitpop';

export function mediaURL(path: string): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('/')) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!base) {
    /* Nothing correct can be returned here — the object key alone is not a
       URL. Returning it used to produce a PAGE-RELATIVE link that 404s
       differently on every route, which is how a whole deployment's uploaded
       images and recordings failed while every configuration check passed.
       next.config.ts now defaults this from SUPABASE_URL so it should be
       unreachable; if it ever fires again, say so where someone will see it. */
    if (typeof console !== 'undefined') {
      console.error(
        '[media] NEXT_PUBLIC_SUPABASE_URL is unset, so uploaded media cannot be '
        + `addressed. "${path}" will not load. Set it (or SUPABASE_URL) and redeploy.`,
      );
    }
    return '';
  }
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** Zero-padded 1-based label for a list index: 0 -> "01". */
export const pad = (i: number): string => String(i + 1).padStart(2, '0');
