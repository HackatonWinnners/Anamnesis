"use client";

import { useState } from "react";
import { runImprove, type ImproveResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function ImprovePage() {
  const [result, setResult] = useState<ImproveResponse | null>(null);
  const [message, setMessage] = useState("Ready to run improve().");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMessage("Running Cognee improve()/memify()...");
    try {
      const data = await runImprove(DEFAULT_DEMO_PATIENT.id);
      setResult(data);
      setMessage(`Generated/updated ${data.hypotheses.length} hypothesis node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const hypothesis = result?.hypotheses[0];

  return (
    <div className="pg">
      <h1 className="h1">Medical Intuition</h1>
      <p className="sub">
        Cognee <span className="mono">improve() / memify()</span> connects facts over time into longitudinal hypotheses.
      </p>
      <div className="box" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <button className="btn pri" onClick={() => void run()} disabled={busy}>{busy ? <span className="spin" /> : null} Run improve()</button>
        <div className="mono muted" style={{ fontSize: 11 }}>input: patient {DEFAULT_DEMO_PATIENT.id} · existing patient graph</div>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="box">
        <div className="sec">Generated hypothesis</div>
        <div className="row" style={{ alignItems: "center" }}>
          <span className="node hyp">{hypothesis?.label ?? "Possible iron-deficiency pattern"}</span>
          <span className="chip">hypothesis node</span>
        </div>
        <div><b>Explanation:</b> {hypothesis?.context ?? "Recurring fatigue plus later low ferritin may represent one longitudinal pattern."}</div>
        <div><b>Supporting evidence:</b></div>
        <div className="row">
          {["Fatigue", "Low ferritin 9 ng/mL", "Ferritin improved to 22 ng/mL", "Fatigue improved"].map((item) => <span className="node" key={item}>{item}</span>)}
        </div>
        <div><b>Linked timeline items:</b> <span className="mono muted">2026-02-11 · 2026-04-30 · 2026-01-08</span></div>
      </div>
      <div className="ok">Note: hypotheses are documentation aids, not diagnoses.</div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
