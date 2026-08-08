import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireAdmin, badOrigin } from '../../../../lib/cms-auth.ts';
import { uploadObject, serviceProblems, SupabaseWriteError } from '../../../../lib/supabase.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 4 MB, not 8. A serverless request body is capped near 4.5 MB by the platform,
   so an 8 MB limit here was unreachable: a file between the two died upstream
   with nothing from us at all. Refusing at 4 MB is a limit that can actually
   speak. A per-line recording is seconds long and nowhere near it. */
const MAX_UPLOAD = 4 * 1024 * 1024;

const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...Array.from(b.subarray(o, o + n)));

/* Sniffed from the bytes. `file.type` is a claim, not evidence.
   SVG is deliberately absent: it is script-bearing XML served from the site's
   own origin, so an <svg onload> upload would be stored XSS against the admin
   session. There is no safe SVG without a full sanitiser, so there is none.

   Audio containers carry no script and are served from the storage domain
   rather than this origin, so they raise none of what keeps SVG out. The set
   is still kept narrow and sniffed, on the same principle: what the browser
   declares is a claim.

   `also` exists because a declared type is not one string. Browsers report m4a
   as audio/x-m4a OR audio/mp4, wav as audio/wav OR audio/x-wav OR audio/wave,
   and ogg as audio/ogg OR video/ogg. Comparing against `mime` alone would 415
   perfectly good files. */
type Sniff = { mime: string; test: (b: Uint8Array) => boolean; ext: string; also: string[] };

const SNIFF: Sniff[] = [
  { mime: 'image/jpeg', ext: 'jpg', also: [],
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', also: [],
    test: (b) => ascii(b, 0, 8) === '\x89PNG\r\n\x1a\n' },
  { mime: 'image/webp', ext: 'webp', also: [],
    test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP' },
  { mime: 'image/gif', ext: 'gif', also: [],
    test: (b) => ascii(b, 0, 4) === 'GIF8' },
  { mime: 'image/avif', ext: 'avif', also: [],
    test: (b) => ascii(b, 4, 4) === 'ftyp' && ascii(b, 8, 4) === 'avif' },

  /* WAV and WebP are both RIFF; the form type at byte 8 is what separates
     them, and WebP is tested first above regardless. */
  { mime: 'audio/wav', ext: 'wav', also: ['audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
    test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE' },
  { mime: 'audio/ogg', ext: 'ogg', also: ['video/ogg', 'application/ogg'],
    test: (b) => ascii(b, 0, 4) === 'OggS' },
  { mime: 'audio/webm', ext: 'weba', also: ['video/webm'],
    test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  /* Must follow AVIF: both are ISO-BMFF and match "ftyp" at byte 4, so the
     brand at byte 8 is the only thing telling them apart. */
  { mime: 'audio/mp4', ext: 'm4a', also: ['audio/x-m4a', 'audio/m4a'],
    test: (b) => ascii(b, 4, 4) === 'ftyp' && ascii(b, 8, 4) === 'M4A ' },
  /* An ID3 tag, or a bare frame sync: 11 set bits, the rest of the byte being
     version and layer bits that vary between encoders. */
  { mime: 'audio/mpeg', ext: 'mp3', also: ['audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3'],
    test: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0) },
];

const TOO_LARGE = `Too large — the limit is ${MAX_UPLOAD / (1024 * 1024)} MB.`;

const ACCEPTED = 'JPEG, PNG, WebP, GIF or AVIF images, and MP3, M4A, WAV, OGG or WebM audio';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 503 ? 'The CMS is not configured.' : 'Not signed in.' },
      { status: auth.status });
  }
  if (badOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });

  /* Same pair of variables the save path needs — checked before reading a
     multi-megabyte body that has nowhere to go. See app/api/cms/save/route.ts. */
  const unconfigured = serviceProblems();
  if (unconfigured.length) {
    console.error(`[cms] upload refused — ${unconfigured.join('; ')}`);
    return NextResponse.json({
      error: `Uploading is not configured on this deployment: ${unconfigured.join('; ')}.`,
      problems: unconfigured,
    }, { status: 503 });
  }

  const declared = Number(req.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > MAX_UPLOAD + 8192) {
    return NextResponse.json({ error: TOO_LARGE }, { status: 413 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_UPLOAD) {
    return NextResponse.json({ error: TOO_LARGE }, { status: 413 });
  }

  const folder = String(form.get('folder') ?? 'uploads')
    .replace(/[^a-z0-9-]/gi, '')
    .slice(0, 24) || 'uploads';

  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.byteLength > MAX_UPLOAD) return NextResponse.json({ error: TOO_LARGE }, { status: 413 });

  const hit = SNIFF.find((s) => s.test(buf));
  if (!hit) {
    return NextResponse.json({ error: `Unsupported file type. Accepted: ${ACCEPTED}.` },
      { status: 415 });
  }
  const { mime, ext, also } = hit;
  if (file.type && file.type !== mime && !also.includes(file.type)) {
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
    /* Same policy as the save route: log the upstream text, return one of our
       own fixed strings rather than anything Supabase said — its errors echo
       hostnames and bucket names.

       What changed is how many of those fixed strings there are. Everything
       that was not a 401/403 used to collapse to the literal "Upload failed",
       and that cost a real debugging session: the bucket's allowed_mime_types
       listed images only, so every recording came back 400 `invalid_mime_type`
       and the editor reported a shrug. The failure was diagnosable from the
       first byte and the message said nothing.

       So the mime rejection gets named. It is the one failure that is a pure
       configuration mismatch — the bucket's allow-list and SNIFF above are two
       halves of one contract, and nothing in code review can catch them
       drifting apart. The upstream text still never leaves the server. */
    console.error('[cms] upload failed', e);
    const err = e instanceof SupabaseWriteError ? e : null;
    const mimeRejected = !!err && err.status === 400 && /mime|content.?type/i.test(err.message);

    let error = 'Upload failed. The exact reason is in the server log.';
    if (err && (err.status === 401 || err.status === 403)) {
      error = 'Upload failed: the storage API rejected the service key. Check '
        + 'SUPABASE_SERVICE_ROLE_KEY holds the service_role key — an anon or '
        + 'publishable key cannot write.';
    } else if (mimeRejected) {
      error = `Upload failed: the storage bucket does not accept ${mime} files. `
        + "Add it to the bucket's allowed MIME types — that list and this "
        + 'route are two halves of one contract.';
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: key });
}
