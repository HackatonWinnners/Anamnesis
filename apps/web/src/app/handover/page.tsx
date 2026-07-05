"use client";

import { useState } from "react";
import type { MedicalEntity } from "@anamnesis/shared";
import { getHistory, type HistoryResponse } from "../../lib/api";
import { BRIEF_QUERY, MEDICAL_DISCLAIMER } from "../../lib/patientData";
import { useActivePatient } from "../../lib/activePatient";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function HandoverPage() {
  const { activePatient } = useActivePatient();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [message, setMessage] = useState("Load recall data to prepare a handover.");
  const [busy, setBusy] = useState(false);

  const timeline = history?.timeline ?? [];
  const byType = (...types: MedicalEntity["type"][]) => timeline.filter((item) => types.includes(item.type));
  const join = (items: MedicalEntity[], fallback = "—") => {
    const values = [...items].reverse().map((item) => item.value);
    return values.length ? Array.from(new Set(values)).slice(0, 5).join(" · ") : fallback;
  };
  const hypotheses = history?.graph.nodes.filter((node) => node.type === "Hypothesis").map((node) => node.label) ?? [];
  const handover = [
    ["Patient", `${activePatient.name} (${activePatient.id})`],
    ["Recall query", history?.query ?? BRIEF_QUERY],
    ["Current concerns", join(byType("SYMPTOM", "COMPLAINT"))],
    ["Relevant diagnoses", join(byType("DIAGNOSIS"))],
    ["Active medications", join(byType("MEDICATION", "PRESCRIPTION"))],
    ["Allergies & adverse reactions", join(byType("ALLERGY"))],
    ["Important lab results", join(byType("LAB_RESULT"))],
    ["Graph-derived hypotheses", hypotheses.length ? hypotheses.join(" · ") : "—"],
    ["Open plans", join(byType("PLAN"))],
  ] as const;
  const text = handover.map(([k, v]) => `${k}: ${v}`).join("\n");

  async function load() {
    setBusy(true);
    setMessage("Running recall() for handover...");
    try {
      const data = await getHistory(activePatient.id, BRIEF_QUERY);
      setHistory(data);
      setMessage(`Loaded ${data.timeline.length} timeline item(s) for handover.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!history) return;
    await navigator.clipboard.writeText(text);
    setMessage("Copied summary to clipboard.");
  }

  function download() {
    if (!history) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `anamnesis-handover-${activePatient.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Downloaded handover text.");
  }

  return (
    <div className="pg">
      <h1 className="h1">Doctor Handover</h1>
      <p className="sub">Prepare graph context for specialist referral or care transfer.</p>
      <div className="box" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <button className="btn pri" onClick={() => void load()} disabled={busy}>{busy ? <span className="spin" /> : null} Load handover context</button>
        <span className="mono muted" style={{ fontSize: 11 }}>input: patient {activePatient.id}</span>
      </div>
      <div className="box">
        <div className="sec">Export content</div>
        {history ? (
          handover.map(([key, value]) => (
            <div className="kv" key={key}><span>{key}</span><span className="muted" style={{ textAlign: "right" }}>{value}</span></div>
          ))
        ) : (
          <span className="muted">No handover context loaded yet.</span>
        )}
      </div>
      <div className="box" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <button className="btn pri" onClick={() => void copy()} disabled={!history}>Copy summary</button>
        <button className="btn" onClick={download} disabled={!history}>Download handover text</button>
        <span style={{ fontSize: 11.5 }}>☑ include graph context</span>
        <span style={{ fontSize: 11.5 }}>☑ include timeline excerpt</span>
      </div>
      <StatusLine status="ok">{message}</StatusLine>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
