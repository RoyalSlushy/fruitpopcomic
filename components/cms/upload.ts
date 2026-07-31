/* The one way an image gets into the CMS.
 *
 * Part of the admin chunk: it is imported only from components/cms/*Impl, so a
 * visitor never downloads it. /api/cms/upload is the only route holding a
 * service-role key, and it discards the client's filename entirely — the
 * extension comes from sniffing the bytes — so nothing here needs to sanitise
 * anything before sending it.
 *
 * Returns the storage object key, which is what the draft stores. Rendering it
 * is lib/media.ts's job. */

export async function uploadImage(file: File, folder: string): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);
  const res = await fetch('/api/cms/upload', { method: 'POST', body });
  const json = (await res.json()) as { path?: string; error?: string };
  if (!res.ok || !json.path) throw new Error(json.error || `HTTP ${res.status}`);
  return json.path;
}

/** The bucket folder for a CMS path: "pages.items.3.image" → "pages". */
export const folderFor = (path: string): string => path.split('.')[0] ?? 'uploads';
