import { DEFAULT_DEMO_PATIENT } from "../../lib/demo";

export default function SeedPage() {
  return (
    <div className="pg">
      <h1 className="h1">Demo Patient Seed Data</h1>
      <p className="sub">Synthetic 2-year medical history used for the demo.</p>
      <div className="box" style={{ flexDirection: "row", gap: 20 }}>
        <span><b>{DEFAULT_DEMO_PATIENT.name}</b></span>
        <span className="mono">{DEFAULT_DEMO_PATIENT.id}</span>
        <span className="chip">consent: true</span>
      </div>
      <div className="box">
        <div className="sec">Seed data summary</div>
        <div className="row">
          {["12 synthetic sessions", "2-year history", "sleep complaints (last year)", "fatigue + low ferritin pattern", "gastric ulcer history", "Aspirin safety conflict", "allergy history", "medication & plan history"].map((item) => (
            <span className="chip" key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="grid2">
        <div className="box">
          <div className="sec">Demo command</div>
          <div className="mono" style={{ background: "#fff", border: "1px solid #000", padding: "8px 10px", borderRadius: 5 }}>pnpm seed</div>
          <div className="sec">Script output</div>
          <div className="kv"><span>Sessions created</span><b>12</b></div>
          <div className="kv"><span>Entities remembered</span><b>30+</b></div>
          <div className="kv"><span>Graph nodes generated</span><b>projection-backed</b></div>
          <div className="kv"><span>Graph edges generated</span><b>projection-backed</b></div>
        </div>
        <div className="box">
          <div className="sec">Demo walkthrough</div>
          {["Load patient dashboard", "Run sleep complaint recall query", "Check Aspirin conflict", "Run improve()", "Inspect hypothesis node", "Forget patient data"].map((step, index) => (
            <div className="step" key={step}><span className="dot">{index + 1}</span>{step}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
