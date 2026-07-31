# The voice engine, ready to run anywhere that takes a container: Fly, Render,
# Railway, a VPS. Not Vercel — that is the whole reason this is a separate
# service, and docs/tts.md explains it.
#
#   docker build -t fruitpop-kokoro services/kokoro
#   docker run -p 8080:8080 fruitpop-kokoro
#
# The model is baked in at build time rather than downloaded at boot: a cold
# start that begins with a 310MB download is a cold start measured in minutes,
# and every restart pays it again.

FROM python:3.12-slim

# espeak-ng is the fallback phonemiser for words Kokoro's dictionary does not
# carry — names, mostly, which a comic has a lot of.
RUN apt-get update \
    && apt-get install -y --no-install-recommends espeak-ng curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ARG RELEASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-v1.0
RUN curl -fsSL -o kokoro-v1.0.onnx "$RELEASE/kokoro-v1.0.onnx" \
    && curl -fsSL -o voices-v1.0.bin "$RELEASE/voices-v1.0.bin"

COPY main.py .

ENV PORT=8080 \
    KOKORO_MODEL=/app/kokoro-v1.0.onnx \
    KOKORO_VOICES=/app/voices-v1.0.bin

EXPOSE 8080

# The model loads in `lifespan`, so a container that answers /health at all is
# a container that can speak.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
    CMD curl -fsS http://127.0.0.1:8080/health || exit 1

CMD ["python", "main.py"]
