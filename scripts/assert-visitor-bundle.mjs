/* Two invariants that regress silently on an innocent-looking import, so they
 * are asserted in the build rather than trusted to review:
 *
 *   1. No script referenced by a prerendered page contains the admin editor.
 *      The whole dynamic({ssr:false}) split exists so a visitor never downloads
 *      it, and one static import from a shared module would undo that with no
 *      visible symptom.
 *   2. No client chunk contains a service-role key or its env var name.
 *
 * The eager set is derived from the prerendered HTML rather than from a build
 * manifest, because that is literally what a visitor's browser fetches and it
 * does not depend on which bundler or manifest format Next is using.
 *
 * Run after `next build`. Exits non-zero on violation.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NEXT = '.next';
const ADMIN_MARKER = 'fp-cms-admin-chunk';        // literal in components/cms/AdminRoot.tsx
const SECRET_MARKERS = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role'];

let failed = false;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failed = true; };

const walk = (dir, ext, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
};

/* ── the pages a visitor can land on ── */

const htmlFiles = walk(join(NEXT, 'server', 'app'), '.html');
if (htmlFiles.length === 0) {
  console.error(`✗ no prerendered HTML under ${NEXT}/server/app — run \`next build\` first.`);
  process.exit(1);
}

/* every /_next/static/**.js the prerendered HTML pulls in */
const eager = new Set();
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/["'(]\/_next\/(static\/[^"')]+?\.js)["')]/g)) {
    eager.add(m[1]);
  }
  /* inlined admin code would be just as bad as a referenced chunk */
  if (html.includes(ADMIN_MARKER)) fail(`admin editor inlined into prerendered HTML: ${f}`);
}

for (const rel of eager) {
  const p = join(NEXT, rel);
  if (!existsSync(p)) continue;
  if (readFileSync(p, 'utf8').includes(ADMIN_MARKER)) {
    fail(`admin editor found in an eagerly-loaded chunk: ${rel}`);
  }
}

/* ── the marker must exist somewhere, or the check is vacuous ── */

const allChunks = walk(join(NEXT, 'static'), '.js');
const markerChunks = allChunks.filter((p) => readFileSync(p, 'utf8').includes(ADMIN_MARKER));
if (markerChunks.length === 0) {
  fail(`the marker "${ADMIN_MARKER}" is in no chunk at all — this check is not testing anything`);
}

/* ── no service-role key in anything the browser receives ── */

for (const p of allChunks) {
  const body = readFileSync(p, 'utf8');
  for (const m of SECRET_MARKERS) {
    if (body.includes(m)) fail(`"${m}" appears in a client chunk: ${p}`);
  }
}

console.log(
  failed
    ? '\n✗ visitor bundle assertions FAILED'
    : `✓ visitor bundle clean — ${htmlFiles.length} prerendered pages reference ` +
      `${eager.size} scripts, none containing the editor; editor isolated to ` +
      `${markerChunks.length} async chunk(s); ${allChunks.length} client chunks free of ` +
      'service-role strings',
);

process.exit(failed ? 1 : 0);
