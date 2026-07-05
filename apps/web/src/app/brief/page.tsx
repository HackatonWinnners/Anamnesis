"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryResponse } from "../../lib/api";
import type { MedicalEntity } from "@anamnesis/shared";
import { BRIEF_QUERY, DEFAULT_DEMO_PATIENT, MEDICAL_DISCLAIMER } from "../../lib/demo";
import { Disclaimer, StatusLine } from "../../components/Primitives";

export default function BriefPage() {
  const [query, setQuery] = useState(BRIEF_QUERY);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [message, setMessage] = useState("Ready to run recall().");
  const [busy, setBusy] = useState(false);

  async function recall() {
    setBusy(true);
    setMessage("Running recall()...");
    try {
      const data = await getHistory(DEFAULT_DEMO_PATIENT.id, query);
      setHistory(data);
      setMessage(`Recall returned ${data.timeline.length} timeline item(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void recall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = history?.timeline ?? [];
  const byType = (...types: MedicalEntity["type"][]) =>
    timeline.filter((item) => types.includes(item.type));
  // Timeline is stored oldest→newest; take the most recent unique values.
  const recent = (items: MedicalEntity[], n = 3) => {
    const values: string[] = [];
    for (let i = items.length - 1; i >= 0 && values.length < n; i -= 1) {
      if (!values.includes(items[i].value)) values.push(items[i].value);
    }
    return values;
  };
  const join = (items: MedicalEntity[], n = 3, fallback = "—") => {
    const v = recent(items, n);
    return v.length ? v.join(" · ") : fallback;
  };
  const hypotheses = (history?.graph.nodes ?? []).filter((node) => node.type === "Hypothesis");
  const loaded = timeline.length > 0;

  return (
    <div className="pg">
      <h1 className="h1">1-Minute Pre-Session Brief</h1>
      <p className="sub">Understand the patient before entering the room.</p>
      <div className="box" style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>Recall query<input className="in" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <button className="btn pri" onClick={() => void recall()} disabled={busy}>{busy ? <span className="spin" /> : null} Run recall()</button>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="grid2">
        <div className="box"><div className="sec">Current concerns</div><div>{join(byType("SYMPTOM", "COMPLAINT"), 3, "No current symptoms/complaints recorded.")}</div></div>
        <div className="box"><div className="sec">Relevant long-term history</div><div>{join(byType("DIAGNOSIS"), 3, "No diagnoses recorded.")}</div></div>
        <div className="box"><div className="sec">Recent symptoms</div><div>{join(byType("SYMPTOM", "COMPLAINT"), 4, "No symptoms recorded.")}</div></div>
        <div className="box"><div className="sec">Active medications</div><div>{join(byType("MEDICATION", "PRESCRIPTION"), 4, "No medications recorded.")}</div></div>
        <div className="box"><div className="sec">Allergies & adverse reactions</div><div>{join(byType("ALLERGY"), 3, "No allergies recorded.")}</div></div>
        <div className="box"><div className="sec">Open follow-up plans</div><div>{join(byType("PLAN"), 4, "No open plans recorded.")}</div></div>
        <div className="box"><div className="sec">Notable lab results</div><div>{join(byType("LAB_RESULT"), 4, "No lab results recorded.")}</div></div>
        <div className="box"><div className="sec">Hypotheses from improve()</div><div>{hypotheses.length ? hypotheses.map((h) => h.label).join(" · ") : "Run improve() to generate hypotheses."}</div></div>
      </div>
      <div className="box">
        <div className="sec">Recall output</div>
        <div><b>Query:</b> {history?.query ?? query}</div>
        <div><b>Matched entities:</b> {timeline.length}</div>
        <div><b>Graph nodes:</b> {history?.graph.nodes.length ?? 0}</div>
        <div><b>Important risks:</b> {join(byType("ALLERGY"), 2, "none flagged")}{byType("DIAGNOSIS").some((d) => /ulcer/i.test(d.value)) ? " · NSAID/aspirin bleeding risk (ulcer history)" : ""}</div>
        {!loaded ? <div className="muted">No recall data yet — click “Run recall()”.</div> : null}
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
