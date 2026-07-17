import { useState } from "react";
import Overview from "./components/Overview";
import Timeline from "./components/Timeline";
import Connections from "./components/Connections";
import Stages from "./components/Stages";
import ToolCatalog from "./components/ToolCatalog";
import Platform from "./components/Platform";
import StageDrawer from "./components/StageDrawer";

type View = "overview" | "timeline" | "connections" | "stages" | "catalog" | "platform";

const NAV: { key: View; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📈" },
  { key: "timeline", label: "Lifecycle Timeline", icon: "🗺️" },
  { key: "connections", label: "Connections Graph", icon: "🕸️" },
  { key: "stages", label: "Lifecycle Stages", icon: "🔄" },
  { key: "catalog", label: "Tool Catalog", icon: "🧰" },
  { key: "platform", label: "Central Platform", icon: "🛰️" },
];

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [openStage, setOpenStage] = useState<number | null>(null);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-logo">⚡</div>
          <div>
            <div className="brand-name">Boltron</div>
            <div className="brand-sub">Lifecycle Assurance</div>
          </div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item ${view === n.key ? "active" : ""}`}
            onClick={() => setView(n.key)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="sidebar-footer">
          Device Lifecycle Assurance Platform
          <br />
          Design → Warranty
        </div>
      </nav>

      <main className="main">
        {view === "overview" && <Overview onOpenStage={setOpenStage} />}
        {view === "timeline" && <Timeline onOpenStage={setOpenStage} />}
        {view === "connections" && <Connections onOpenStage={setOpenStage} />}
        {view === "stages" && <Stages onOpenStage={setOpenStage} />}
        {view === "catalog" && <ToolCatalog />}
        {view === "platform" && <Platform />}
      </main>

      <StageDrawer stageId={openStage} onClose={() => setOpenStage(null)} />
    </div>
  );
}
