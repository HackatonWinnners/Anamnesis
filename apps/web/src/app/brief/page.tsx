"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryResponse } from "../../lib/api";
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
        <div className="box"><div className="sec">Current concerns</div><div>Fragmented sleep · fatigue (improving) · iron adherence</div></div>
        <div className="box"><div className="sec">Relevant long-term history</div><div>Gastric ulcer (resolved) · iron-deficiency pattern · allergic rhinitis</div></div>
        <div className="box"><div className="sec">Recent symptoms</div><div>{history?.timeline.slice(0, 2).map((i) => i.value).join(" · ") || "3–4 nightly awakenings · daytime tiredness reduced"}</div></div>
        <div className="box"><div className="sec">Active medications</div><div>Ferrous sulfate / oral iron · pantoprazole course completed</div></div>
        <div className="box"><div className="sec">Allergies & adverse reactions</div><div>Allergic rhinitis / grass pollen context · penicillin history in seed data</div></div>
        <div className="box"><div className="sec">Open follow-up plans</div><div>Ferritin re-check · sleep diary · NSAID avoidance</div></div>
        <div className="box"><div className="sec">Notable lab results</div><div>Ferritin 9 → 22 ng/mL in synthetic history</div></div>
        <div className="box"><div className="sec">Hypotheses from improve()</div><div>Possible iron-deficiency pattern (fatigue + low ferritin)</div></div>
      </div>
      <div className="box">
        <div className="sec">Recall output</div>
        <div><b>Summary:</b> Long-standing sleep disruption with improving fatigue on iron repletion; ulcer resolved but NSAID risk persists.</div>
        <div><b>Important risks:</b> NSAID/aspirin bleeding risk (ulcer history).</div>
        <div><b>Unresolved issues:</b> cause of sleep fragmentation not established.</div>
        <div><b>Topics to review:</b> sleep diary · iron adherence · ferritin re-check scheduling.</div>
      </div>
      <Disclaimer text={MEDICAL_DISCLAIMER} />
    </div>
  );
}
