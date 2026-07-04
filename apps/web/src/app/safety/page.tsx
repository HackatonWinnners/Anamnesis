"use client";

import { useState } from "react";
import { checkConflict, type SafetyAlert } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function SafetyPage() {
  const [medication, setMedication] = useState("Aspirin");
  const [dosage, setDosage] = useState("500 mg");
  const [context, setContext] = useState("tension headache");
  const [alert, setAlert] = useState<SafetyAlert | null>(null);
  const [message, setMessage] = useState("Ready to check proposed medication against graph memory.");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMessage("Checking allergies, adverse reactions, ulcer history, bleeding risk, and medications...");
    try {
      const data = await checkConflict(DEFAULT_DEMO_PATIENT.id, {
        medication: `${medication} ${dosage}`.trim(),
        dosage,
        context,
        timestamp: new Date().toISOString(),
      });
      setAlert(data);
      setMessage(data.hasConflict ? "Safety alert generated from conflicting graph nodes." : "No conflict found in available graph memory.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = alert ?? {
    hasConflict: true,
    reason: "History of gastric or peptic ulcer may increase NSAID-related bleeding risk.",
    conflictingNodes: ["Diagnosis: Gastric ulcer", "Prescription: Pantoprazole 40 mg daily", "Diagnosis: Resolved gastric ulcer symptoms"],
  };

  return (
    <div className="pg">
      <h1 className="h1">Medication Safety Check</h1>
      <p className="sub">
        Check a proposed medication against the patient’s graph memory. <span className="mono">recall()</span> searches allergies, adverse reactions, ulcer history, bleeding risk, and active medications; a safety alert is generated from conflicting graph nodes.
      </p>
      <div className="box" style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>Medication<input className="in" value={medication} onChange={(e) => setMedication(e.target.value)} /></label>
        <label className="field">Dosage<input className="in" value={dosage} onChange={(e) => setDosage(e.target.value)} /></label>
        <label className="field" style={{ flex: 1 }}>Context<input className="in" value={context} onChange={(e) => setContext(e.target.value)} /></label>
        <label className="field">Timestamp<div className="in">{new Date().toISOString().slice(0, 16)}</div></label>
        <button className="btn pri" onClick={() => void run()} disabled={busy}>{busy ? <span className="spin" /> : null} Check safety</button>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="alert">
        <div style={{ fontWeight: 700 }}>{shown.hasConflict ? "⚠ hasConflict: true" : "hasConflict: false"}</div>
        <div><b>Proposed:</b> {medication} {dosage}</div>
        <div><b>Reason:</b> {shown.reason ?? "No conflict found in available graph memory."}</div>
        <div><b>Conflicting nodes:</b></div>
        <div className="row">
          {shown.conflictingNodes.length ? shown.conflictingNodes.map((node) => <span className="node" key={node}>{node}</span>) : <span className="muted">None</span>}
        </div>
      </div>
      <div className="ok"><b>No-conflict state:</b> <span className="muted">“No conflict found in available graph memory.”</span></div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
