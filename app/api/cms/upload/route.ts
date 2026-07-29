import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireAdmin, badOrigin } from '../../../../lib/cms-auth.ts';
import { uploadObject } from '../../../../lib/supabase.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD = 8 * 1024 * 1024;

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...Array.from(b.subarray(o, o + n)));

/* Sniffed from the bytes. `file.type` is a claim, not evidence.
   SVG is deliberately absent: it is script-bearing XML served from the site's
   own origin, so an <svg onload> upload would be stored XSS against the admin
   session. There is no safe SVG without a full sanitiser, so there is none. */
const SNIFF: [mime: string, test: (b: Uint8Array) => boolean, ext: string][] = [
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, 'jpg'],
  ['image/png', (b) => ascii(b, 0, 8) === '\x89PNG\r\n\x1a\n', 'png'],
  ['image/webp', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP', 'webp'],
  ['image/gif', (b) => ascii(b, 0, 4) === 'GIF8', 'gif'],
  ['image/avif', (b) => ascii(b, 4, 4) === 'ftyp' && ascii(b, 8, 4) === 'avif', 'avif'],
];

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 503 ? 'The CMS is not configured.' : 'Not signed in.' },
      { status: auth.status });
  }
  if (badOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });

  const declared = Number(req.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > MAX_UPLOAD + 8192) {
    return NextResponse.json({ error: 'Too large' }, { status: 413 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_UPLOAD) {
    return NextResponse.json({ error: 'Too large' }, { status: 413 });
  }

  const folder = String(form.get('folder') ?? 'uploads')
    .replace(/[^a-z0-9-]/gi, '')
    .slice(0, 24) || 'uploads';

  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.byteLength > MAX_UPLOAD) return NextResponse.json({ error: 'Too large' }, { status: 413 });

  const hit = SNIFF.find(([, test]) => test(buf));
  if (!hit) return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
  const [mime, , ext] = hit;
  if (file.type && file.type !== mime) {
    return NextResponse.json({ error: 'Declared type does not match the bytes' }, { status: 415 });
  }

  /* The client filename is DISCARDED ENTIRELY and the extension comes from the
     sniff. "../../x", ".jpg.svg", NUL bytes, RTL overrides and 300-character
     unicode names are structurally impossible rather than filtered out — and
     collisions cannot happen either. */
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}-${randomBytes(8).toString('hex')}.${ext}`;

  try {
    await uploadObject(key, buf.buffer as ArrayBuffer, mime);
  } catch (e) {
    console.error('[cms] upload failed', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: key });
}
