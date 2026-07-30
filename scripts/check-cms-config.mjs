/* Warn — never fail — when the editor's secrets are missing at build time.
 *
 * Deliberately not an assertion. The build has to succeed without them: that is
 * how a fork, a CI checkout, and a preview of a docs-only change all work, and
 * lib/cms-auth.ts reads them per-request precisely so their absence cannot break
 * `next build`.
 *
 * But a silent build followed by "The CMS is not configured on this deployment"
 * at the sign-in box puts the discovery in the worst possible place. Vercel
 * exposes project env vars to the build, so a line here lands in the build log,
 * where whoever just deployed is already looking.
 *
 * Names and thresholds only — never a value or a real length.
 */

const MIN_PASSWORD = 6;
const MIN_SECRET = 32;

const problems = [];
const check = (name, min) => {
  const v = process.env[name];
  if (typeof v !== 'string' || v.length === 0) problems.push(`${name} is not set`);
  else if (v.length < min) problems.push(`${name} is shorter than ${min} characters`);
};

check('CMS_ADMIN_PASSWORD', MIN_PASSWORD);
check('CMS_SESSION_SECRET', MIN_SECRET);

/* Storing is configured separately from signing in, and its failure is the
   later, more confusing one: the editor opens, edits work, and only Save
   fails. Reported apart from the sign-in problems because the consequence is
   different — and because this is the line that answers "did the variable I
   just set actually reach this deployment?" without opening a function log. */
const writeProblems = [];
if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  writeProblems.push('SUPABASE_URL is not set (NEXT_PUBLIC_SUPABASE_URL is the fallback)');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  writeProblems.push('SUPABASE_SERVICE_ROLE_KEY is not set');
}

if (problems.length === 0) {
  console.log('✓ CMS secrets present — the editor will accept a sign-in');
} else {
  console.warn('');
  console.warn('⚠ CMS NOT CONFIGURED — the site will build and serve, but the');
  console.warn('  editor cannot be signed into. Every CMS endpoint returns 503.');
  for (const p of problems) console.warn(`    · ${p}`);
  console.warn('');
  console.warn('  Set these in Vercel → Settings → Environment Variables, then');
  console.warn('  REDEPLOY — server env is read at runtime by the deployment that');
  console.warn('  was built, so editing a variable alone changes nothing.');
  console.warn('  Generate a secret with:');
  console.warn('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.warn('');
}

if (writeProblems.length === 0) {
  console.log('✓ Supabase write credentials present — the editor will be able to save');
} else {
  console.warn('');
  console.warn('⚠ SAVING NOT CONFIGURED — the site will build, serve and sign in,');
  console.warn('  but pressing Save will fail. Only the service-role key can write.');
  for (const p of writeProblems) console.warn(`    · ${p}`);
  console.warn('');
  console.warn('  If you just set this in Vercel and still see it here, the variable');
  console.warn('  did not reach this build: check it is enabled for THIS environment');
  console.warn('  (Production / Preview are separate) and REDEPLOY.');
  console.warn('');
  console.warn('  It must be the service_role key — an anon or sb_publishable_ key');
  console.warn('  is refused by row level security, since site_content has no write');
  console.warn('  policy. Never give it a NEXT_PUBLIC_ name.');
  console.warn('');
}
