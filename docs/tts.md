# Read-aloud

Every panel with prose has a **Listen** button, the reader's is **Describe**,
and the transcript column reads a page's script line by line. All three speak
through [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) — an 82M-parameter
open-weight model, Apache-2.0, running on a small server of ours.

## The shape of it

```
browser                     Vercel                    a small always-on box
─────────────────────────   ───────────────────────   ─────────────────────
lib/tts-chunk.ts            app/api/tts/route.ts      services/kokoro
  splits the text             caps, allow-lists,        holds the model in
lib/tts.ts                    caches, proxies           memory and speaks
  fetches, decodes,
  schedules gaplessly
```

**The model does not run in Next.js, and that is not a shortcut.** Kokoro is
~310MB of ONNX plus a runtime; a Vercel function is not allowed to be that
large, and where it fits, loading the graph per invocation means paying a cold
start on every sentence while several people are listening. In the browser it
is worse in a different way: `kokoro-js` in WASM is an 86MB download before the
first word, on a site whose whole build asserts that visitors download almost
nothing.

So the model lives in one long-lived process, warm, and `/api/tts` is what
stands between it and the internet.

## Running the engine

Needs one core that can generate faster than real time and about 1GB of RAM.
No GPU, no API key, no per-character bill.

```bash
cd services/kokoro
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# the phonemiser for words the dictionary does not carry — mostly names
sudo apt-get install -y espeak-ng      # or: brew install espeak-ng

# the weights, once
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-v1.0
curl -LO $REL/kokoro-v1.0.onnx
curl -LO $REL/voices-v1.0.bin

python main.py            # → http://127.0.0.1:8080
```

Or the container, which bakes the weights in so a restart is not a download:

```bash
docker build -t fruitpop-kokoro services/kokoro
docker run -p 8080:8080 fruitpop-kokoro
```

Then point the site at it:

```bash
# .env.local, and the same in Vercel
KOKORO_URL=http://127.0.0.1:8080
KOKORO_TOKEN=            # optional; set it if the engine is publicly routable
```

| | |
|---|---|
| `GET /health` | `{ok, voices, concurrency, max_text}` |
| `POST /speak` | `{text, voice, speed}` → `audio/wav` with a real length |
| `POST /speak?stream=1` | the same, progressively, for an `<audio>` consumer |

**Unset `KOKORO_URL` is a supported state.** The site renders, the build
passes, and no Listen button appears anywhere — the readiness probe answers 503
and the components render nothing rather than a control that fails when pressed.

## Chunking, and why the first one is short

`lib/tts-chunk.ts` splits long text before any of it is requested. Kokoro reads
prosody from the whole utterance it is given, so the two failure modes pull
against each other: too long and quality drifts while the listener waits for the
last word to be generated, too short and a fragment gets flat, clipped delivery
because there is no sentence around it for the predictor to read rhythm from.

- Whole sentences, packed to **450 characters**.
- A sentence over budget breaks at a clause mark, then at a space, and the
  fragment **keeps the comma** — a full stop in the middle of a clause is a
  worse lie than a breath.
- The **first chunk gets 180**. Time to first audio is the only latency anyone
  feels; everything after it is generated while the previous chunk plays.
- Markdown becomes words. A heading and a list item become the full stop they
  already were, because the eye gets that boundary from the layout and the ear
  gets nothing.
- Punctuation the writer typed is never changed. Kokoro has no prosody markup —
  a full stop is a fall, a question mark is a rise, a comma is a breath, and
  that is the entire notation.

## Gapless playback

`lib/tts.ts` decodes each chunk to an `AudioBuffer` and schedules it at an
**absolute time** on the audio clock: the end of the chunk before it, to the
sample. Two `<audio>` elements swapped on `ended` cannot do that — `ended`
fires after the last sample, the swap costs an event loop turn and a decode,
and every sentence gets a 30–80ms hole. A 6ms gain ramp at each end is
insurance against a click, not a fix for one.

The next chunk is fetched **before** the current one is awaited, so in steady
state the network is a chunk ahead of the ear. Generation is never more than
12 seconds ahead of the audio clock: rendering a whole article the moment
someone presses play would hold the engine against one reader while everyone
else waits, and most of it would be thrown away when they turn the page.

Pause is `ctx.suspend()`, which freezes the clock — everything already
scheduled stays scheduled, correctly, relative to a clock that is not moving.

## Caching, which is most of the performance story

Audio for a given (text, voice, speed) is deterministic, so it is addressable:
`GET /api/tts?t=…&v=…&s=…`, `immutable`, a year in the shared cache. On a page
everybody reads that is the difference between one generation and hundreds —
the CDN answers the second listener and the engine never hears about it. A
`POST` could not be cached by any of those layers, which is why the player does
not use it, though the route accepts one.

## The limits, named

- **The engine is not open to the internet.** The route allow-lists the voice,
  caps the text at 500 characters, and refuses a cross-origin `POST`. The
  optional `KOKORO_TOKEN` closes the last gap when the engine is publicly
  routable.
- **No rate limiting**, for the same reason the CMS has none: an in-memory
  counter on serverless is per-instance and resets on a cold start, so it would
  be decoration. The real controls are the caps, the cache, and a Vercel
  Firewall rule on `/api/tts` if this is ever abused.
- **No pitch control.** Kokoro has a speed multiplier and nothing else; pitch is
  part of the voice. The browser synthesiser this replaced had one, and that is
  a real loss — but it was a pitch dial on a voice nobody chose.
- **English only.** Kokoro ships other languages; the voice list here is the
  American and British sets, which is what the site is written in.
- **The picker offers thirteen voices, not fifty.** Kokoro grades its own, and
  most are C or below. Listing all of them would repeat exactly the problem the
  browser's voice list had, which is that the good ones are buried.
