import {
  FLEET_KPIS,
  BOARD_KPIS,
  DEVICE_CATEGORIES,
  STAGES,
  TOOL_TYPE_META,
  toolTypeCounts,
  type ToolType,
} from "../data";

const BOARD_GROUPS = [
  { key: "Cost", icon: "💰", desc: "What the fleet costs to run and support." },
  { key: "Reliability", icon: "🛡️", desc: "How dependable the installed base is." },
  { key: "Efficiency", icon: "⚡", desc: "How well the platform prevents cost & downtime." },
] as const;

function healthColor(h: number): string {
  if (h >= 95) return "var(--good)";
  if (h >= 92) return "var(--warn)";
  return "var(--bad)";
}

export default function Overview({ onOpenStage }: { onOpenStage: (id: number) => void }) {
  const counts = toolTypeCounts();
  const totalTools = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCat = Math.max(...DEVICE_CATEGORIES.map((c) => c.count));

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Executive Overview</h1>
        <p className="page-desc">
          End-to-end visibility across the device lifecycle — from product design to warranty
          closure. Every device carries a digital passport built from the tools, firmware and
          software below.
        </p>
      </div>

      <div className="kpi-grid">
        {FLEET_KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className={`kpi-delta ${k.positive ? "up" : "down"}`}>
              {k.delta} vs last quarter
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3 className="section-title">Fleet Performance & Cost Scorecard</h3>
        <p className="section-sub">
          The critical numbers at a glance — cost, reliability and efficiency of the whole fleet.
          Deltas are vs last quarter. Values are illustrative demo data (INR).
        </p>
        {BOARD_GROUPS.map((g) => (
          <div className="board-group" key={g.key}>
            <div className="board-group-head">
              <span className="board-group-icon">{g.icon}</span>
              <span className="board-group-name">{g.key}</span>
              <span className="board-group-desc">{g.desc}</span>
            </div>
            <div className="board-grid">
              {BOARD_KPIS.filter((k) => k.group === g.key).map((k) => (
                <div className="board-kpi" key={k.label}>
                  <div className="board-kpi-label">{k.label}</div>
                  <div className="board-kpi-value">{k.value}</div>
                  <div className="board-kpi-sub">{k.sub}</div>
                  <div className={`kpi-delta ${k.positive ? "up" : "down"}`}>{k.delta}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3 className="section-title">Device Lifecycle</h3>
        <p className="section-sub">Nine connected stages — click any stage to inspect its tooling.</p>
        <div className="flow">
          {STAGES.map((s) => (
            <div className="flow-step" key={s.id} onClick={() => onOpenStage(s.id)}>
              <div className="flow-connector" />
              <div className="flow-node">{s.icon}</div>
              <div className="flow-num">STAGE {s.id}</div>
              <div className="flow-name">{s.name}</div>
              <div className="flow-output">→ {s.output}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Tooling by Type</h3>
          <p className="section-sub">
            {totalTools} tools across the lifecycle, categorized for capital and vendor planning.
          </p>
          {(Object.keys(TOOL_TYPE_META) as ToolType[]).map((t) => {
            const meta = TOOL_TYPE_META[t];
            const pct = Math.round((counts[t] / totalTools) * 100);
            return (
              <div className="type-row" key={t}>
                <div className="type-icon" style={{ background: meta.bg }}>
                  {meta.icon}
                </div>
                <div className="type-meta">
                  <div className="type-name">
                    <span>{t}</span>
                    <span style={{ color: "var(--text-dim)" }}>
                      {counts[t]} tools · {pct}%
                    </span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3 className="section-title">Fleet by Device Class</h3>
          <p className="section-sub">Installed base and health score per hardware category.</p>
          {DEVICE_CATEGORIES.map((c) => (
            <div className="cat-row" key={c.name}>
              <div>
                <div className="cat-name">{c.name}</div>
                <div className="cat-count">{c.count.toLocaleString()} devices</div>
                <div className="bar" style={{ width: 160 }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.round((c.count / maxCat) * 100)}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
              <div
                className="health-pill"
                style={{ color: healthColor(c.health), background: "var(--bg-card-2)" }}
              >
                {c.health}% healthy
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
