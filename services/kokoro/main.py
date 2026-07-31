"""The voice engine.

One long-lived process holding Kokoro in memory, speaking for the Next.js site
in front of it. Nothing here is reachable from the internet directly: the site's
/api/tts route is the only client, and it is the thing that caps the length,
allow-lists the voice, and caches the result. See docs/tts.md.

WHY THIS EXISTS AS A SEPARATE SERVICE
    Kokoro is 82M parameters and about 310MB of ONNX. A Vercel function cannot
    hold that (the deployment limit is smaller than the model), and even where
    it fits, loading the graph per invocation would mean paying the cold start
    on every sentence while several people listen at once. Model in memory,
    loaded once, is the whole point.

WHY NOT IN THE BROWSER
    kokoro-js in WASM works, and costs the visitor an 86MB download before the
    first word. On a comic site where someone might press Listen once, that is
    a worse trade than a request per sentence.

WHAT IT COSTS
    Roughly 1GB of RAM and one CPU core that can generate faster than real time.
    Any small always-on box does it. There is no GPU requirement and no
    per-character bill — the model is Apache-2.0.
"""

from __future__ import annotations

import asyncio
import io
import os
import struct
import time
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from kokoro_onnx import Kokoro

MODEL = os.getenv("KOKORO_MODEL", "kokoro-v1.0.onnx")
VOICES = os.getenv("KOKORO_VOICES", "voices-v1.0.bin")
TOKEN = os.getenv("KOKORO_TOKEN") or None

# Mirrors MAX_TEXT in lib/kokoro.ts. The site chunks to 450 before it asks, so
# anything near this is a caller that did not.
MAX_TEXT = int(os.getenv("KOKORO_MAX_TEXT", "500"))

# How many generations run at once. onnxruntime releases the GIL, so these are
# genuinely parallel — but each one wants a core, and oversubscribing turns a
# fast queue into a slow one for everybody. Two per core is a sane ceiling.
MAX_CONCURRENCY = int(os.getenv("KOKORO_CONCURRENCY", "4"))

engine: Kokoro | None = None
gate = asyncio.Semaphore(MAX_CONCURRENCY)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Load the model before the first request, not during it."""
    global engine
    started = time.time()
    engine = Kokoro(MODEL, VOICES)
    print(f"[kokoro] model ready in {time.time() - started:.1f}s "
          f"({len(engine.get_voices())} voices, {MAX_CONCURRENCY} concurrent)")
    yield
    engine = None


app = FastAPI(title="Fruit Pop voice engine", lifespan=lifespan)


class Speech(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT)
    voice: str = "af_heart"
    # Kokoro's only prosody dial. There is no pitch parameter — pitch is part
    # of the voice, which is why the site's picker offers voices and a speed.
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


def guard(authorization: str | None) -> None:
    """Optional shared secret, so the engine is not open to whoever finds it.

    Unset means unauthenticated, which is fine when the only route to this
    process is a private network. Set it when it is not.
    """
    if TOKEN is None:
        return
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Bad token")


def accent(voice: str) -> str:
    """Kokoro's voice ids carry their language in the first letter."""
    return "en-gb" if voice.startswith("b") else "en-us"


def wav_header(rate: int, frames: int | None) -> bytes:
    """A 44-byte RIFF header.

    `frames=None` writes the placeholder sizes used for a stream whose length
    is not known yet. Every browser accepts that from an <audio> element;
    decodeAudioData is fussier, which is why the default path below sends a
    real length instead.
    """
    data = 0xFFFFFFFF if frames is None else frames * 2
    riff = 0xFFFFFFFF if frames is None else data + 36
    return (
        b"RIFF" + struct.pack("<I", riff) + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
        + b"data" + struct.pack("<I", data)
    )


def pcm16(samples: np.ndarray) -> bytes:
    """float32 in [-1, 1] to little-endian signed 16-bit."""
    clipped = np.clip(samples, -1.0, 1.0)
    return (clipped * 32767.0).astype("<i2").tobytes()


def synth(body: Speech) -> tuple[np.ndarray, int]:
    """Blocking. Called in a worker thread so the event loop keeps serving."""
    assert engine is not None
    return engine.create(
        body.text, voice=body.voice, speed=body.speed, lang=accent(body.voice)
    )


@app.get("/health")
async def health():
    if engine is None:
        return JSONResponse({"ok": False, "error": "model not loaded"}, status_code=503)
    return {
        "ok": True,
        "voices": sorted(engine.get_voices()),
        "concurrency": MAX_CONCURRENCY,
        "max_text": MAX_TEXT,
    }


@app.post("/speak")
async def speak(
    body: Speech,
    stream: bool = Query(default=False),
    authorization: str | None = Header(default=None),
):
    """One chunk of speech as a WAV.

    The default response carries a correct Content-Length, because the browser
    decodes the whole chunk into an AudioBuffer before scheduling it — the
    site's gapless joins need the samples up front, so progressive delivery
    would buy nothing and a placeholder-length header would only risk the
    decoder rejecting it.

    `?stream=1` is the progressive form, for a plain <audio> consumer that
    would rather start playing sooner than know how long the file is.
    """
    guard(authorization)
    if engine is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if body.voice not in engine.get_voices():
        raise HTTPException(status_code=400, detail=f"Unknown voice {body.voice!r}")

    if stream:
        return StreamingResponse(
            progressive(body),
            media_type="audio/wav",
            headers={"cache-control": "no-store"},
        )

    async with gate:
        started = time.time()
        samples, rate = await asyncio.to_thread(synth, body)

    audio = pcm16(samples)
    seconds = len(samples) / rate
    print(f"[kokoro] {len(body.text)}ch → {seconds:.1f}s in "
          f"{time.time() - started:.2f}s · {body.voice} @ {body.speed}")

    return Response(
        content=wav_header(rate, len(samples)) + audio,
        media_type="audio/wav",
        headers={"cache-control": "no-store", "x-audio-seconds": f"{seconds:.2f}"},
    )


async def progressive(body: Speech):
    """Sentence-by-sentence WAV frames, header first."""
    assert engine is not None
    sent_header = False
    async with gate:
        async for samples, rate in engine.create_stream(
            body.text, voice=body.voice, speed=body.speed, lang=accent(body.voice)
        ):
            if not sent_header:
                yield wav_header(rate, None)
                sent_header = True
            yield pcm16(samples)
    if not sent_header:
        yield wav_header(24000, 0)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8080")),
        # One worker. A second process would mean a second copy of the model in
        # memory for no more throughput than the semaphore above already allows.
        workers=1,
    )
