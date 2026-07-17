# Boltron Device Lifecycle Assurance — Executive Dashboard

A demo web dashboard giving a CEO/CTO an end-to-end view of the Boltron device
lifecycle: every tool used at each stage, its type (**Hardware / Firmware /
Software**), the diagnostics captured, and the artifact each stage produces.

## Views

- **Overview** — fleet KPIs, the six-stage lifecycle flow, tooling breakdown by
  type, and installed base / health per device class.
- **Lifecycle Stages** — a card per stage (Manufacturing → Warranty) with its
  tools (type-tagged), diagnostics captured, and output certificate/report.
- **Tool Catalog** — every tool across the lifecycle in one filterable table;
  filter by type and search by name, purpose, or stage.
- **Central Platform** — what the Boltron Hardware Lifecycle Management Platform
  stores and the business value it provides.

Click any stage (in the Overview flow or a stage card) to open a detail drawer
with the full tool list, purposes, and all captured diagnostics.

## Data

All content is derived from the Boltron platform specification and lives in
[`src/data.ts`](src/data.ts). Fleet numbers in the Overview are illustrative
demo values and are clearly the only mocked data.

## Tech stack

React 19 + TypeScript + Vite. No backend — it is a static, self-contained demo.

## Getting started

```bash
nvm use 22        # requires Node 20.19+ or 22.12+
npm install
npm run dev       # http://localhost:5173
```

Other scripts:

```bash
npm run build     # type-check + production build to dist/
npm run lint      # oxlint
npm run preview   # serve the production build
```
