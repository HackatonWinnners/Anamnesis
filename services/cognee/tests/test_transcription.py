from __future__ import annotations

import sys
import types

import pytest
from fastapi.testclient import TestClient

import app.transcription as transcription_module
from app.main import app, transcriber
from app.transcription import StableTsError, StableTsTranscriber


@pytest.fixture(autouse=True)
def _reset_singleton_cache():
    """The FastAPI transcriber is a process singleton that caches the loaded
    module/model. Reset it around each test so endpoint tests are independent."""
    transcriber._module = None
    transcriber._model = None
    yield
    transcriber._module = None
    transcriber._model = None


# --- Fakes that mimic the jianfch/stable-ts (`stable_whisper`) result API ---
class _FakeSegment:
    def __init__(self, id, start, end, text, words):
        self.id, self.start, self.end, self.text, self.words = id, start, end, text, words

    def to_dict(self):
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "text": self.text,
            "words": [dict(w) for w in self.words] if self.words is not None else None,
        }


class _FakeWhisperResult:
    """Mimics stable_whisper.WhisperResult: exposes .text/.language and .to_dict()."""

    def __init__(self):
        self.language = "en"
        self.text = " Patient reports trouble sleeping. "
        self.segments = [
            _FakeSegment(
                0,
                0.0,
                2.5,
                " Patient reports trouble sleeping.",
                [{"word": " Patient", "start": 0.0, "end": 0.4, "probability": 0.98}],
            ),
            _FakeSegment(1, 2.5, 5.0, " Prescribed iron.", None),
        ]

    def to_dict(self):
        return {
            "text": self.text,
            "language": self.language,
            "segments": [s.to_dict() for s in self.segments],
        }


class _FakeModel:
    def transcribe(self, path, **kwargs):
        assert isinstance(path, str)
        return _FakeWhisperResult()


@pytest.fixture
def fake_stable_whisper(monkeypatch):
    """Install a fake `stable_whisper` module and pretend ffmpeg is present."""
    module = types.ModuleType("stable_whisper")
    module.load_model = lambda name, **kwargs: _FakeModel()
    monkeypatch.setitem(sys.modules, "stable_whisper", module)
    monkeypatch.setattr(
        transcription_module.shutil,
        "which",
        lambda name: "/usr/bin/ffmpeg" if name == "ffmpeg" else None,
    )
    return module


def test_transcriber_maps_result(fake_stable_whisper):
    resp = StableTsTranscriber().transcribe_path("/tmp/audio.wav")
    assert resp.provider == "stable-ts"
    assert resp.language == "en"
    # text is stripped, segments and word-level timings are preserved
    assert resp.text == "Patient reports trouble sleeping."
    assert len(resp.segments) == 2
    assert resp.segments[0].words[0].word == " Patient"
    assert resp.segments[1].words is None
    assert resp.model_dump()  # must serialize for FastAPI response_model


def test_transcriber_requires_ffmpeg(monkeypatch):
    module = types.ModuleType("stable_whisper")
    module.load_model = lambda name, **kwargs: _FakeModel()
    monkeypatch.setitem(sys.modules, "stable_whisper", module)
    monkeypatch.setattr(transcription_module.shutil, "which", lambda name: None)
    with pytest.raises(StableTsError):
        StableTsTranscriber().transcribe_path("/tmp/audio.wav")


def test_transcribe_endpoint_happy_path(fake_stable_whisper):
    client = TestClient(app)
    resp = client.post(
        "/transcribe",
        files={"audio": ("visit.wav", b"fake audio bytes", "audio/wav")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "stable-ts"
    assert body["text"] == "Patient reports trouble sleeping."
    assert len(body["segments"]) == 2


def test_transcribe_endpoint_returns_503_when_unavailable(monkeypatch):
    # Force stable_whisper import to fail so the endpoint reports 503 with guidance.
    monkeypatch.setitem(sys.modules, "stable_whisper", None)
    client = TestClient(app)
    resp = client.post(
        "/transcribe",
        files={"audio": ("visit.wav", b"fake audio bytes", "audio/wav")},
    )
    assert resp.status_code == 503
    assert "stable-ts" in resp.json()["detail"]
