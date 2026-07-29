import 'server-only';

/* Supabase over plain REST. No SDK — PostgREST is a handful of headers, and
 * skipping the client keeps the dependency surface at React and Next.
 *
 * Everything in this file is server-only. `server-only` above makes importing
 * it from a client component a build error, which is the guardrail that stops
 * the service-role key from ever reaching a browser bundle.
 */

const TABLE = 'site_content';

/* Server-side reads prefer SUPABASE_URL. NEXT_PUBLIC_ vars are inlined into the
   bundle at BUILD time, so relying on the public one here would mean the host
   could not be changed without a rebuild — and a staging deploy pointed at the
   wrong database would be invisible until it wrote there. */
const url = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = () => process.env.SUPABASE_ANON_KEY ?? '';
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const STORAGE_BUCKET = 'fruitpop';

export type StoredSections = Record<string, unknown>;

/**
 * Every stored override, keyed by section.
 *
 * Reads use the anon key: `site_content` grants public SELECT and has no write
 * policies at all, so this connection is structurally incapable of writing.
 *
 * Throws on failure — getSection() catches and falls back to code defaults.
 */
export async function readStoredSections(): Promise<StoredSections> {
  if (!url() || !anonKey()) return {};

  const res = await fetch(`${url()}/rest/v1/${TABLE}?select=key,value`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${anonKey()}`,
    },
    /* Content is edited rarely and read constantly. The save endpoint calls
       revalidateTag, so this stays fresh without polling the database. */
    next: { tags: ['cms'], revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`${res.status} reading ${TABLE}: ${(await res.text()).slice(0, 200)}`);
  }

  const rows = (await res.json()) as { key: string; value: unknown }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/* ── writes: service role, never reachable from the browser ── */

function requireServiceKey(): { url: string; key: string } {
  const u = url();
  const k = serviceKey();
  /* No fallback. A missing key must fail closed rather than quietly
     attempting an anon write that RLS would reject with a confusing error. */
  if (!u || !k) throw new Error('Supabase service credentials are not configured.');
  return { url: u, key: k };
}

export async function upsertSection(key: string, value: unknown): Promise<void> {
  const { url: u, key: sk } = requireServiceKey();

  const res = await fetch(`${u}/rest/v1/${TABLE}?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: sk,
      Authorization: `Bearer ${sk}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
  });

  if (!res.ok) {
    throw new Error(`${res.status} writing ${key}: ${(await res.text()).slice(0, 200)}`);
  }
}

export async function uploadObject(
  objectKey: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const { url: u, key: sk } = requireServiceKey();

  const res = await fetch(
    `${u}/storage/v1/object/${STORAGE_BUCKET}/${encodeURI(objectKey)}`,
    {
      method: 'POST',
      headers: {
        apikey: sk,
        Authorization: `Bearer ${sk}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body,
    },
  );

  if (!res.ok) {
    throw new Error(`${res.status} uploading: ${(await res.text()).slice(0, 200)}`);
  }
  return objectKey;
}
