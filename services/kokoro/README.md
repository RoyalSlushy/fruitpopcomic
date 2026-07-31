---
title: Fruit Pop Voice Engine
emoji: 🍇
colorFrom: pink
colorTo: indigo
sdk: docker
app_port: 8080
pinned: false
---

# The voice engine

Kokoro, held in memory, speaking for the site in front of it. The frontmatter
above is Hugging Face Space configuration — this directory is designed to be
pushed straight to a Space as-is.

Everything about *why* this is a separate process is in
[`docs/tts.md`](../../docs/tts.md). This file is about where to put it.

## Why not on Vercel

Measured, not assumed:

| | |
|---|---|
| onnxruntime | 58 MB |
| numpy | 73 MB |
| espeakng-loader, phonemizer, babel | ~90 MB |
| **dependencies, installed** | **~250 MB** |
| kokoro-v1.0.onnx | 310 MB (86 MB quantised) |
| voices-v1.0.bin | 26 MB |

A Vercel function may be **250 MB unzipped, including dependencies**. The
dependencies alone reach that before the model is added, so even the quantised
build does not fit. And a function is stateless: every cold start would reload
the graph, which is the opposite of what a page several people are listening to
needs.

So the engine goes somewhere that keeps a process alive, and Vercel keeps the
site. `KOKORO_URL` is the only thing joining them.

## Where to put it

Any host that runs a container with **1 GB of RAM and a CPU that can generate
faster than real time**. No GPU. The model is Apache-2.0, so there is no key and
no per-character bill — the whole cost is the box.

### Hugging Face Spaces — free, no card

The path of least resistance if you have no server. Free CPU tier is 2 vCPU and
16 GB RAM, which is more than this needs, and a Space is a git repo.

1. Create a Space: <https://huggingface.co/new-space> → **Docker** → **Blank**.
2. Push the four files in this directory to it:

   ```bash
   git clone https://huggingface.co/spaces/<you>/<space> /tmp/space
   cp services/kokoro/{Dockerfile,main.py,requirements.txt,README.md} /tmp/space/
   cd /tmp/space && git add -A && git commit -m "Voice engine" && git push
   ```

   The first build takes a few minutes: it downloads the model.
3. In the Space → **Settings → Variables and secrets**, add a secret
   `KOKORO_TOKEN` with a long random value.
4. The URL is `https://<you>-<space>.hf.space`.

**Set the token.** A Space is world-reachable, and an unauthenticated one is a
free text-to-speech API with your name on it.

Free Spaces sleep after a period with no requests and take ~30 s to wake. For a
site with any traffic that rarely bites, and the site's audio cache means a
sleeping engine does not stop pages that have been read before.

### Fly.io — a card, and it stays warm

```bash
fly launch --no-deploy          # in services/kokoro; fly.toml is already here
fly secrets set KOKORO_TOKEN=$(openssl rand -hex 32)
fly deploy
```

`fly.toml` sets `auto_stop_machines`, so it scales to zero when nobody is
listening and wakes in a second or two rather than thirty.

### Render / Railway / a VPS

Same container, same two environment variables. Give it 1 GB.

## Running it locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-v1.0
curl -LO $REL/kokoro-v1.0.onnx
curl -LO $REL/voices-v1.0.bin

python main.py                  # → http://127.0.0.1:8080
```

Then point the site at it in `.env.local`:

```
KOKORO_URL=http://127.0.0.1:8080
```

## The contract

| | |
|---|---|
| `GET /health` | `{ok, voices, concurrency, max_text}` |
| `POST /speak` | `{text, voice, speed}` → `audio/wav`, real `Content-Length` |
| `POST /speak?stream=1` | the same, progressively, for an `<audio>` consumer |

`Authorization: Bearer $KOKORO_TOKEN` when the token is set. The site's
`/api/tts` route is the only thing that should ever call this.

| Variable | |
|---|---|
| `KOKORO_TOKEN` | shared secret. Set it on any host that is publicly reachable |
| `KOKORO_MODEL` | path to `kokoro-v1.0.onnx` |
| `KOKORO_VOICES` | path to `voices-v1.0.bin` |
| `KOKORO_CONCURRENCY` | generations at once, default 4 |
| `KOKORO_MAX_TEXT` | hard cap, default 500 — mirrors `MAX_TEXT` in `lib/kokoro.ts` |
| `PORT` | default 8080 |
