import { DEFAULT_VOICE, MAX_TEXT, clampSpeed, isVoice } from '../../../lib/kokoro.ts';

/* The read-aloud endpoint: a thin, cacheable, bounded proxy in front of the
 * Kokoro service.
 *
 * ── WHY A PROXY AND NOT THE MODEL ───────────────────────────
 * Kokoro cannot live in this function. The weights plus an ONNX runtime are
 * larger than a Vercel function is allowed to be, and even where they fit, a
 * cold 82M-parameter graph loaded per invocation is the wrong shape for a page
 * that ten people are listening to at once. One long-lived process holds the
 * model in memory instead; this route is what stands between it and the
 * internet. See docs/tts.md and services/kokoro/.
 *
 * ── WHAT IT ADDS ────────────────────────────────────────────
 *   · Caching. Audio for a given (text, voice, speed) is deterministic, so the
 *     response is immutable and the CDN answers the second listener without
 *     the engine ever hearing about it. On a page everybody reads, that is the
 *     difference between one generation and hundreds.
 *   · A boundary. The engine is never exposed directly: an allow-list on the
 *     voice, a hard cap on the length, and a same-origin check on the POST
 *     form. A public endpoint that runs a model on arbitrary text is somebody
 *     else's free GPU otherwise.
 *   · Failure with words in it. The engine being down, slow, or unconfigured
 *     are three different problems and the player says which.
 *
 * Rate limiting is NOT here, for the reason the CMS gives for not having it
 * either: an in-memory counter on serverless is per-instance and resets on a
 * cold start, so it would be a comforting decoration. The real controls are
 * the caps above, the cache, and a firewall rule on this path.
 */

export const runtime = 'nodejs';

/** Long enough for a 450-character chunk on a busy CPU, short enough to fail. */
const TIMEOUT_MS = 30_000;

const YEAR = 31_536_000;
const DAY = 86_400;

type Engine = { url: string; token: string | null };

function engine(): Engine | null {
  const url = process.env.KOKORO_URL;
  if (!url) return null;
  return { url: url.replace(/\/+$/, ''), token: process.env.KOKORO_TOKEN || null };
}

/* Errors are JSON and never cached: a 502 sitting in the CDN for a day would
   outlive the outage that caused it by a long way. */
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, {
    status,
    headers: { 'cache-control': 'no-store' },
  });

const NOT_CONFIGURED = 'Read-aloud is not configured on this deployment: KOKORO_URL is not set.';

/* Belt and braces with the length cap: a same-origin fetch may omit Origin, so
   only a header that is present AND foreign is refused. Same rule the CMS
   routes use. */
function badOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true;
  }
}

async function synth(text: string, voice: unknown, speed: unknown, cache: boolean) {
  const eng = engine();
  if (!eng) return fail(503, NOT_CONFIGURED, { problems: ['KOKORO_URL is not set'] });

  const t = (text ?? '').trim();
  if (!t) return fail(400, 'Nothing to say.');
  if (t.length > MAX_TEXT) {
    return fail(413, `Text is longer than ${MAX_TEXT} characters. Split it into `
      + 'chunks first — lib/tts-chunk.ts is what the site uses.');
  }

  /* Unknown voices are corrected rather than refused. The id is cosmetic to
     the caller and a stale one — a bookmark from before the list changed —
     should still be readable. */
  const v = isVoice(voice) ? voice : DEFAULT_VOICE;
  const s = clampSpeed(speed);

  let upstream: Response;
  try {
    upstream = await fetch(`${eng.url}/speak`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(eng.token ? { authorization: `Bearer ${eng.token}` } : {}),
      },
      body: JSON.stringify({ text: t, voice: v, speed: s }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    console.error('[tts] engine unreachable', e);
    return timeout
      ? fail(504, 'The voice engine took too long. It may be under load — try again.')
      : fail(502, 'The voice engine did not answer.');
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`[tts] engine returned ${upstream.status}`);
    return fail(502, 'The voice engine refused the request.', { upstream: upstream.status });
  }

  /* The body is piped, not buffered: the engine emits WAV frames as it
     generates them, so the first audio reaches the browser well before the
     last sample exists. Note that `Transfer-Encoding` is deliberately NOT set
     here — a streamed body with no content-length IS chunked, and setting the
     header by hand is a protocol violation that undici rejects outright. The
     runtime owns that one. */
  return new Response(upstream.body, {
    headers: {
      'content-type': 'audio/wav',
      'content-disposition': 'inline',
      'x-content-type-options': 'nosniff',
      /* Deterministic output, so: forever in the shared cache, a day in the
         private one. `immutable` is what stops a browser revalidating audio
         it already has when the same page is read again. */
      'cache-control': cache
        ? `public, max-age=${DAY}, s-maxage=${YEAR}, immutable`
        : 'no-store',
    },
  });
}

/**
 * GET is the one the player uses, because it is the one anything can cache.
 * `?t=` text, `?v=` voice, `?s=` speed.
 *
 * With no `t` at all it is a readiness probe — 204 when the engine is
 * configured, 503 when it is not — which is how the site knows whether to
 * offer a Listen button rather than showing one that cannot work.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const text = q.get('t');

  if (text === null) {
    return engine()
      ? new Response(null, {
        status: 204,
        /* Short: a deployment that adds the variable should start offering the
           button within minutes, not on the next cache purge. */
        headers: { 'cache-control': 'public, max-age=300, s-maxage=300' },
      })
      : fail(503, NOT_CONFIGURED, { problems: ['KOKORO_URL is not set'] });
  }

  return synth(text, q.get('v'), q.get('s'), true);
}

/**
 * POST, for a caller that would rather not put its text in a URL. Same engine,
 * same limits, but the response is not cached by anything — that is inherent
 * to the method, and it is why the player does not use it.
 */
export async function POST(req: Request) {
  if (badOrigin(req)) return fail(403, 'Bad origin.');

  let body: { text?: unknown; voice?: unknown; speed?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail(400, 'Expected a JSON body: { text, voice, speed }.');
  }
  if (typeof body?.text !== 'string') return fail(400, '`text` must be a string.');

  return synth(body.text, body.voice, body.speed, false);
}
