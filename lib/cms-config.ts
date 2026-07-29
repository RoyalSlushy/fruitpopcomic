/* The editor's configuration rules, kept free of any Next import so they can be
   read by the runtime guard, by tests, and by anything else that needs them.
   lib/cms-auth.ts is the server-only half and cannot be imported outside a
   request. */

export const MIN_PASSWORD = 6;
export const MIN_SECRET = 32;

export type Env = Record<string, string | undefined>;

/**
 * Why the editor will refuse a sign-in, in words.
 *
 * "Not configured" alone cannot tell an unset variable from a too-short one,
 * and a secret pasted at 24 characters looks perfectly configured from a
 * dashboard. Names and published thresholds only — never a value, a prefix, or
 * a real length. An empty array means the configuration is good.
 */
export function problemsIn(env: Env): string[] {
  const out: string[] = [];

  const check = (name: string, min: number) => {
    const v = env[name];
    if (typeof v !== 'string' || v.length === 0) out.push(`${name} is not set`);
    else if (v.length < min) out.push(`${name} is shorter than ${min} characters`);
  };

  check('CMS_ADMIN_PASSWORD', MIN_PASSWORD);
  check('CMS_SESSION_SECRET', MIN_SECRET);

  return out;
}

/**
 * Why a SAVE will fail, in words.
 *
 * Reading and writing are configured separately, and only the write side needs
 * the service-role key. A deployment with just the read variables renders
 * perfectly, signs in perfectly, and then fails the moment someone presses
 * Save — the worst possible place to discover it, and the one the flat "Save
 * failed" string could never explain.
 *
 * Names and nothing else. The service-role key bypasses RLS, so no part of it —
 * length included — may travel back to a client.
 */
export function writeProblemsIn(env: Env): string[] {
  const out: string[] = [];

  /* Mirrors lib/supabase.ts: SUPABASE_URL wins, the public one is the fallback,
     so only having neither is a problem. */
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof url !== 'string' || url.length === 0) {
    out.push('SUPABASE_URL is not set');
  }

  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    out.push('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return out;
}
