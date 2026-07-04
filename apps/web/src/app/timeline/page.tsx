"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryResponse } from "../../lib/api";
import { DEFAULT_DEMO_PATIENT, DEMO_QUERY, demoTimelineRows } from "../../lib/demo";
import { StatusLine, Tag, TimelineTable } from "../../components/Primitives";

export default function TimelinePage() {
  const [query, setQuery] = useState(DEMO_QUERY);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [message, setMessage] = useState("Loading recall query...");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setMessage("Running recall()...");
    try {
      const data = await getHistory(DEFAULT_DEMO_PATIENT.id, query);
      setHistory(data);
      setMessage(`Loaded ${data.timeline.length} matching item(s), ${data.graph.nodes.length} related graph node(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pg">
      <h1 className="h1">Patient Timeline</h1>
      <div className="box" style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>Recall query<input className="in" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <label className="field">Entity type<div className="in">All types ▾</div></label>
        <label className="field">Date range<div className="in">Last 12 months ▾</div></label>
        <label className="field">Session<div className="in">Any ▾</div></label>
        <button className="btn pri" onClick={() => void load()} disabled={busy}>{busy ? <span className="spin" /> : null} Recall</button>
      </div>
      <div className="box" style={{ flexDirection: "row", gap: 20, fontSize: 11.5 }}>
        <span><b>{history?.timeline.length ?? 7}</b> matching items</span>
        <span className="muted">query: “sleep-related complaints, last year”</span>
        <span className="muted">sessions: #6 #8 #9 #11 #12</span>
        <span className="muted">related graph nodes: {history?.graph.nodes.length ?? 14}</span>
      </div>
      <StatusLine>{message}</StatusLine>
      <div className="sec">Live timeline</div>
      <TimelineTable history={history} />
      <div className="sec">Wireframe clinical timeline</div>
      <table className="tbl"><tbody>
        <tr><th>Date</th><th>Session summary</th><th>Type</th><th>Value</th><th>Clinical context</th><th>Graph nodes</th></tr>
        {demoTimelineRows.map(([date, summary, type, value, context, nodes]) => (
          <tr key={`${date}-${value}`}><td>{date}</td><td>{summary}</td><td><Tag>{type}</Tag></td><td>{value}</td><td>{context}</td><td className="mono">{nodes}</td></tr>
        ))}
      </tbody></table>
    </div>
  );
}
