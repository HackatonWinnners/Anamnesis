# Anamnesis

**Not medical advice. This is an experimental tool for documentation and hackathon purposes only.**

Anamnesis is a Cognee Hackathon MVP for continuity of care in a German/European healthcare context. It shows how graph memory can structure a patient's longitudinal record and support doctor-facing recall, conflict checks, medical-intuition hypotheses, and GDPR deletion.

## What is implemented

- **Cognee pillar 1 — `remember()`**: audio session processing flows through local stable-ts transcription, GPT-4o structured extraction, and a FastAPI Cognee wrapper that stores typed clinical graph nodes.
- **Cognee pillar 2 — `recall()`**: doctor queries retrieve timeline/graph context; the demo query is “Show all sleep-related complaints over the last year.”
- **Cognee pillar 3 — `improve()` / `memify()`**: the service links longitudinal patterns such as fatigue + low ferritin into hypothesis nodes.
- **Cognee pillar 4 — `forget()`**: deleting a patient calls Cognee `forget(dataset="patient_<id>")` and removes the local UI projection.
- **Demo data**: a synthetic 2-year history for `demo-patient-001` / Anna Müller with sleep complaints, ulcer/NSAID safety risk, and fatigue/low ferritin.

## Architecture

```text
apps/web        Next.js doctor dashboard
apps/api        Hono public API gateway, stable-ts transcription proxy + GPT-4o orchestration
services/cognee FastAPI microservice; only place that imports Cognee
packages/shared Shared Zod schemas/types
```

The Python service keeps a small JSON graph projection under `services/cognee/.data/` for deterministic UI rendering and tests. Cognee remains the intended memory backend; if the Cognee SDK is unavailable locally, the service returns a warning and uses the projection fallback so the hackathon demo can still be exercised while setup is fixed.

## Prerequisites

- Node.js 23+
- pnpm 10+
- Python 3.12 recommended for real stable-ts transcription. On Intel macOS (x86_64) the last PyTorch wheels are `torch==2.2.2`, which require Python <=3.12. Python 3.13/3.14 can run the service + all non-transcription tests, but PyTorch has no matching wheel there on this platform.
- Docker optional, if you prefer containerized service runs
- `OPENAI_API_KEY` for GPT-4o structured extraction
- FFmpeg in PATH for stable-ts / local Whisper audio decoding

## Setup

```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY; optionally set STABLE_TS_MODEL

pnpm install
python3.12 -m venv services/cognee/.venv
source services/cognee/.venv/bin/activate
pip install -r services/cognee/requirements.txt

# Real stable-ts transcription stack (torch + openai-whisper + stable-ts, pinned):
pip install -r services/cognee/requirements-transcription.txt
```

`requirements-transcription.txt` installs stable-ts from the requested GitHub
repository (`git+https://github.com/jianfch/stable-ts.git`) with a verified set
of pins (`torch==2.2.2`, `numpy==1.26.4`, `numba==0.60.0`, `llvmlite==0.43.0`)
that provide prebuilt wheels on Intel macOS / Python 3.12.

Install FFmpeg before uploading audio (`brew install ffmpeg` on macOS,
`apt-get install ffmpeg` on Debian/Ubuntu). Without FFmpeg, `/transcribe`
returns HTTP 503 with an actionable error.

Verify the real transcription path end-to-end (downloads the Whisper model once):

```bash
RUN_REAL_STABLE_TS=1 STABLE_TS_MODEL=tiny \
  services/cognee/.venv/bin/python -m pytest services/cognee/tests/test_transcription_real.py -v
```

## Run locally

Use three terminals:

```bash
# Terminal 1: Cognee/FastAPI service
pnpm dev:cognee

# Terminal 2: Hono API gateway
pnpm dev:api

# Terminal 3: Next.js dashboard
pnpm dev:web
```

Open the dashboard at `http://localhost:3000`.

## Seed demo data

With the Python environment active:

```bash
pnpm seed
```

This deletes and recreates `demo-patient-001`, writes 12 synthetic sessions through the real service path, and prints the demo conflict medication: `Aspirin 500 mg`.

## Demo flow

1. Run `pnpm seed`.
2. Open the dashboard and load the default patient.
3. Run the recall query: “Show all sleep-related complaints over the last year.”
4. Check conflict for `Aspirin 500 mg` and observe the ulcer/NSAID safety alert.
5. Click `Run improve()` and observe a hypothesis node linking fatigue and low ferritin.
6. Click `GDPR forget()` and confirm the patient graph is removed.
7. Upload a real audio file to process a new visit with stable-ts → GPT-4o → `remember()`.

## API routes

### Hono public API (`apps/api`, default `:8787`)

- `POST /api/sessions/process` — multipart form with `audio`, `patientId`, `patientName`, `consentGiven`; runs stable-ts transcription, GPT-4o extraction, then `remember()`.
- `GET /api/patients/:id/history?q=...` — calls `recall()`.
- `POST /api/patients/:id/check-conflict` — body `{ "medication": "Aspirin 500 mg" }`; calls targeted `recall()` and returns a safety alert.
- `POST /api/patients/:id/improve` — calls `improve()`/`memify()`.
- `DELETE /api/patients/:id` — calls `forget()`.

### FastAPI internal Cognee service (`services/cognee`, default `:8001`)

- `POST /remember`
- `POST /recall`
- `POST /check-conflict/{patient_id}`
- `POST /improve`
- `DELETE /forget/{patient_id}`

## Tests and checks

```bash
python -m py_compile services/cognee/app/*.py services/cognee/scripts/seed_patient.py
pnpm typecheck
pnpm test:cognee
pnpm --filter @anamnesis/shared check:schemas
```

`pnpm typecheck` and `pnpm test:cognee` require dependencies to be installed first.

`check:schemas` validates that the shared Zod schemas accept the `null`-valued
optional fields the Python service emits (guards the recall/improve responses).

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | — | GPT-4o structured extraction calls |
| `COGNEE_SERVICE_URL` | No | `http://localhost:8001` | Hono → FastAPI URL |
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:8787` | Browser → Hono URL |
| `CORS_ORIGINS` | No | — | Extra browser origins allowed to call the API (comma-separated). Any `localhost`/`127.0.0.1` port is always allowed. |
| `LLM_MODEL` | No | `gpt-4o` | Structured extraction model |
| `STABLE_TS_MODEL` | No | `base` | Local stable-ts model name |
| `STABLE_TS_DEVICE` | No | auto | Optional stable-ts device, e.g. `cpu` or `cuda` |
| `STABLE_TS_DOWNLOAD_ROOT` | No | stable-ts default | Optional model cache/download directory |
| `STABLE_TS_DYNAMIC_QUANTIZATION` | No | `false` | Enable stable-ts dynamic quantization when supported |
| `ANAMNESIS_DATA_DIR` | No | `services/cognee/.data` | Local graph projection storage |

## Troubleshooting: "Failed to fetch" on recall / improve / forget

`Failed to fetch` is a browser-level network error (the request never
completed), not an HTTP error from the API. Common causes and fixes:

- **The API isn't running.** Start it with `pnpm dev:api` and confirm
  `http://localhost:8787/api/health` responds. The dashboard now shows a clear
  "Cannot reach the Anamnesis API at …" message in this case.
- **The web app runs on a non-3000 port** (Next.js uses 3001+ when 3000 is
  busy). The API now allows any `localhost`/`127.0.0.1` origin, so this works
  out of the box; for other hosts set `CORS_ORIGINS`.
- **The Cognee service is down.** The API now returns a clear `502` with
  "Cognee memory service is unreachable at …. Start it with `pnpm dev:cognee`."
  instead of an opaque 500.
