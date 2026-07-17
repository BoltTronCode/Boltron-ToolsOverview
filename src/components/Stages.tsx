import { STAGES, type Stage } from "../data";

function StageCard({ stage, onOpen }: { stage: Stage; onOpen: (id: number) => void }) {
  return (
    <div className="stage-card">
      <div className="stage-head">
        <div className="stage-icon">{stage.icon}</div>
        <div>
          <div className="stage-num">STAGE {stage.id}</div>
          <div className="stage-name">{stage.name}</div>
        </div>
      </div>
      <div className="stage-tag">{stage.tagline}</div>

      <div className="mini-label">Tools ({stage.tools.length})</div>
      {stage.tools.map((t) => (
        <div className="tool-line" key={t.name}>
          <span className="tool-name">{t.name}</span>
          <span className={`badge ${t.type}`}>{t.type}</span>
        </div>
      ))}

      <div className="mini-label">Diagnostics Captured</div>
      <div className="chips">
        {stage.diagnostics.slice(0, 6).map((d) => (
          <span className="chip" key={d}>
            {d}
          </span>
        ))}
        {stage.diagnostics.length > 6 && (
          <span
            className="chip"
            style={{ cursor: "pointer", color: "var(--accent-2)" }}
            onClick={() => onOpen(stage.id)}
          >
            +{stage.diagnostics.length - 6} more
          </span>
        )}
      </div>

      <div className="stage-output">
        <div className="mini-label">Output</div>
        <div className="output-box">📄 {stage.output}</div>
      </div>
    </div>
  );
}

export default function Stages({ onOpenStage }: { onOpenStage: (id: number) => void }) {
  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Lifecycle Stages</h1>
        <p className="page-desc">
          Each stage produces a signed artifact that flows into the central platform, building a
          complete digital history for every device.
        </p>
      </div>
      <div className="stage-grid">
        {STAGES.map((s) => (
          <StageCard key={s.id} stage={s} onOpen={onOpenStage} />
        ))}
      </div>
    </div>
  );
}
