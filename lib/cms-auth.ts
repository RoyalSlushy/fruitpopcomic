import 'server-only';

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { problemsIn, MIN_PASSWORD, MIN_SECRET } from './cms-config.ts';

/* Session auth for the editor.
 *
 * The credential is currently a single shared password. The MECHANISM is real —
 * server-verified, env-sourced, timing-safe, signed httpOnly cookie, fails
 * closed — but a shared password is still a shared password: no per-user
 * identity, no audit trail, and no revocation short of rotating the secret.
 * Swapping to real accounts touches only app/api/cms/login/route.ts.
 */

export const SESSION_COOKIE = 'fp_cms';
/** Readable, carries no secret. Only tells the client whether to load the editor. */
export const UI_COOKIE = 'fp_cms_ui';

const TTL_S = 60 * 60 * 12;
const VERSION = 'v1';

export type Secrets = { password: string; secret: string };

/**
 * FAIL CLOSED. No default, no `?? 'changeme'`, no dev bypass.
 *
 * Read per-request rather than at module scope: a module-scope throw would
 * break `next build` in any environment where the secrets are deliberately
 * absent. A too-short signing secret counts as unconfigured — a short HMAC key
 * is a forgeable session, which is worse than no login at all.
 */
export function secrets(): Secrets | null {
  const password = process.env.CMS_ADMIN_PASSWORD;
  const secret = process.env.CMS_SESSION_SECRET;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return null;
  if (typeof secret !== 'string' || secret.length < MIN_SECRET) return null;
  return { password, secret };
}

/** Why secrets() said no, in words. See lib/cms-config.ts. */
export function configProblems(): string[] {
  return problemsIn(process.env);
}

/**
 * timingSafeEqual throws on a length mismatch, so hash both sides to a fixed
 * 32 bytes first. That also stops the submitted length from selecting a
 * cheaper failure branch than a wrong-bytes comparison.
 */
export function equalSecret(a: string, b: string, pepper: string): boolean {
  const h = (s: string) => createHmac('sha256', pepper).update(s, 'utf8').digest();
  return timingSafeEqual(h(a), h(b));
}

export function issue(secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const body = `${VERSION}.${now}.${now + TTL_S}.${randomBytes(9).toString('base64url')}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function verifyToken(token: string | undefined, secret: string): boolean {
  if (!token || token.length > 512) return false;
  const i = token.lastIndexOf('.');
  if (i <= 0) return false;

  const body = token.slice(0, i);
  let given: Buffer;
  try {
    given = Buffer.from(token.slice(i + 1), 'base64url');
  } catch {
    return false;
  }
  /* Length is checked before timingSafeEqual, which would otherwise throw. */
  if (given.length !== 32) return false;
  if (!timingSafeEqual(given, createHmac('sha256', secret).update(body).digest())) return false;

  const [v, iat, exp] = body.split('.');
  if (v !== VERSION) return false;
  const now = Math.floor(Date.now() / 1000);
  const iatN = Number(iat);
  const expN = Number(exp);
  return Number.isFinite(iatN) && Number.isFinite(expN) && iatN <= now + 60 && now < expN;
}

export type Guard = { ok: true } | { ok: false; status: 401 | 503 };

export async function requireAdmin(): Promise<Guard> {
  const s = secrets();
  if (!s) return { ok: false, status: 503 };          // ← fail closed
  const jar = await cookies();
  return verifyToken(jar.get(SESSION_COOKIE)?.value, s.secret)
    ? { ok: true }
    : { ok: false, status: 401 };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',       // localhost is http
  sameSite: 'strict' as const,
  path: '/',
  maxAge: TTL_S,
};

/** Belt and braces with SameSite=Strict. A same-origin fetch may omit Origin. */
export function badOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true;
  }
}

export function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/* ── metered body reader ────────────────────────────────────
   content-length is client-controlled, so the stream is counted as it
   arrives rather than trusted up front. */

export type Read =
  | { kind: 'ok'; value: unknown }
  | { kind: 'bad' }
  | { kind: 'too-large' };

export async function readJson(req: Request, cap: number): Promise<Read> {
  const declared = Number(req.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > cap) return { kind: 'too-large' };

  const reader = req.body?.getReader();
  if (!reader) return { kind: 'bad' };

  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > cap) {
      await reader.cancel();
      return { kind: 'too-large' };
    }
    chunks.push(value);
  }

  const buf = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    buf.set(c, o);
    o += c.byteLength;
  }
  try {
    return { kind: 'ok', value: JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { kind: 'bad' };
  }
}

/** Bound the shape of a submitted section before it reaches the merge. */
export function auditJson(
  v: unknown,
  lim = { nodes: 5000, depth: 12, str: 20000 },
): { ok: true } | { ok: false; reason: string } {
  let nodes = 0;
  const walk = (x: unknown, d: number): string | null => {
    if (++nodes > lim.nodes) return 'too many nodes';
    if (d > lim.depth) return 'too deep';
    if (typeof x === 'string') return x.length > lim.str ? 'string too long' : null;
    if (x === null || typeof x === 'number' || typeof x === 'boolean') return null;
    if (Array.isArray(x)) {
      for (const i of x) {
        const e = walk(i, d + 1);
        if (e) return e;
      }
      return null;
    }
    if (typeof x === 'object') {
      /* JSON.parse creates __proto__ as a real own property, so Object.keys
         sees it. The merge skips reserved keys too; this is defence in depth. */
      for (const k of Object.keys(x as object)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return 'reserved key';
        const e = walk((x as Record<string, unknown>)[k], d + 1);
        if (e) return e;
      }
      return null;
    }
    return 'unsupported value';
  };
  const reason = walk(v, 0);
  return reason ? { ok: false, reason } : { ok: true };
}
