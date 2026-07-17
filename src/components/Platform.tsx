import { CENTRAL_PLATFORM } from "../data";

export default function Platform() {
  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Central Platform</h1>
        <p className="page-desc">
          All lifecycle stages continuously feed one system of record, turning raw device events
          into traceability, analytics and predictive maintenance.
        </p>
      </div>

      <div className="platform-hero">
        <div style={{ fontSize: 34 }}>🛰️</div>
        <h2>{CENTRAL_PLATFORM.name}</h2>
        <p style={{ color: "var(--text-dim)", margin: 0 }}>
          Design → Manufacturing → Install → Monitoring → Service → Warranty → Integration
        </p>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="section-title">🗄️ Stores</h3>
          <p className="section-sub">Complete history captured for every device.</p>
          <div className="pill-grid">
            {CENTRAL_PLATFORM.stores.map((s) => (
              <span className="pill" key={s}>
                📦 {s}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">✨ Provides</h3>
          <p className="section-sub">Business value delivered to the organization.</p>
          <div className="pill-grid">
            {CENTRAL_PLATFORM.provides.map((p) => (
              <span className="pill" key={p}>
                ⭐ {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Executive Message</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Every device creates a digital footprint throughout its lifecycle. All lifecycle events
          are connected through the Boltron Hardware Lifecycle Management Platform, enabling complete
          visibility, faster troubleshooting, reduced warranty cost, and continuous product
          improvement.
        </p>
      </div>
    </div>
  );
}
