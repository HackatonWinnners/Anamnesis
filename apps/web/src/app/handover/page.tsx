"use client";

import { useState } from "react";
import { MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine } from "../../components/Primitives";

const handover = [
  ["Patient summary", "2-year history, sleep + iron-deficiency pattern"],
  ["Relevant diagnoses", "Gastric ulcer (resolved) · allergic rhinitis"],
  ["Active medications", "Ferrous sulfate / oral iron"],
  ["Allergies & adverse reactions", "Grass pollen rhinitis; penicillin allergy in seed data"],
  ["Important timeline items", "Ferritin 9→22 ng/mL · ulcer course 2025"],
  ["Graph-derived hypotheses", "Possible iron-deficiency pattern"],
  ["Open plans", "Ferritin re-check · sleep diary · NSAID avoidance"],
  ["Safety concerns", "NSAID/aspirin bleeding risk"],
] as const;

export default function HandoverPage() {
  const [message, setMessage] = useState("Ready to copy or download handover text.");
  const text = handover.map(([k, v]) => `${k}: ${v}`).join("\n");

  async function copy() {
    await navigator.clipboard.writeText(text);
    setMessage("Copied summary to clipboard.");
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "anamnesis-handover-demo-patient-001.txt";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Downloaded handover text.");
  }

  return (
    <div className="pg">
      <h1 className="h1">Doctor Handover</h1>
      <p className="sub">Prepare graph context for specialist referral or care transfer.</p>
      <div className="box">
        <div className="sec">Export content</div>
        {handover.map(([key, value]) => (
          <div className="kv" key={key}><span>{key}</span><span className="muted" style={{ textAlign: "right" }}>{value}</span></div>
        ))}
      </div>
      <div className="box" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <button className="btn pri" onClick={() => void copy()}>Copy summary</button>
        <button className="btn" onClick={download}>Download handover text</button>
        <span style={{ fontSize: 11.5 }}>☑ include graph context</span>
        <span style={{ fontSize: 11.5 }}>☑ include timeline excerpt</span>
      </div>
      <StatusLine status="ok">{message}</StatusLine>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
