/* Say, in the build log, whether this deployment can read aloud.
 *
 * Never a failure. An unset KOKORO_URL is a supported state, not a mistake:
 * the site builds, serves, and simply offers no Listen button — /api/tts
 * answers its readiness probe with a 503 and every read-aloud control renders
 * nothing rather than failing when pressed.
 *
 * But "the Listen buttons have disappeared" is a bad thing to discover from a
 * visitor, and Vercel exposes project env to the build, so the answer belongs
 * where whoever just deployed is already looking.
 *
 * Names only — never a value, and never the token's length.
 */

const url = process.env.KOKORO_URL;

if (!url) {
  console.warn('');
  console.warn('⚠ READ-ALOUD IS OFF — KOKORO_URL is not set, so no Listen button');
  console.warn('  will appear anywhere on this deployment. The site is otherwise');
  console.warn('  unaffected: this is a supported state, not a broken build.');
  console.warn('');
  console.warn('  To turn it on, run the engine (services/kokoro — see docs/tts.md)');
  console.warn('  and set KOKORO_URL to where it listens, then REDEPLOY. Server env');
  console.warn('  is read at runtime by the deployment that was built.');
  console.warn('');
} else {
  let host = 'an unparseable URL';
  let secure = false;
  try {
    const parsed = new URL(url);
    host = parsed.host;
    secure = parsed.protocol === 'https:' || parsed.hostname === '127.0.0.1'
      || parsed.hostname === 'localhost';
  } catch { /* reported below as the host we could not read */ }

  console.log(`✓ Read-aloud configured — voice engine at ${host}`);

  /* The text of a page is not a secret, but the hop is between a public
     function and a box that will speak whatever it is sent, so it should not
     be in the clear and it should not be anonymous. */
  if (!secure) {
    console.warn('  ⚠ KOKORO_URL is plain http to a remote host. Use https, or keep');
    console.warn('    the engine on a private network.');
  }
  if (!process.env.KOKORO_TOKEN) {
    console.warn('  ⚠ KOKORO_TOKEN is not set. Fine on a private network; set it if');
    console.warn('    that host is reachable from anywhere else.');
  }
}
