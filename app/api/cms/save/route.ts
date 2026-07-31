import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, badOrigin, readJson, auditJson } from '../../../../lib/cms-auth.ts';
import { isSectionKey, mergeSection, SECTION_KEYS, type SectionKey } from '../../../../lib/cms.ts';
import { upsertSection, serviceProblems, SupabaseWriteError } from '../../../../lib/supabase.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 512 * 1024;

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 503 ? 'The CMS is not configured.' : 'Not signed in.' },
      { status: auth.status });
  }
  if (badOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });

  /* Signing in only proves the EDITOR is configured; storing needs a separate
     pair of variables. Checked before the merge so a deployment with nowhere to
     write says so up front, naming the variable, instead of doing the work and
     collapsing into a flat 500 at the last step.

     Safe to name: this is behind requireAdmin() above, so unlike the login 503
     it is only ever reachable by someone already signed in — and it carries a
     variable name, never a value or a length. */
  const unconfigured = serviceProblems();
  if (unconfigured.length) {
    console.error(`[cms] save refused — ${unconfigured.join('; ')}`);
    return NextResponse.json({
      error: `Saving is not configured on this deployment: ${unconfigured.join('; ')}.`,
      problems: unconfigured,
    }, { status: 503 });
  }

  const parsed = await readJson(req, MAX_BODY);
  if (parsed.kind === 'too-large') return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  if (parsed.kind !== 'ok' || typeof parsed.value !== 'object' || parsed.value === null) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const sections = (parsed.value as { sections?: unknown }).sections;
  if (typeof sections !== 'object' || sections === null || Array.isArray(sections)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const keys = Object.keys(sections);
  if (keys.length === 0 || keys.length > SECTION_KEYS.length) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const rows: { key: SectionKey; value: unknown }[] = [];
  for (const k of keys) {
    /* Allowlist derived from the code — not a regex, not a length check. */
    if (!isSectionKey(k)) {
      return NextResponse.json({ error: `Unknown section: ${k.slice(0, 32)}` }, { status: 400 });
    }
    const submitted = (sections as Record<string, unknown>)[k];

    const audit = auditJson(submitted);
    if (!audit.ok) {
      return NextResponse.json({ error: `Section ${k}: ${audit.reason}` }, { status: 400 });
    }

    /* Re-run the SAME merge server-side with DEFAULTS as the shape authority,
       and store the OUTPUT rather than the submission. A payload can therefore
       only ever change values the code already declares: it cannot introduce a
       key, turn a container into a scalar, or plant __proto__. */
    rows.push({ key: k, value: mergeSection(k, submitted) });
  }

  try {
    for (const r of rows) await upsertSection(r.key, r.value);
  } catch (e) {
    /* Supabase errors can echo hostnames and constraint names — log them,
       return one of our own fixed strings rather than anything upstream said.

       A 401/403 is worth separating out: it means the key arrived and was
       refused, which is a different fix from every other failure and is
       otherwise indistinguishable from the browser. `site_content` has no write
       policy, so an anon or publishable key pasted into the service-role slot
       lands here rather than being rejected as malformed. */
    console.error('[cms] save failed', e);
    const status = e instanceof SupabaseWriteError ? e.status : 0;
    /* 404 means the request arrived somewhere real and that somewhere has no
       site_content table — which is what a SUPABASE_URL aimed at the wrong
       project looks like, and is otherwise indistinguishable from a refusal. */
    const hint =
      status === 401 || status === 403
        ? 'the database rejected the service key. Check SUPABASE_SERVICE_ROLE_KEY holds the service_role key — an anon or publishable key cannot write.'
        : status === 404
          ? 'no site_content table exists at SUPABASE_URL. Check it points at the right Supabase project.'
          : null;
    return NextResponse.json({
      error: hint ? `Save failed: ${hint}` : 'Save failed',
    }, { status: 500 });
  }

  /* Two calls, and both are load-bearing.
   *
   * revalidateTag('cms', 'max') is STALE-WHILE-REVALIDATE by design: it marks
   * the tag stale and lets the next visitor have the old copy while a fresh one
   * is fetched behind them. Next is explicit that it deliberately does not mark
   * the path revalidated "so that server actions don't pull their own writes" —
   * which is exactly what the editor needs to do. On its own it means the
   * router.refresh() fired one line later on the client reads the copy that was
   * just superseded, and the editor has to reload the page by hand to see their
   * own change.
   *
   * updateTag() is the read-your-own-writes answer, but it throws outside a
   * Server Action and this is a Route Handler. revalidatePath expires
   * immediately, is not deprecated, and is legal here — so it is what actually
   * makes the save visible to the refresh.
   *
   * Scoped to the root layout because a content change is not confined to one
   * route: the rail, the footer and the derived counters are rendered from the
   * same sections on every page. */
  revalidateTag('cms', 'max');
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, saved: rows.map((r) => r.key) });
}
