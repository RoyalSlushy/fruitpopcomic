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
