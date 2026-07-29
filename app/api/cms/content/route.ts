import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/cms-auth.ts';
import { getAllSections } from '../../../../lib/cms-server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* The editor's baseline snapshot. Admin-only, so the full content tree is never
   serialised into a visitor's page. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 503 ? 'The CMS is not configured.' : 'Not signed in.' },
      { status: auth.status });
  }
  return NextResponse.json({ content: await getAllSections() });
}
