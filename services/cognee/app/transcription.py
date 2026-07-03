from __future__ import annotations

import importlib
import os
import shutil
import threading
from pathlib import Path
from typing import Any

from .models import TranscriptionResponse, TranscriptionSegment, TranscriptionWord


class StableTsError(RuntimeError):
    """Raised when stable-ts cannot transcribe in the current environment."""


class StableTsTranscriber:
    """Lazy local transcription through jianfch/stable-ts (`stable_whisper`).

    This deliberately replaces the previous OpenAI Whisper API call. The model is
    loaded once per Python process and cached for subsequent session uploads.
    """

    def __init__(self) -> None:
        self.model_name = os.getenv("STABLE_TS_MODEL", "base")
        self.device = os.getenv("STABLE_TS_DEVICE") or None
        self.download_root = os.getenv("STABLE_TS_DOWNLOAD_ROOT") or None
        self.dynamic_quantization = os.getenv("STABLE_TS_DYNAMIC_QUANTIZATION", "false").lower() in {
            "1",
            "true",
            "yes",
        }
        self._module: Any | None = None
        self._model: Any | None = None
        self._lock = threading.Lock()

    def health(self) -> dict[str, Any]:
        missing: list[str] = []
        if not self._stable_whisper_available():
            missing.append("stable_whisper")
        if shutil.which("ffmpeg") is None:
            missing.append("ffmpeg")
        return {
            "provider": "stable-ts",
            "model": self.model_name,
            "available": not missing,
            "missing": missing,
            "device": self.device or "auto",
            "downloadRoot": self.download_root,
        }

    def transcribe_path(self, audio_path: str | Path, *, language: str | None = None) -> TranscriptionResponse:
        module = self._load_module()
        if shutil.which("ffmpeg") is None:
            raise StableTsError("stable-ts requires ffmpeg in PATH, but ffmpeg was not found.")

        model = self._load_model(module)
        kwargs: dict[str, Any] = {}
        if language:
            kwargs["language"] = language

        result = model.transcribe(str(audio_path), **kwargs)
        return self._to_response(result)

    def _stable_whisper_available(self) -> bool:
        try:
            importlib.import_module("stable_whisper")
            return True
        except Exception:
            return False

    def _load_module(self) -> Any:
        if self._module is not None:
            return self._module
        try:
            self._module = importlib.import_module("stable_whisper")
            return self._module
        except Exception as exc:  # pragma: no cover - depends on optional local install
            raise StableTsError(
                "stable-ts is not installed. Install it with: "
                "pip install -U git+https://github.com/jianfch/stable-ts.git"
            ) from exc

    def _load_model(self, module: Any) -> Any:
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is not None:
                return self._model

            kwargs: dict[str, Any] = {}
            if self.device:
                kwargs["device"] = self.device
            if self.download_root:
                kwargs["download_root"] = self.download_root
            if self.dynamic_quantization:
                kwargs["dq"] = True

            self._model = module.load_model(self.model_name, **kwargs)
            return self._model

    def _to_response(self, result: Any) -> TranscriptionResponse:
        data = self._result_to_dict(result)
        raw_segments = data.get("segments") or []
        segments = [self._segment_to_model(segment) for segment in raw_segments]
        text = data.get("text") or getattr(result, "text", None) or " ".join(segment.text for segment in segments)
        language = data.get("language") or getattr(result, "language", None)
        return TranscriptionResponse(
            model=self.model_name,
            text=str(text).strip(),
            language=language,
            segments=segments,
        )

    def _result_to_dict(self, result: Any) -> dict[str, Any]:
        if isinstance(result, dict):
            return result
        if hasattr(result, "to_dict"):
            return result.to_dict()
        if hasattr(result, "segments"):
            return {
                "text": getattr(result, "text", None),
                "language": getattr(result, "language", None),
                "segments": getattr(result, "segments"),
            }
        return {"text": str(result), "segments": []}

    def _segment_to_model(self, segment: Any) -> TranscriptionSegment:
        if hasattr(segment, "to_dict"):
            segment = segment.to_dict()
        elif not isinstance(segment, dict):
            segment = {
                "id": getattr(segment, "id", None),
                "start": getattr(segment, "start", 0.0),
                "end": getattr(segment, "end", 0.0),
                "text": getattr(segment, "text", ""),
                "words": getattr(segment, "words", None),
            }

        raw_words = segment.get("words") or None
        words = None
        if raw_words is not None:
            words = [self._word_to_model(word) for word in raw_words]

        return TranscriptionSegment(
            id=segment.get("id"),
            start=float(segment.get("start") or 0),
            end=float(segment.get("end") or 0),
            text=str(segment.get("text") or ""),
            words=words,
        )

    def _word_to_model(self, word: Any) -> TranscriptionWord:
        if hasattr(word, "to_dict"):
            word = word.to_dict()
        elif not isinstance(word, dict):
            word = {
                "word": getattr(word, "word", ""),
                "start": getattr(word, "start", 0.0),
                "end": getattr(word, "end", 0.0),
                "probability": getattr(word, "probability", None),
            }
        return TranscriptionWord(
            word=str(word.get("word") or ""),
            start=float(word.get("start") or 0),
            end=float(word.get("end") or 0),
            probability=word.get("probability"),
        )
