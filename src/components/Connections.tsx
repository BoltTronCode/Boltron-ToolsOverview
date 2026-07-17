import { STAGES, PHASES, CENTRAL_PLATFORM, FEEDBACK_EDGES, JIRA_LINKS } from "../data";

const SHORT: Record<number, string> = Object.fromEntries(PHASES.map((p) => [p.id, p.short]));

const W = 1000;
const H = 680;
const CX = 500;
const CY = 300;
const RX = 360;
const RY = 210;

function nodePositions() {
  const n = STAGES.length;
  const pos: Record<string, { x: number; y: number; icon: string; short: string; id: number; red?: boolean }> = {};
  STAGES.forEach((s, i) => {
    const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
    pos[s.key] = {
      x: CX + RX * Math.cos(angle),
      y: CY + RY * Math.sin(angle),
      icon: s.icon,
      short: SHORT[s.id] ?? s.name,
      id: s.id,
      red: s.toConfirm,
    };
  });
  return pos;
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const nx = -dy;
  const ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const cxp = mx + (nx / len) * bend;
  const cyp = my + (ny / len) * bend;
  return `M ${a.x} ${a.y} Q ${cxp} ${cyp} ${b.x} ${b.y}`;
}

export default function Connections({ onOpenStage }: { onOpenStage: (id: number) => void }) {
  const pos = nodePositions();
  const jira = { x: CX, y: CY + 170 };

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Connections Graph</h1>
        <p className="page-desc">
          Every stage feeds the central platform (blue). Failures loop back to engineering (red).
          Jira threads issues across design, manufacturing, service, warranty, integration and
          support. Click any node to open its detail.
        </p>
      </div>

      <div className="card">
        <div className="graph-wrap">
          <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Lifecycle connections graph">
            <defs>
              <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#2563eb" />
              </marker>
              <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#dc2626" />
              </marker>
              <radialGradient id="hub-grad" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#0891b2" />
              </radialGradient>
            </defs>

            {/* feed edges: stage -> platform */}
            {STAGES.map((s) => {
              const p = pos[s.key];
              return (
                <line
                  key={`feed-${s.key}`}
                  x1={p.x}
                  y1={p.y}
                  x2={CX}
                  y2={CY}
                  stroke="#2563eb"
                  strokeWidth={1.6}
                  strokeOpacity={0.28}
                />
              );
            })}

            {/* feedback edges (red) */}
            {FEEDBACK_EDGES.map(([from, to], i) => (
              <path
                key={`fb-${from}-${to}`}
                d={curve(pos[from], pos[to], 60 + (i % 3) * 22)}
                fill="none"
                stroke="#dc2626"
                strokeWidth={2}
                strokeOpacity={0.7}
                markerEnd="url(#arrow-red)"
              />
            ))}

            {/* jira dashed links */}
            {JIRA_LINKS.map((k) => (
              <line
                key={`jira-${k}`}
                x1={jira.x}
                y1={jira.y}
                x2={pos[k].x}
                y2={pos[k].y}
                stroke="#d97706"
                strokeWidth={1.4}
                strokeDasharray="5 5"
                strokeOpacity={0.55}
              />
            ))}

            {/* central hub */}
            <circle cx={CX} cy={CY} r={58} fill="url(#hub-grad)" />
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fill="#fff">🛰️</text>
            <text x={CX} y={CY + 18} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
              Central
            </text>
            <text x={CX} y={CY + 32} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
              Platform
            </text>

            {/* jira node */}
            <g style={{ cursor: "default" }}>
              <circle cx={jira.x} cy={jira.y} r={30} fill="#fff" stroke="#d97706" strokeWidth={2} />
              <text x={jira.x} y={jira.y + 1} textAnchor="middle" fontSize="18">📋</text>
              <text x={jira.x} y={jira.y + 46} textAnchor="middle" className="graph-node-label">
                Jira
              </text>
            </g>

            {/* stage nodes */}
            {STAGES.map((s) => {
              const p = pos[s.key];
              return (
                <g key={s.key} style={{ cursor: "pointer" }} onClick={() => onOpenStage(s.id)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={34}
                    fill="#fff"
                    stroke={p.red ? "#dc2626" : "#2563eb"}
                    strokeWidth={p.red ? 2.5 : 2}
                    strokeDasharray={p.red ? "5 4" : undefined}
                  />
                  <text x={p.x} y={p.y + 2} textAnchor="middle" fontSize="20">{p.icon}</text>
                  <text x={p.x} y={p.y + 50} textAnchor="middle" className="graph-node-label">
                    {p.id}. {p.short}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="graph-legend">
          <span className="legend-item">
            <span className="line" style={{ borderTopColor: "#2563eb" }} /> Data feed → platform
          </span>
          <span className="legend-item">
            <span className="line" style={{ borderTopColor: "#dc2626" }} /> Feedback / fix loop
          </span>
          <span className="legend-item">
            <span className="line" style={{ borderTopColor: "#d97706", borderTopStyle: "dashed" }} /> Jira issue threading
          </span>
          <span className="legend-item">◇ dashed red node = needs confirmation</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">What the platform ties together</h3>
        <p className="section-sub">Every lifecycle event lands in one system of record.</p>
        <div className="two-col">
          <div>
            <div className="section-sub" style={{ fontWeight: 700 }}>🗄️ Stores</div>
            <div className="pill-grid">
              {CENTRAL_PLATFORM.stores.map((s) => (
                <span className="pill" key={s}>📦 {s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="section-sub" style={{ fontWeight: 700 }}>✨ Provides</div>
            <div className="pill-grid">
              {CENTRAL_PLATFORM.provides.map((s) => (
                <span className="pill" key={s}>⭐ {s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
