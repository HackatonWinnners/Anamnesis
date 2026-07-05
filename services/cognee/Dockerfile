FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ANAMNESIS_DATA_DIR=/app/.data

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Local stable-ts transcription stack. Install CPU-only torch/torchaudio first
# (the default PyPI torchaudio wheel links against CUDA and fails on CPU hosts),
# then stable-ts + openai-whisper, which reuse the already-installed CPU torch.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
        torch==2.8.0 torchaudio==2.8.0 \
    && pip install --no-cache-dir openai-whisper stable-ts

COPY app ./app
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
