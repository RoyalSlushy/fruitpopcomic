import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin, badOrigin, readJson, auditJson } from '../../../../lib/cms-auth.ts';
import { isSectionKey, mergeSection, SECTION_KEYS, type SectionKey } from '../../../../lib/cms.ts';
import { upsertSection } from '../../../../lib/supabase.ts';

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
       return a flat string. */
    console.error('[cms] save failed', e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  /* The read path tags its fetch with 'cms', so this is what makes a save
     visible to the next render. */
  revalidateTag('cms', 'max');
  return NextResponse.json({ ok: true, saved: rows.map((r) => r.key) });
}
