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
