"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { processSession, type ProcessSessionResponse } from "../../lib/api";
import { MEDICAL_DISCLAIMER } from "../../lib/patientData";
import { datasetForPatient, useActivePatient } from "../../lib/activePatient";
import { Disclaimer, StatusLine, Tag } from "../../components/Primitives";

export default function ProcessPage() {
  const { activePatient } = useActivePatient();
  const [file, setFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ProcessSessionResponse | null>(null);
  const [message, setMessage] = useState("Upload audio or record the consultation to run stable-ts → LLM → remember().");
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  function pickMimeType() {
    const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    return options.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Browser recording is not available here. Use the audio file upload instead.");
      return;
    }
    try {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setRecordedFile(null);
      setFile(null);
      setResult(null);
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : elapsed;
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        const sessionFile = new File([blob], `anamnesis-session-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, {
          type,
        });
        setRecordedFile(sessionFile);
        setRecordedUrl(URL.createObjectURL(blob));
        setElapsed(duration);
        setMessage(`Recording captured (${formatDuration(duration)}). Click Start processing to transcribe it.`);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start(1000);
      setIsRecording(true);
      setMessage("Recording consultation… keep this tab open, then click Stop recording when the session ends.");
    } catch (err) {
      setMessage(err instanceof Error ? `Could not start recording: ${err.message}` : "Could not start recording.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsRecording(false);
  }

  function clearRecording() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedFile(null);
    setElapsed(0);
    setMessage("Recording cleared. Upload audio or record a new consultation.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const audio = recordedFile ?? file;
    if (!audio) {
      setMessage("Upload an audio file or record the consultation first.");
      return;
    }
    setBusy(true);
    setMessage("Processing audio with stable-ts, extracting entities with the configured LLM, then writing remember()...");
    try {
      const form = new FormData();
      form.set("patientId", activePatient.id);
      form.set("patientName", activePatient.name);
      form.set("consentGiven", String(activePatient.consentGiven));
      form.set("audio", audio);
      const data = await processSession(form);
      setResult(data);
      setMessage(`remember() stored ${data.rememberedCount} extracted entity node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const entities = result?.entities;
  const audioReady = Boolean(file || recordedFile);
  return (
    <div className="pg">
      <h1 className="h1">Process New Consultation</h1>
      <p className="sub">
        Audio upload → stable-ts transcription → LLM medical entity extraction → Cognee <span className="mono">remember()</span> → graph update.
      </p>
      <div className="grid2">
        <form className="box" onSubmit={(event) => void onSubmit(event)}>
          <div className="sec">Audio input</div>
          <div className="row">
            <button className="btn pri" type="button" onClick={() => void startRecording()} disabled={busy || isRecording}>
              Start recording
            </button>
            <button className="btn" type="button" onClick={stopRecording} disabled={!isRecording}>
              Stop recording
            </button>
            <span className="chip">{isRecording ? `Recording ${formatDuration(elapsed)}` : recordedFile ? `Recorded ${formatDuration(elapsed)}` : "Recorder idle"}</span>
          </div>
          {recordedFile ? (
            <div className="box">
              <div className="kv"><span>Recorded session</span><b>{recordedFile.name}</b></div>
              <div className="kv"><span>Size</span><span>{Math.round(recordedFile.size / 1024)} KB</span></div>
              <div className="row">
                {recordedUrl ? <a className="btn" href={recordedUrl} download={recordedFile.name}>Download recording</a> : null}
                <button className="btn danger" type="button" onClick={clearRecording}>Clear recording</button>
              </div>
            </div>
          ) : null}
          <label className="ph" style={{ height: 64, cursor: "pointer" }}>
            {file ? file.name : recordedFile ? recordedFile.name : "or upload an existing file · .wav .mp3 .m4a .webm"}
            <input
              style={{ display: "none" }}
              type="file"
              accept="audio/*"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setRecordedFile(null);
                if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                setRecordedUrl(null);
              }}
            />
          </label>
          <div className="grid2">
            <label className="field">Patient ID<input className="in mono" value={activePatient.id} readOnly /></label>
            <label className="field">Patient name<input className="in" value={activePatient.name} readOnly /></label>
            <label className="field">Session timestamp<input className="in" defaultValue={new Date().toISOString().slice(0, 16)} readOnly /></label>
            <label className="field">Consent<div className="in">☑ Patient consent confirmed</div></label>
          </div>
          <button className="btn pri" style={{ alignSelf: "flex-start" }} disabled={busy || !audioReady || isRecording}>
            {busy ? <><span className="spin" /> Processing</> : "Start processing"}
          </button>
        </form>
        <div className="box">
          <div className="sec">Processing status</div>
          <div className="step"><span className={`dot ${audioReady ? "done" : isRecording ? "active" : ""}`}>{audioReady ? "✓" : "1"}</span>{isRecording ? "Recording audio" : "Audio received"}</div>
          <div className="step"><span className={`dot ${result?.transcription ? "done" : busy ? "active" : ""}`}>{result?.transcription ? "✓" : "2"}</span>Transcribing with stable-ts</div>
          <div className="step"><span className={`dot ${result ? "done" : busy ? "active" : ""}`}>{result ? "✓" : "3"}</span>Extracting medical entities with the configured LLM</div>
          <div className="step"><span className={`dot ${result ? "done" : ""}`}>{result ? "✓" : "4"}</span>Writing structured nodes with remember()</div>
          <div className="step"><span className={`dot ${result ? "done" : ""}`}>{result ? "✓" : "5"}</span>Updating patient graph</div>
          <StatusLine>{message}</StatusLine>
        </div>
      </div>
      <div className="box">
        <div className="sec">Transcript</div>
        <div className="muted" style={{ fontStyle: "italic" }}>
          {result?.transcript || "No transcript yet. Upload or record a consultation, then click Start processing."}
        </div>
        <div className="row mono muted" style={{ fontSize: 10.5 }}>
          <span>provider: {result?.transcription?.provider ?? "stable-ts"}</span>
          <span>model: {result?.transcription?.model ?? "base"}</span>
          <span>language: {result?.transcription?.language ?? "—"}</span>
          <span>segments: {result?.transcription?.segments.length ?? "—"}</span>
          <span>word timings: {result?.transcription?.segments.some((s) => s.words?.length) ? "available" : "optional"}</span>
        </div>
      </div>
      <div className="box">
        <div className="sec">Extracted entities</div>
        <table className="tbl"><tbody>
          <tr><th>Type</th><th>Value</th><th>Timestamp</th><th>Context</th><th>Conf.</th></tr>
          {entities
            ? entities.map((e, i) => <tr key={`${e.type}-${e.value}-${i}`}><td><Tag>{e.type}</Tag></td><td>{e.value}</td><td>{e.timestamp}</td><td>{e.context ?? "—"}</td><td>{e.confidence ?? "—"}</td></tr>)
            : <tr><td colSpan={5} className="muted">No extracted entities yet.</td></tr>}
        </tbody></table>
      </div>
      <div className="grid2">
        <div className="box">
          <div className="sec">Session summary</div>
          <div>{result?.summary ?? <span className="muted">No summary yet. The configured LLM generates this from the transcript after processing.</span>}</div>
        </div>
        <div className="box">
          <div className="sec">remember() confirmation</div>
          <div className="kv"><span>Entities remembered</span><b>{result?.rememberedCount ?? "—"}</b></div>
          <div className="kv"><span>Graph nodes updated</span><b>{result ? result.graph.nodes.length : "—"}</b></div>
          <div className="kv"><span>Graph edges updated</span><b>{result ? result.graph.edges.length : "—"}</b></div>
          <div className="mono muted" style={{ fontSize: 10.5 }}>remember(dataset="{datasetForPatient(activePatient.id)}")</div>
        </div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
