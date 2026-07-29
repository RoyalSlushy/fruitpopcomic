import { NextResponse } from 'next/server';
import {
  secrets, configProblems, equalSecret, issue, cookieOptions, badOrigin, readJson,
  SESSION_COOKIE, UI_COOKIE,
} from '../../../../lib/cms-auth.ts';

export const runtime = 'nodejs';          // node:crypto.timingSafeEqual is not on edge
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = secrets();
  /* No credential configured means no way in. This is the fail-closed branch:
     there is deliberately no fallback password anywhere in the source. */
  if (!s) {
    /* Which variable, and why. Saying only "not configured" left the one
       person who can fix it guessing between four states, one of which
       (a secret pasted too short) looks correct in the dashboard.

       Safe to return unauthenticated: it names variables and the published
       length rules, never a value, and it can only ever be reached in a state
       where signing in is impossible for everyone. */
    const problems = configProblems();
    console.error(`[cms] login refused — ${problems.join('; ')}`);
    return NextResponse.json({
      error: `The CMS is not configured on this deployment: ${problems.join('; ')}.`,
      problems,
    }, { status: 503 });
  }
  if (badOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });

  const body = await readJson(req, 4 * 1024);
  if (body.kind !== 'ok') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const submitted = (body.value as { password?: unknown })?.password;
  if (typeof submitted !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!equalSecret(submitted.slice(0, 512), s.password, s.secret)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, issue(s.secret), cookieOptions);
  /* Readable marker so the client knows to load the editor without the layout
     ever calling cookies() — which would make every route dynamic. */
  res.cookies.set(UI_COOKIE, '1', { ...cookieOptions, httpOnly: false });
  return res;
}
