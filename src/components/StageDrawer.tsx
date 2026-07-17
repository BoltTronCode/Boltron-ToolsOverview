import { STAGES } from "../data";

export default function StageDrawer({
  stageId,
  onClose,
}: {
  stageId: number | null;
  onClose: () => void;
}) {
  if (stageId === null) return null;
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer">
        <button className="drawer-close" onClick={onClose}>
          ✕
        </button>
        <div className="stage-head">
          <div className="stage-icon">{stage.icon}</div>
          <div>
            <div className="stage-num">STAGE {stage.id}</div>
            <div className="stage-name">{stage.name}</div>
          </div>
        </div>
        <p className="stage-tag">{stage.tagline}</p>

        <div className="mini-label">Tools & Type</div>
        {stage.tools.map((t) => (
          <div className="tool-line" key={t.name}>
            <div>
              <div className="tool-name">{t.name}</div>
              <div className="td-purpose">{t.purpose}</div>
            </div>
            <span className={`badge ${t.type}`}>{t.type}</span>
          </div>
        ))}

        <div className="mini-label">Diagnostics Captured ({stage.diagnostics.length})</div>
        <div className="chips">
          {stage.diagnostics.map((d) => (
            <span className="chip" key={d}>
              {d}
            </span>
          ))}
        </div>

        <div className="stage-output">
          <div className="mini-label">Output</div>
          <div className="output-box">📄 {stage.output}</div>
        </div>
      </aside>
    </>
  );
}
