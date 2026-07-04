"use client";

import { FormEvent, useState } from "react";
import { processSession, type ProcessSessionResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, demoExtractedEntities, MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine, Tag } from "../../components/Primitives";

export default function ProcessPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessSessionResponse | null>(null);
  const [message, setMessage] = useState("Choose an audio file to run the real stable-ts → GPT-4o → remember() path.");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose an audio file first.");
      return;
    }
    setBusy(true);
    setMessage("Processing audio with stable-ts, extracting with GPT-4o, then writing remember()...");
    try {
      const form = new FormData();
      form.set("patientId", DEFAULT_DEMO_PATIENT.id);
      form.set("patientName", DEFAULT_DEMO_PATIENT.name);
      form.set("consentGiven", "true");
      form.set("audio", file);
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
  return (
    <div className="pg">
      <h1 className="h1">Process New Consultation</h1>
      <p className="sub">
        Audio upload → stable-ts transcription → GPT-4o medical entity extraction → Cognee <span className="mono">remember()</span> → graph update.
      </p>
      <div className="grid2">
        <form className="box" onSubmit={(event) => void onSubmit(event)}>
          <div className="sec">Audio upload</div>
          <label className="ph" style={{ height: 64, cursor: "pointer" }}>
            {file ? file.name : "drop consultation audio here · .wav .mp3 .m4a"}
            <input style={{ display: "none" }} type="file" accept="audio/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="grid2">
            <label className="field">Patient ID<input className="in mono" defaultValue={DEFAULT_DEMO_PATIENT.id} readOnly /></label>
            <label className="field">Patient name<input className="in" defaultValue={DEFAULT_DEMO_PATIENT.name} readOnly /></label>
            <label className="field">Session timestamp<input className="in" defaultValue={new Date().toISOString().slice(0, 16)} readOnly /></label>
            <label className="field">Consent<div className="in">☑ Patient consent confirmed</div></label>
          </div>
          <button className="btn pri" style={{ alignSelf: "flex-start" }} disabled={busy}>
            {busy ? <><span className="spin" /> Processing</> : "Start processing"}
          </button>
        </form>
        <div className="box">
          <div className="sec">Processing status</div>
          <div className="step"><span className={`dot ${file ? "done" : ""}`}>{file ? "✓" : "1"}</span>Audio received</div>
          <div className="step"><span className={`dot ${result?.transcription ? "done" : busy ? "active" : ""}`}>{result?.transcription ? "✓" : "2"}</span>Transcribing with stable-ts</div>
          <div className="step"><span className={`dot ${result ? "done" : busy ? "active" : ""}`}>{result ? "✓" : "3"}</span>Extracting medical entities with GPT-4o</div>
          <div className="step"><span className={`dot ${result ? "done" : ""}`}>{result ? "✓" : "4"}</span>Writing structured nodes with remember()</div>
          <div className="step"><span className={`dot ${result ? "done" : ""}`}>{result ? "✓" : "5"}</span>Updating patient graph</div>
          <StatusLine>{message}</StatusLine>
        </div>
      </div>
      <div className="box">
        <div className="sec">Transcript</div>
        <div className="muted" style={{ fontStyle: "italic" }}>
          {result?.transcript || "“…patient reports waking three to four times per night for the past two months. Fatigue somewhat improved since starting iron…”"}
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
            : demoExtractedEntities.map(([type, value, timestamp, context, confidence]) => <tr key={value}><td><Tag>{type}</Tag></td><td>{value}</td><td>{timestamp}</td><td>{context}</td><td>{confidence}</td></tr>)}
        </tbody></table>
      </div>
      <div className="grid2">
        <div className="box">
          <div className="sec">Post-visit summary</div>
          <div><b>Patient summary:</b> {result?.summary ?? "Your sleep is still interrupted, but your energy and iron levels are improving."}</div>
          <div><b>Clinical summary:</b> Persistent sleep fragmentation; fatigue improving with iron repletion; ulcer symptoms resolved. Continue NSAID avoidance.</div>
          <div><b>Follow-up plan:</b> ferritin re-check · sleep diary review · reassess need for sleep work-up.</div>
        </div>
        <div className="box">
          <div className="sec">remember() confirmation</div>
          <div className="kv"><span>Entities remembered</span><b>{result?.rememberedCount ?? 9}</b></div>
          <div className="kv"><span>Graph nodes updated</span><b>{result ? result.graph.nodes.length : "+11 → graph"}</b></div>
          <div className="kv"><span>Graph edges updated</span><b>{result ? result.graph.edges.length : "+16 → graph"}</b></div>
          <div className="mono muted" style={{ fontSize: 10.5 }}>remember(dataset="patient_demo-patient-001")</div>
        </div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
