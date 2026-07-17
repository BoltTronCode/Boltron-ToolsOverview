import { useMemo, useState } from "react";
import { allTools, STAGES, TOOL_TYPE_META, type ToolType } from "../data";

const FILTERS: ("All" | ToolType)[] = ["All", "Hardware", "Firmware", "Software"];

export default function ToolCatalog() {
  const [filter, setFilter] = useState<"All" | ToolType>("All");
  const [phase, setPhase] = useState<number | "All">("All");
  const [query, setQuery] = useState("");
  const tools = useMemo(() => allTools(), []);

  const filtered = tools.filter((t) => {
    const matchType = filter === "All" || t.type === filter;
    const matchPhase = phase === "All" || t.stageId === phase;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q) ||
      t.stage.toLowerCase().includes(q);
    return matchType && matchPhase && matchQuery;
  });

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Tool Catalog</h1>
        <p className="page-desc">
          Every hardware jig, firmware image and software application used across the lifecycle —
          filter by type or lifecycle phase to see exactly which tools each stage needs.
        </p>
      </div>

      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "All" ? "All Types" : `${TOOL_TYPE_META[f].icon} ${f}`}
          </button>
        ))}
        <input
          className="search"
          placeholder="Search tools, purpose or stage…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="phase-filter">
        <button
          className={`phase-chip ${phase === "All" ? "active" : ""}`}
          onClick={() => setPhase("All")}
        >
          All Phases
        </button>
        {STAGES.map((s) => (
          <button
            key={s.id}
            className={`phase-chip ${phase === s.id ? "active" : ""}`}
            onClick={() => setPhase(s.id)}
          >
            {s.icon} {s.id}. {s.name}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Type</th>
              <th>Lifecycle Stage</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={`${t.stageId}-${t.name}`}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>
                  <span className={`badge ${t.type}`}>
                    {TOOL_TYPE_META[t.type].icon} {t.type}
                  </span>
                </td>
                <td style={{ color: "var(--text-dim)" }}>
                  {t.stageId}. {t.stage}
                </td>
                <td className="td-purpose">{t.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">No tools match your filters.</div>}
      </div>
      <p className="section-sub" style={{ marginTop: 12 }}>
        Showing {filtered.length} of {tools.length} tools.
      </p>
    </div>
  );
}
