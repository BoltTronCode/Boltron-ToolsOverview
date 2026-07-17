import {
  LANES,
  PHASES,
  FEEDBACK_LOOP,
  DESIGN_GOVERNANCE,
  DECISIONS,
  JIRA_ISSUE_TYPES,
  RELEASE_PLAN,
  DEVICE_COMM,
  DOCUMENTATION,
  FIELD_MATRIX,
  type LaneKey,
  type LaneItem,
} from "../data";

export default function Timeline({ onOpenStage }: { onOpenStage: (id: number) => void }) {
  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Lifecycle Timeline — 360° Map</h1>
        <p className="page-desc">
          The full journey of a device, discipline by discipline — from Altium/VS Code engineering
          through manufacturing, deployment, warranty and customer integration. Read left→right for
          the timeline; top→bottom for who owns each phase. The red lane shows where problems are
          caught and how fixes reconnect to engineering.
        </p>
      </div>

      {/* Legend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="legend">
          {LANES.map((l) => (
            <span className="legend-item" key={l.key}>
              <span className="legend-swatch" style={{ background: l.bg, borderColor: l.color }} />
              {l.icon} {l.name}
            </span>
          ))}
          <span className="legend-item">
            <span className="legend-swatch red" /> RED = needs your confirmation
          </span>
          <span className="legend-item">◇ dashed = cross-cutting (software-company) layer</span>
        </div>
      </div>

      {/* Phase ribbon */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="ribbon">
          {PHASES.map((p, i) => (
            <div className="ribbon-step" key={p.id} onClick={() => onOpenStage(p.id)}>
              <div className="ribbon-connector" />
              <div className="ribbon-node">{p.icon}</div>
              <div className="ribbon-num">PHASE {p.id}</div>
              <div className="ribbon-name">{p.short}</div>
              {i === 0 && <div className="ribbon-start">START</div>}
              {p.toConfirm && <div className="head-tag red">CONFIRM</div>}
              {p.crossCutting && !p.toConfirm && <div className="head-tag cross">CROSS-CUT</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Swimlane matrix */}
      <div className="card swimlane-card">
        <h3 className="section-title">Swimlane Map</h3>
        <p className="section-sub">
          Each cell shows the tools, artifacts and loops active in that phase for that discipline.
          Click a phase header for full detail.
        </p>
        <div className="swimlane-scroll">
          <div
            className="swimlane"
            style={{ gridTemplateColumns: `150px repeat(${PHASES.length}, minmax(150px, 1fr))` }}
          >
            <div className="sw-corner">Discipline ▸ Phase</div>
            {PHASES.map((p) => (
              <button
                className={`sw-head ${p.toConfirm ? "red" : p.crossCutting ? "cross" : ""}`}
                key={p.id}
                onClick={() => onOpenStage(p.id)}
              >
                <span className="sw-head-icon">{p.icon}</span>
                <span className="sw-head-name">{p.short}</span>
                {p.toConfirm && <span className="head-tag red">CONFIRM</span>}
                {p.crossCutting && !p.toConfirm && <span className="head-tag cross">CROSS-CUT</span>}
              </button>
            ))}

            {LANES.map((lane) => (
              <LaneRow key={lane.key} laneKey={lane.key} name={lane.name} icon={lane.icon} color={lane.color} bg={lane.bg} />
            ))}

            <div className="sw-lane" style={{ background: "rgba(37,99,235,0.10)" }}>
              <span className="sw-lane-icon">📄</span>
              <span>Output</span>
            </div>
            {PHASES.map((p) => (
              <div className="sw-cell output-cell" key={`out-${p.id}`}>
                <span className="sw-chip strong">{p.output}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RED decisions */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Decisions that need your confirmation (RED)</h3>
        <div className="decision-banner">🔴 These are proposals — please confirm or adjust before we lock them in.</div>
        <div className="two-col">
          {DECISIONS.map((d) => (
            <div className="decision-card" key={d.id}>
              <div className="decision-head">
                <span className="decision-badge">TO CONFIRM</span>
                <span className="decision-title">{d.title}</span>
              </div>
              <div className="decision-q">{d.question}</div>
              <div className="decision-opts">
                {d.options.map((o) => (
                  <div className={`decision-opt ${o.recommended ? "recommended" : ""}`} key={o.name}>
                    <div className="decision-opt-name">
                      {o.name}
                      {o.recommended && <span className="rec-pill">PICK</span>}
                    </div>
                    <div className="decision-opt-note">{o.note}</div>
                  </div>
                ))}
              </div>
              <div className="decision-rec">💡 {d.recommendation}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Master feedback loop */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Closed-Loop: where bugs go & how fixes come back</h3>
        <p className="section-sub">
          A field, warranty or customer failure never dead-ends — every issue is typed in Jira,
          fixed, validated, and redeployed to the whole fleet + SDK.
        </p>
        <div className="loop">
          {FEEDBACK_LOOP.map((s, i) => (
            <div className="loop-step" key={s.title}>
              <div className="loop-node">{s.icon}</div>
              <div className="loop-title">{s.title}</div>
              <div className="loop-detail">{s.detail}</div>
              {i < FEEDBACK_LOOP.length - 1 && <div className="loop-arrow">→</div>}
            </div>
          ))}
          <div className="loop-return">⟲ redeploys across the fleet, production line & SDK release</div>
        </div>
      </div>

      {/* Jira */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">📋 Issue Tracking & Release Planning (Jira)</h3>
        <p className="section-sub">
          Every hardware, firmware and software problem is a typed Jira issue — triaged into a
          release and traced back onto every affected device.
        </p>
        <div className="jira-grid">
          {JIRA_ISSUE_TYPES.map((j) => (
            <div className="jira-type" key={j.tag}>
              <span className="jira-tag" style={{ background: j.color }}>{j.tag}</span>
              <div>
                <div className="jira-name">{j.name}</div>
                <div className="jira-source">from {j.source}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="decision-rec" style={{ borderLeftColor: "var(--accent)" }}>🗺️ {RELEASE_PLAN}</div>
      </div>

      {/* Device comm status */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">📡 Operations: Device Communication Status</h3>
        <p className="section-sub">
          How we know which devices need a handheld (HHD) field visit — and which tool to send.
          Counts are illustrative demo data.
        </p>
        <div className="comm-grid">
          {DEVICE_COMM.map((c) => (
            <div className="comm-card" key={c.status} style={{ borderTopColor: c.color }}>
              <div className="comm-status" style={{ color: c.color }}>{c.status}</div>
              <div className="comm-count" style={{ color: c.color }}>{c.count}</div>
              <div className="comm-how">{c.how}</div>
              <div className="comm-tool">🧰 {c.tool}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What runs where */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">🛰️ What runs where — devices & tools per phase</h3>
        <p className="section-sub">
          The concrete answer to "which device types and which tools are needed" at each phase.
        </p>
        <div className="matrix">
          <div className="matrix-head">
            <span>Phase</span>
            <span>Device type(s) in scope</span>
            <span>Tools / handhelds required</span>
          </div>
          {FIELD_MATRIX.map((m) => (
            <div className="matrix-row" key={m.phase}>
              <span className="matrix-phase">{m.icon} {m.phase}</span>
              <span>{m.devices}</span>
              <span className="matrix-tools">{m.tools}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation */}
      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="card">
          <h3 className="section-title">📘 Internal Documentation</h3>
          <p className="section-sub">Engineering-only — lives in the secure vault.</p>
          <div className="pill-grid">
            {DOCUMENTATION.internal.map((d) => (
              <span className="pill" key={d}>🔒 {d}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">📗 External Documentation</h3>
          <p className="section-sub">Customer-facing — shipped with the product / SDK.</p>
          <div className="pill-grid">
            {DOCUMENTATION.external.map((d) => (
              <span className="pill" key={d}>🌐 {d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Design governance */}
      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="card">
          <h3 className="section-title">🔐 Secure Design Storage</h3>
          <p className="section-sub">Where design data lives and how it's protected.</p>
          <ul className="gov-list">
            {DESIGN_GOVERNANCE.storage.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="section-title">📦 Delivery, Proto & Queries</h3>
          <p className="section-sub">How the delivery/NPI team consumes design data.</p>
          <ul className="gov-list">
            {DESIGN_GOVERNANCE.delivery.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LaneRow({
  laneKey,
  name,
  icon,
  color,
  bg,
}: {
  laneKey: LaneKey;
  name: string;
  icon: string;
  color: string;
  bg: string;
}) {
  return (
    <>
      <div className="sw-lane" style={{ background: bg, color }}>
        <span className="sw-lane-icon">{icon}</span>
        <span>{name}</span>
      </div>
      {PHASES.map((p) => (
        <div className="sw-cell" key={`${laneKey}-${p.id}`}>
          {p.lanes[laneKey].length === 0 ? (
            <span className="sw-empty">—</span>
          ) : (
            p.lanes[laneKey].map((item: LaneItem) => (
              <span
                className={`sw-chip ${item.red ? "red" : laneKey === "loop" ? "loop-chip" : ""}`}
                key={item.label}
                style={item.red || laneKey === "loop" ? undefined : { borderColor: color }}
              >
                {item.label}
              </span>
            ))
          )}
        </div>
      ))}
    </>
  );
}
