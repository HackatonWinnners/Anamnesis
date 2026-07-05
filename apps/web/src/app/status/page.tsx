"use client";

import { useEffect, useState } from "react";
import { API_BASE, getHealth, type HealthResponse } from "../../lib/api";
import { datasetForPatient, useActivePatient } from "../../lib/activePatient";
import { StatusLine } from "../../components/Primitives";

export default function StatusPage() {
  const { activePatient } = useActivePatient();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [message, setMessage] = useState("Loading health checks...");

  useEffect(() => {
    getHealth()
      .then((data) => {
        setHealth(data);
        setMessage("Health check loaded.");
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : String(err)));
  }, []);

  const tx = health?.cognee.transcription;

  return (
    <div className="pg">
      <h1 className="h1">System Status</h1>
      <div className="grid2">
        <div className="box">
          <div className="sec">stable-ts transcription</div>
          <div className="kv"><span>Provider</span><b className="mono">{tx?.provider ?? "stable-ts"}</b></div>
          <div className="kv"><span>Model</span><b className="mono">{tx?.model ?? "—"}</b></div>
          <div className="kv"><span>ffmpeg</span><b>{tx?.missing?.includes("ffmpeg") ? "missing" : tx ? "available" : "—"}</b></div>
          <div className="kv"><span>torch</span><b>{tx?.available ? "available" : "—"}</b></div>
          <div className="kv"><span>stable_whisper</span><b>{tx?.missing?.includes("stable_whisper") ? "missing" : tx ? "available" : "—"}</b></div>
          <div className="kv"><span>Download root</span><span className="mono">{tx?.downloadRoot ?? "stable-ts default"}</span></div>
        </div>
        <div className="box">
          <div className="sec">Cognee memory service</div>
          <div className="kv"><span>Cognee available</span><b>{health?.cognee.cogneeAvailable ? "yes" : "no"}</b></div>
          <div className="kv"><span>Active dataset</span><span className="mono">{datasetForPatient(activePatient.id)}</span></div>
          <div className="kv"><span>Fallback projection</span><b>{health?.cognee.cogneeAvailable ? "standby" : "active"}</b></div>
          <div className="sec" style={{ marginTop: 8 }}>Other services</div>
          <div className="kv"><span>LLM extraction</span><b>checked during audio processing</b></div>
          <div className="kv"><span>Hono API gateway</span><b>{health?.ok ? "running" : "unknown"}</b></div>
          <div className="kv"><span>Next.js web app</span><b>running</b></div>
        </div>
      </div>
      <div className="box">
        <div className="sec">Environment variables</div>
        <table className="tbl"><tbody>
          <tr><th>Variable</th><th>Status</th></tr>
          <tr><td className="mono">LLM credentials</td><td>server-side required for audio session processing</td></tr>
          <tr><td className="mono">COGNEE_SERVICE_URL</td><td className="mono">configured server-side</td></tr>
          <tr><td className="mono">NEXT_PUBLIC_API_BASE_URL</td><td className="mono">{API_BASE || "same-origin /api"}</td></tr>
          <tr><td className="mono">LLM_MODEL</td><td className="mono">{"configured server-side"}</td></tr>
          <tr><td className="mono">STABLE_TS_MODEL</td><td className="mono">{tx?.model ?? "base"}</td></tr>
          <tr><td className="mono">STABLE_TS_DEVICE</td><td className="mono">{tx?.device ?? "auto"}</td></tr>
        </tbody></table>
      </div>
      <div className="box">
        <div className="sec">Health check output</div>
        <div className="kv"><span>Service status</span><b>{health?.ok && health.cognee.ok ? "all healthy" : "loading / partial"}</b></div>
        <div className="kv"><span>Warnings</span><span className="muted">{health?.cognee.warning ?? "0"}</span></div>
        <div className="kv"><span>Errors</span><span className="muted">{health?.cognee.error ?? "0"}</span></div>
      </div>
      <StatusLine>{message}</StatusLine>
    </div>
  );
}
