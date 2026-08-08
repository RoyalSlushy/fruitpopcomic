/* The one way a file gets into the CMS — images, and recordings of script
 * beats.
 *
 * Part of the admin chunk: it is imported only from components/cms/*Impl, so a
 * visitor never downloads it. /api/cms/upload is the only route holding a
 * service-role key, and it discards the client's filename entirely — the
 * extension comes from sniffing the bytes — so nothing here needs to sanitise
 * anything before sending it. Which types are allowed is that route's decision
 * and is made from the bytes, so there is nothing to keep in step here.
 *
 * Returns the storage object key, which is what the draft stores. Rendering it
 * is lib/media.ts's job. */

export async function uploadMedia(file: File, folder: string): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);
  const res = await fetch('/api/cms/upload', { method: 'POST', body });

  /* NOT `await res.json()` unconditionally.
   *
   * The host rejects an oversized request body at the edge, before the route
   * runs at all, and answers with an HTML error page. Parsing that as JSON
   * throws a SyntaxError, and the editor then showed the creator
   * "Unexpected token '<'" — for the one failure whose real cause is the most
   * obvious thing in the world. Whatever the route says about a 413 is
   * invisible from here, because the route never saw the request. */
  const json = await res.json().catch(() => null) as { path?: string; error?: string } | null;

  if (!res.ok || !json?.path) {
    throw new Error(
      json?.error
      || (res.status === 413
        ? 'That file is too large to upload. Recordings should be a line or two, not a whole page.'
        : `Upload failed (HTTP ${res.status}).`),
    );
  }
  return json.path;
}

/** The bucket folder for a CMS path: "pages.items.3.image" → "pages". */
export const folderFor = (path: string): string => path.split('.')[0] ?? 'uploads';
