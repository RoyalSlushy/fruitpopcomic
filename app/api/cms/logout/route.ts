import { NextResponse } from 'next/server';
import { cookieOptions, SESSION_COOKIE, UI_COOKIE } from '../../../../lib/cms-auth.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  res.cookies.set(UI_COOKIE, '', { ...cookieOptions, httpOnly: false, maxAge: 0 });
  return res;
}
