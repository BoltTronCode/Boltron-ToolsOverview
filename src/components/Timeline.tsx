import { LANES, PHASES, FEEDBACK_LOOP, DESIGN_GOVERNANCE, type LaneKey } from "../data";

export default function Timeline({ onOpenStage }: { onOpenStage: (id: number) => void }) {
  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Lifecycle Timeline — 360° Map</h1>
        <p className="page-desc">
          The full journey of a device, discipline by discipline — from Altium/TI engineering
          through manufacturing, deployment and warranty. Read left→right for the timeline; read
          top→bottom for who owns each phase. The red lane shows where problems are caught and how
          fixes reconnect to engineering.
        </p>
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
          <div className="swimlane" style={{ gridTemplateColumns: `160px repeat(${PHASES.length}, minmax(150px, 1fr))` }}>
            {/* header row */}
            <div className="sw-corner">Discipline ▸ Phase</div>
            {PHASES.map((p) => (
              <button className="sw-head" key={p.id} onClick={() => onOpenStage(p.id)}>
                <span className="sw-head-icon">{p.icon}</span>
                <span className="sw-head-name">{p.short}</span>
              </button>
            ))}

            {/* lane rows */}
            {LANES.map((lane) => (
              <RowFragment key={lane.key} laneKey={lane.key} laneName={lane.name} laneIcon={lane.icon} color={lane.color} bg={lane.bg} />
            ))}

            {/* output row */}
            <div className="sw-lane" style={{ background: "rgba(79,140,255,0.12)" }}>
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

      {/* Master feedback loop */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Closed-Loop: where bugs go & how fixes come back</h3>
        <p className="section-sub">
          A field or warranty failure never dead-ends — it routes to engineering and redeploys to
          the whole fleet.
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
          <div className="loop-return">⟲ redeploys across the fleet & production line</div>
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

function RowFragment({
  laneKey,
  laneName,
  laneIcon,
  color,
  bg,
}: {
  laneKey: LaneKey;
  laneName: string;
  laneIcon: string;
  color: string;
  bg: string;
}) {
  return (
    <>
      <div className="sw-lane" style={{ background: bg, color }}>
        <span className="sw-lane-icon">{laneIcon}</span>
        <span>{laneName}</span>
      </div>
      {PHASES.map((p) => (
        <div className="sw-cell" key={`${laneKey}-${p.id}`}>
          {p.lanes[laneKey].length === 0 ? (
            <span className="sw-empty">—</span>
          ) : (
            p.lanes[laneKey].map((item) => (
              <span
                className={`sw-chip ${laneKey === "loop" ? "loop-chip" : ""}`}
                key={item}
                style={laneKey === "loop" ? undefined : { borderColor: color }}
              >
                {item}
              </span>
            ))
          )}
        </div>
      ))}
    </>
  );
}
