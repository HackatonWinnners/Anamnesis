"use client";

import { useState } from "react";
import { forgetPatient, type ForgetResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, DEMO_DATASET } from "../../lib/demo";
import { StatusLine } from "../../components/Primitives";

export default function ForgetPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ForgetResponse | null>(null);
  const [message, setMessage] = useState("Deletion is disabled until confirmation is checked.");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirmed) {
      setMessage("Confirm permanent deletion first.");
      return;
    }
    setBusy(true);
    setMessage("Calling forget()...");
    try {
      const data = await forgetPatient(DEFAULT_DEMO_PATIENT.id);
      setResult(data);
      setMessage(`forget() removed dataset ${data.dataset}. Re-run pnpm seed to restore the demo.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pg">
      <h1 className="h1">Right to be Forgotten</h1>
      <p className="sub">Delete a patient’s entire graph memory dataset.</p>
      <div className="alert">
        <div style={{ fontWeight: 700 }}>⚠ Warning</div>
        <div>Deleting patient data removes all sessions, timeline entities, graph nodes, graph edges, hypotheses, and local projection data. This action demonstrates GDPR deletion.</div>
      </div>
      <div className="box">
        <div className="sec">Confirmation</div>
        <div className="grid2">
          <label className="field">Patient ID<div className="in mono">{DEFAULT_DEMO_PATIENT.id}</div></label>
          <label className="field">Dataset name<div className="in mono">{DEMO_DATASET}</div></label>
        </div>
        <label style={{ fontSize: 12 }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I confirm permanent deletion of this patient’s memory dataset.
        </label>
        <div className="mono muted" style={{ fontSize: 11 }}>forget(dataset="{DEMO_DATASET}")</div>
        <button className="btn danger" style={{ alignSelf: "flex-start" }} onClick={() => void run()} disabled={!confirmed || busy}>
          {busy ? <span className="spin" /> : null} Delete patient graph
        </button>
        <StatusLine status={result ? "ok" : undefined}>{message}</StatusLine>
      </div>
      <div className="grid2">
        <div className="ok"><b>Success state:</b> dataset deleted · patient graph empty · timeline empty · recall returns no history.</div>
        <div className="ok"><b>Error state:</b> deletion failed — reason shown (e.g. “Cognee service unreachable”).</div>
      </div>
    </div>
  );
}
