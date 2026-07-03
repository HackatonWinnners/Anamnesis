"""Real (non-mocked) stable-ts end-to-end transcription test.

This test exercises the actual jianfch/stable-ts stack. It is skipped unless
stable-ts, torch and ffmpeg are all installed AND RUN_REAL_STABLE_TS=1 is set.
It synthesizes a short audio clip with ffmpeg's built-in sine source, so it
needs no external assets (only the one-time Whisper model download).

Enable it explicitly with:  RUN_REAL_STABLE_TS=1 STABLE_TS_MODEL=tiny pytest -k real
"""
from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import wave
from pathlib import Path

import pytest

from app.transcription import StableTsTranscriber

_HAS_STABLE_WHISPER = importlib.util.find_spec("stable_whisper") is not None
_HAS_TORCH = importlib.util.find_spec("torch") is not None
_HAS_FFMPEG = shutil.which("ffmpeg") is not None
_OPT_IN = os.getenv("RUN_REAL_STABLE_TS") == "1"

pytestmark = pytest.mark.skipif(
    not (_OPT_IN and _HAS_STABLE_WHISPER and _HAS_TORCH and _HAS_FFMPEG),
    reason="Set RUN_REAL_STABLE_TS=1 and install stable-ts + torch + ffmpeg to run the real test.",
)


def _make_tone_wav(path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "sine=frequency=440:duration=2",
            "-ar", "16000", "-ac", "1", str(path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def test_real_transcription_smoke(tmp_path):
    wav = tmp_path / "tone.wav"
    _make_tone_wav(wav)

    with wave.open(str(wav)) as w:
        assert w.getframerate() == 16000

    resp = StableTsTranscriber().transcribe_path(str(wav))

    # Assert on structure/typing, not exact text (a sine tone has no words).
    assert resp.provider == "stable-ts"
    assert isinstance(resp.text, str)
    assert resp.model_dump()  # serializes cleanly for the FastAPI response_model
    for segment in resp.segments:
        assert segment.end >= segment.start
        if segment.words:
            for word in segment.words:
                assert word.end >= word.start
