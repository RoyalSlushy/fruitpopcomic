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
  if (!base) return path;
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** Zero-padded 1-based label for a list index: 0 -> "01". */
export const pad = (i: number): string => String(i + 1).padStart(2, '0');
