#!/usr/bin/env sh
set -eu

# Resolve paths relative to the SERVICE directory (this script's parent's parent),
# not the caller's CWD. Without this, running from the repo root would silently
# miss the venvs and fall through to a system Python that lacks uvicorn/deps.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SERVICE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

# Prefer the Python 3.12 venv because it contains the real stable-ts/PyTorch stack
# on Intel macOS. Fall back to the lightweight venv, then system interpreters.
if [ -x "$SERVICE_DIR/.venv312/bin/python" ]; then
  exec "$SERVICE_DIR/.venv312/bin/python" "$@"
elif [ -x "$SERVICE_DIR/.venv/bin/python" ]; then
  exec "$SERVICE_DIR/.venv/bin/python" "$@"
elif command -v python3.12 >/dev/null 2>&1; then
  exec python3.12 "$@"
elif command -v python3 >/dev/null 2>&1; then
  exec python3 "$@"
else
  echo "No Python interpreter found. Create a venv under services/cognee/.venv first." >&2
  exit 127
fi
