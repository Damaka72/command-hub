#!/bin/bash
# Ensures HyperFrames (heygen-com/hyperframes) can render locally in this
# session: it needs FFmpeg/FFprobe on PATH and a Chrome headless shell.
# Idempotent — every check is skipped once satisfied, so a warm container
# re-runs this in well under a second.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  echo "Installing FFmpeg for HyperFrames rendering..."
  apt-get update -qq
  apt-get install -y -qq ffmpeg
fi

if command -v npx >/dev/null 2>&1; then
  echo "Ensuring HyperFrames Chrome headless shell is available..."
  npx --yes hyperframes browser ensure || echo "Warning: hyperframes browser ensure failed — HyperFrames local render may not work this session."
fi
