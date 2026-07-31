# The voice engine, ready to run anywhere that takes a container: Hugging Face
# Spaces, Fly, Render, Railway, a VPS. Not Vercel — that is the whole reason
# this is a separate service, and README.md next to this file has the numbers.
#
#   docker build -t fruitpop-kokoro services/kokoro
#   docker run -p 8080:8080 -e KOKORO_TOKEN=... fruitpop-kokoro
#
# The model is baked in at build time rather than downloaded at boot: a cold
# start that begins with a 310MB download is a cold start measured in minutes,
# and every restart pays it again.

FROM python:3.12-slim

# curl for the model download below and for the healthcheck. NOT espeak-ng:
# kokoro-onnx pulls `espeakng-loader`, which ships libespeak-ng as a wheel, so
# the phonemiser needs no system package. That is what lets this image run on
# hosts where you cannot apt-get anything.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs containers as uid 1000 and will not write as root.
# Harmless everywhere else, and it means one image serves every host.
RUN useradd -m -u 1000 app
USER app
ENV HOME=/home/app \
    PATH=/home/app/.local/bin:$PATH
WORKDIR /home/app/svc

COPY --chown=app requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

ARG RELEASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-v1.0
RUN curl -fsSL -o kokoro-v1.0.onnx "$RELEASE/kokoro-v1.0.onnx" \
    && curl -fsSL -o voices-v1.0.bin "$RELEASE/voices-v1.0.bin"

COPY --chown=app main.py .

ENV PORT=8080 \
    KOKORO_MODEL=/home/app/svc/kokoro-v1.0.onnx \
    KOKORO_VOICES=/home/app/svc/voices-v1.0.bin

EXPOSE 8080

# The model loads in `lifespan`, so a container that answers /health at all is
# a container that can speak. The start period covers that load.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s \
    CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

CMD ["python", "main.py"]
