"use client";

import { useState } from "react";
import { checkConflict, type SafetyAlert } from "../../lib/api";
import { MEDICAL_DISCLAIMER } from "../../lib/patientData";
import { useActivePatient } from "../../lib/activePatient";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function SafetyPage() {
  const { activePatient } = useActivePatient();
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [context, setContext] = useState("");
  const [alert, setAlert] = useState<SafetyAlert | null>(null);
  const [message, setMessage] = useState("Ready to check proposed medication against graph memory.");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!medication.trim()) {
      setMessage("Enter a proposed medication before checking safety.");
      return;
    }
    setBusy(true);
    setAlert(null);
    setMessage("Checking documented allergies/adverse reactions and known graph-based risk rules...");
    try {
      const data = await checkConflict(activePatient.id, {
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

  return (
    <div className="pg">
      <h1 className="h1">Medication Safety Check</h1>
      <div className="mono muted" style={{ fontSize: 11 }}>patient: {activePatient.name} · {activePatient.id}</div>
      <p className="sub">
        Check a proposed medication against the patient’s graph memory. This system currently checks documented medication allergies/adverse reactions and a rule-based NSAID/aspirin risk against ulcer history.
      </p>
      <div className="box" style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>Medication<input className="in" value={medication} placeholder="e.g. Aspirin" onChange={(e) => setMedication(e.target.value)} /></label>
        <label className="field">Dosage<input className="in" value={dosage} placeholder="e.g. 500 mg" onChange={(e) => setDosage(e.target.value)} /></label>
        <label className="field" style={{ flex: 1 }}>Context<input className="in" value={context} placeholder="e.g. headache, fever, pain" onChange={(e) => setContext(e.target.value)} /></label>
        <label className="field">Timestamp<div className="in">{new Date().toISOString().slice(0, 16)}</div></label>
        <button className="btn pri" onClick={() => void run()} disabled={busy || !medication.trim()}>{busy ? <span className="spin" /> : null} Check safety</button>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="alert">
        <div style={{ fontWeight: 700 }}>{alert ? (alert.hasConflict ? "⚠ hasConflict: true" : "hasConflict: false") : "No safety check run yet"}</div>
        <div><b>Proposed:</b> {medication} {dosage}</div>
        <div><b>Reason:</b> {alert?.reason ?? (alert ? "No conflict found in available graph memory." : "Enter a medication and click Check safety.")}</div>
        <div><b>Conflicting nodes:</b></div>
        <div className="row">
          {alert?.conflictingNodes.length ? alert.conflictingNodes.map((node) => <span className="node" key={node}>{node}</span>) : <span className="muted">None</span>}
        </div>
      </div>
      <div className="ok"><b>Scope:</b> <span className="muted">This graph-memory check is not a complete drug interaction database.</span></div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
