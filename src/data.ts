export type ToolType = "Hardware" | "Firmware" | "Software";

export interface Tool {
  name: string;
  type: ToolType;
  purpose: string;
}

export interface Stage {
  id: number;
  key: string;
  name: string;
  tagline: string;
  icon: string;
  tools: Tool[];
  diagnostics: string[];
  output: string;
  /** true = proposal that needs the user's confirmation (rendered in RED). */
  toConfirm?: boolean;
  /** software-company layer that spans the lifecycle rather than a linear step. */
  crossCutting?: boolean;
}

export const TOOL_TYPE_META: Record<
  ToolType,
  { color: string; bg: string; icon: string; description: string }
> = {
  Hardware: {
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.10)",
    icon: "🔧",
    description: "Physical jigs, handhelds, benches, probes and gateways used on the line or in the field.",
  },
  Firmware: {
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.10)",
    icon: "💾",
    description: "Embedded images running on the device or test rigs — dev, production, and FOTA.",
  },
  Software: {
    color: "#0f9d6b",
    bg: "rgba(15, 157, 107, 0.10)",
    icon: "🖥️",
    description: "Design suites, planning engines, mobile apps and cloud platforms that orchestrate the lifecycle.",
  },
};

export const STAGES: Stage[] = [
  {
    id: 1,
    key: "design",
    name: "Design, Development & Integration",
    tagline: "The device is engineered, versioned, documented and released for build.",
    icon: "🧬",
    tools: [
      { name: "Altium (or equivalent)", type: "Software", purpose: "Schematic, PCB layout, BOM and Gerber/ODB++ generation." },
      { name: "PLM / Design Vault", type: "Software", purpose: "Secure, access-controlled store for all design data." },
      { name: "VS Code", type: "Software", purpose: "Primary firmware & software IDE for the team." },
      { name: "Git Version Control", type: "Software", purpose: "Source control with signed, tagged releases." },
      { name: "CI/CD Firmware Pipeline", type: "Software", purpose: "Automated builds, tests and release artifacts." },
      { name: "JTAG / Debug Probe", type: "Hardware", purpose: "On-chip debug and flashing during bring-up." },
      { name: "Prototype Bring-up Bench", type: "Hardware", purpose: "First-article validation of new hardware revisions." },
      { name: "Signed Release Image", type: "Firmware", purpose: "Versioned, signed binary handed to production & FOTA." },
    ],
    diagnostics: [
      "Schematic",
      "PCB Layout",
      "Bill of Materials (BOM)",
      "Gerber / ODB++",
      "Firmware Source",
      "Signed Release Binary",
      "Design Docs",
      "Test Specifications",
    ],
    output: "Released Design Package",
  },
  {
    id: 2,
    key: "manufacturing",
    name: "Manufacturing & PDI",
    tagline: "Every device is born with a verified digital identity.",
    icon: "🏭",
    tools: [
      { name: "Flashing & Provisioning Jig", type: "Hardware", purpose: "Loads released firmware and provisions identity on the line." },
      { name: "Functional Test Jig", type: "Hardware", purpose: "Validates board-level functionality before shipment." },
      { name: "RF Validation Jig", type: "Hardware", purpose: "Verifies RF performance and calibration." },
      { name: "Manufacturing Test Software", type: "Software", purpose: "Orchestrates the production test sequence (MES)." },
      { name: "Device Serialization Utility", type: "Software", purpose: "Assigns unique serials and registers identifiers." },
      { name: "Production Test Firmware", type: "Firmware", purpose: "Special firmware image used only for factory testing." },
    ],
    diagnostics: [
      "Firmware Version",
      "Hardware Version",
      "MAC Address",
      "IMEI",
      "ICCID",
      "RF Calibration Data",
      "Production Batch",
      "Manufacturing Test Results",
    ],
    output: "Device Birth Certificate",
  },
  {
    id: 3,
    key: "survey",
    name: "Pre-Installation Survey",
    tagline: "Confirm the site can support reliable connectivity before rollout.",
    icon: "📡",
    tools: [
      { name: "GPS Enabled RF Survey Handheld", type: "Hardware", purpose: "Measures RF conditions at the candidate site." },
      { name: "GPS Enabled Cellular Survey Handheld", type: "Hardware", purpose: "Measures cellular coverage and quality." },
      { name: "RF Network Planning Software", type: "Software", purpose: "Plans mesh topology and node placement." },
      { name: "Coverage Prediction Engine", type: "Software", purpose: "Predicts coverage and identifies weak spots." },
    ],
    diagnostics: [
      "GPS Coordinates",
      "RF Noise Floor",
      "Channel Occupancy",
      "RSSI",
      "RSRP",
      "RSRQ",
      "SINR",
      "Cellular Operator Information",
    ],
    output: "Site Readiness Report",
  },
  {
    id: 4,
    key: "installation",
    name: "Installation & Commissioning",
    tagline: "Devices are installed, joined to the network and certified on site.",
    icon: "🛠️",
    tools: [
      { name: "RF Network Checker Handheld", type: "Hardware", purpose: "Confirms the device joins the RF mesh." },
      { name: "RF Master Handheld Gateway", type: "Hardware", purpose: "Acts as a portable gateway for commissioning." },
      { name: "Installer Mobile Application", type: "Software", purpose: "Guides the installer and captures proof of work." },
    ],
    diagnostics: [
      "Meter ID",
      "NIC ID",
      "GPS Location",
      "Installation Photographs",
      "RF Join Status",
      "Parent Selection",
      "Hop Count",
      "Cellular Registration",
      "MQTT Connectivity",
    ],
    output: "Installation Certificate",
  },
  {
    id: 5,
    key: "operations",
    name: "Operations & Monitoring",
    tagline: "Continuous health monitoring, comm-status triage and predictive alerting.",
    icon: "📊",
    tools: [
      { name: "Boltron NMS", type: "Software", purpose: "Central network management and monitoring platform." },
      { name: "RF Network Monitoring", type: "Software", purpose: "Tracks mesh health and routing quality." },
      { name: "Cellular Network Monitoring", type: "Software", purpose: "Tracks cellular registration and signal." },
      { name: "MQTT Monitoring", type: "Software", purpose: "Watches broker connectivity and disconnects." },
      { name: "DLMS Monitoring", type: "Software", purpose: "Monitors metering protocol communication." },
      { name: "Device Health Monitoring", type: "Software", purpose: "Aggregates device vitals into a health score." },
      { name: "Comm-Status Classifier", type: "Software", purpose: "Flags Comm / Non-Comm / Never-Comm devices for dispatch." },
      { name: "FOTA Campaign Manager", type: "Firmware", purpose: "Rolls out signed firmware updates to the fleet." },
    ],
    diagnostics: [
      "RSSI",
      "ETX",
      "Neighbor Count",
      "Hop Count",
      "RSRP",
      "RSRQ",
      "SINR",
      "MQTT Disconnects",
      "Last-Seen Age",
      "Reboot Count",
      "Memory Usage",
      "Uptime",
    ],
    output: "Health Score, Comm Status & Predictive Alerts",
  },
  {
    id: 6,
    key: "field-service",
    name: "Field Service & Diagnostics",
    tagline: "Rapid on-site diagnosis and recovery to reduce repeat visits.",
    icon: "🚚",
    tools: [
      { name: "RF Service Handheld (HHD)", type: "Hardware", purpose: "Local RF diagnostics and route validation." },
      { name: "4G Service Tool (HHD)", type: "Hardware", purpose: "Cellular validation and troubleshooting." },
      { name: "Service Gateway", type: "Hardware", purpose: "Portable gateway for field recovery." },
      { name: "Firmware Recovery Image", type: "Firmware", purpose: "Restores devices via local flashing or FOTA recovery." },
    ],
    diagnostics: [
      "Device Logs",
      "Connectivity Logs",
      "RF Route Information",
      "Cellular Registration History",
      "Failure Signatures",
    ],
    output: "Field Service Report",
  },
  {
    id: 7,
    key: "warranty",
    name: "Repair, Replacement & Warranty",
    tagline: "Structured failure analysis feeding vendor and batch quality.",
    icon: "🧰",
    tools: [
      { name: "Service Center Test Jig", type: "Hardware", purpose: "Bench validation of returned devices." },
      { name: "RF Validation Bench", type: "Hardware", purpose: "Detailed RF characterization for repair." },
      { name: "Cellular Validation Bench", type: "Hardware", purpose: "Detailed cellular characterization for repair." },
    ],
    diagnostics: [
      "Failure Classification",
      "Root Cause",
      "Repair Actions",
      "Replacement History",
    ],
    output: "Warranty Closure Report",
  },
  {
    id: 8,
    key: "integration",
    name: "Customer Integration & SDK",
    tagline: "How customers consume our firmware — SDK, samples, sandbox and docs.",
    icon: "🔌",
    toConfirm: true,
    crossCutting: true,
    tools: [
      { name: "Public GitHub Repository", type: "Software", purpose: "Hosts the SDK, examples, issues and versioned releases." },
      { name: "Device SDK (C / Python)", type: "Software", purpose: "Typed client + HAL so customers build on our firmware." },
      { name: "Hosted Sandbox Environment", type: "Software", purpose: "Try integrations against a virtual device with no hardware." },
      { name: "Reference App & Code Samples", type: "Software", purpose: "Copy-paste starting points for common use cases." },
      { name: "API Docs + Postman Collection", type: "Software", purpose: "Protocol/API reference customers can run instantly." },
      { name: "Firmware Integration Guide", type: "Firmware", purpose: "Step-by-step to flash, pair and extend our firmware." },
    ],
    diagnostics: [
      "Versioned SDK Packages",
      "Reference Application",
      "Code Samples",
      "API / Postman Collection",
      "Onboarding Guide",
      "Changelog & Release Notes",
      "Semantic Version Tags",
      "Compatibility Matrix",
    ],
    output: "Customer Integration Kit",
  },
  {
    id: 9,
    key: "knowledge",
    name: "Knowledge Base & Support",
    tagline: "Self-serve answers, FAQ builder and query intake for customers.",
    icon: "📚",
    crossCutting: true,
    tools: [
      { name: "Knowledge Base Portal", type: "Software", purpose: "Searchable articles, guides and troubleshooting." },
      { name: "FAQ Builder", type: "Software", purpose: "Turns recurring queries into curated FAQs." },
      { name: "Customer Query / Ticket Portal", type: "Software", purpose: "Intake for questions and issues, routed to Jira." },
      { name: "Docs Site", type: "Software", purpose: "Versioned product & SDK documentation." },
      { name: "Community / Forum", type: "Software", purpose: "Peer support and public Q&A." },
    ],
    diagnostics: [
      "FAQs",
      "How-to Articles",
      "Troubleshooting Guides",
      "Known Issues",
      "Release Notes",
      "Query Analytics & Deflection Rate",
    ],
    output: "Self-Serve Support & Deflection",
  },
];

/* ------------------------------------------------------------------ */
/*  Lifecycle Timeline — swimlane matrix (disciplines x phases)        */
/* ------------------------------------------------------------------ */

export type LaneKey = "hardware" | "firmware" | "software" | "artifacts" | "docs" | "loop";

export interface LaneItem {
  label: string;
  /** rendered in RED — a proposal awaiting your confirmation. */
  red?: boolean;
}

export const LANES: { key: LaneKey; name: string; icon: string; color: string; bg: string }[] = [
  { key: "hardware", name: "Hardware", icon: "🔧", color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  { key: "firmware", name: "Firmware", icon: "💾", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  { key: "software", name: "Software & Cloud", icon: "🖥️", color: "#0f9d6b", bg: "rgba(15,157,107,0.08)" },
  { key: "artifacts", name: "Artifacts & Data", icon: "🗄️", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  { key: "docs", name: "Documentation", icon: "📘", color: "#4f46e5", bg: "rgba(79,70,229,0.08)" },
  { key: "loop", name: "Feedback & Quality", icon: "🔁", color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
];

export interface Phase {
  id: number;
  short: string;
  name: string;
  icon: string;
  output: string;
  toConfirm?: boolean;
  crossCutting?: boolean;
  lanes: Record<LaneKey, LaneItem[]>;
}

const t = (label: string): LaneItem => ({ label });
const r = (label: string): LaneItem => ({ label, red: true });

export const PHASES: Phase[] = [
  {
    id: 1,
    short: "Design & Dev",
    name: "Design, Development & Integration",
    icon: "🧬",
    output: "Released Design Package",
    lanes: {
      hardware: [t("Altium (or equivalent)"), t("BOM / Gerber / ODB++"), t("JTAG debug probe"), t("Prototype bring-up bench")],
      firmware: [t("VS Code"), t("Git version control"), t("CI/CD build pipeline"), t("Signed release image")],
      software: [t("Requirements / PLM"), t("Cloud API contracts"), r("AI coding tool (to lock)")],
      artifacts: [t("Schematic, PCB, BOM, Gerber"), t("Firmware source + signed binary"), t("→ Secure PLM Vault (RBAC, audit)")],
      docs: [t("Internal: HLD, LLD, Doxygen"), t("Internal: test plans / specs"), t("External: Datasheet (draft)")],
      loop: [t("Jira: ECR / ECO change control"), t("Field fixes land here")],
    },
  },
  {
    id: 2,
    short: "Mfg / PDI",
    name: "Manufacturing & PDI",
    icon: "🏭",
    output: "Device Birth Certificate",
    lanes: {
      hardware: [t("Flash & Provisioning jig"), t("Functional test jig"), t("RF validation jig")],
      firmware: [t("Production test firmware"), t("Flash released image")],
      software: [t("Manufacturing test software (MES)"), t("Device serialization utility")],
      artifacts: [t("FW/HW version, MAC, IMEI, ICCID"), t("RF calibration, batch, test results")],
      docs: [t("Internal: PDI work instructions"), t("Internal: test reports")],
      loop: [t("Yield & first-pass tracking"), t("Batch analytics → Jira → Design")],
    },
  },
  {
    id: 3,
    short: "Survey",
    name: "Pre-Installation Survey",
    icon: "📡",
    output: "Site Readiness Report",
    lanes: {
      hardware: [t("GPS RF survey handheld"), t("GPS cellular survey handheld")],
      firmware: [t("Survey device firmware")],
      software: [t("RF network planning software"), t("Coverage prediction engine")],
      artifacts: [t("GPS, noise floor, occupancy"), t("RSSI/RSRP/RSRQ/SINR, operator")],
      docs: [t("Internal: survey SOP"), t("Site Readiness Report")],
      loop: [t("Weak site → re-plan / defer")],
    },
  },
  {
    id: 4,
    short: "Install",
    name: "Installation & Commissioning",
    icon: "🛠️",
    output: "Installation Certificate",
    lanes: {
      hardware: [t("RF network checker handheld"), t("RF master handheld gateway")],
      firmware: [t("Commissioning / join stack")],
      software: [t("Installer mobile application")],
      artifacts: [t("Meter/NIC ID, GPS, photos"), t("RF join, parent, hop, cellular, MQTT")],
      docs: [t("External: Installation Manual"), t("External: Getting Started Guide")],
      loop: [t("Commissioning fail → on-site fix"), t("Config / parent re-selection")],
    },
  },
  {
    id: 5,
    short: "Operate",
    name: "Operations & Monitoring",
    icon: "📊",
    output: "Health, Comm Status & Alerts",
    lanes: {
      hardware: [t("Deployed gateways / DCUs"), t("HHD dispatch for Non/Never-Comm")],
      firmware: [t("Firmware version tracking"), t("FOTA campaign manager")],
      software: [t("Boltron NMS"), t("RF / cellular / MQTT / DLMS"), t("Comm-status classifier")],
      artifacts: [t("RSSI, ETX, neighbors, hop"), t("Last-seen age, reboots, uptime")],
      docs: [t("Internal: runbooks / SLAs"), t("External: User Manual")],
      loop: [t("Predictive alert → dispatch"), t("Anomaly → RCA → Jira → fix")],
    },
  },
  {
    id: 6,
    short: "Service",
    name: "Field Service & Diagnostics",
    icon: "🚚",
    output: "Field Service Report",
    lanes: {
      hardware: [t("RF service handheld (HHD)"), t("4G service tool (HHD)"), t("Service gateway")],
      firmware: [t("Firmware recovery"), t("FOTA recovery")],
      software: [t("On-site diagnostics app")],
      artifacts: [t("Device & connectivity logs"), t("RF route, cellular history, signatures")],
      docs: [t("Internal: service SOP"), t("External: Troubleshooting Guide")],
      loop: [t("Unresolved → return to depot"), t("Failure signature → Jira / RCA")],
    },
  },
  {
    id: 7,
    short: "Warranty",
    name: "Repair, Replacement & Warranty",
    icon: "🧰",
    output: "Warranty Closure Report",
    lanes: {
      hardware: [t("Service center test jig"), t("RF validation bench"), t("Cellular validation bench")],
      firmware: [t("Reflash / refurbish image")],
      software: [t("RMA / warranty system")],
      artifacts: [t("Failure class, root cause"), t("Repair actions, replacement history")],
      docs: [t("Internal: 8D / RCA reports"), t("External: RMA / warranty policy")],
      loop: [t("Root cause → vendor/batch analytics"), t("Corrective action → Jira → Design")],
    },
  },
  {
    id: 8,
    short: "Integration",
    name: "Customer Integration & SDK",
    icon: "🔌",
    output: "Customer Integration Kit",
    toConfirm: true,
    crossCutting: true,
    lanes: {
      hardware: [],
      firmware: [r("Firmware integration guide"), r("HAL / driver layer")],
      software: [r("Public GitHub repo"), r("Device SDK (C / Python)"), r("Hosted sandbox"), r("Reference app + samples"), r("API docs + Postman")],
      artifacts: [r("Versioned SDK releases"), r("Changelog / release notes"), r("Compatibility matrix")],
      docs: [r("External: SDK & API Reference"), r("External: Getting Started + samples"), r("External: Integration Guide")],
      loop: [r("Customer issues / PRs → Jira")],
    },
  },
  {
    id: 9,
    short: "Knowledge",
    name: "Knowledge Base & Support",
    icon: "📚",
    crossCutting: true,
    output: "Self-Serve Support & Deflection",
    lanes: {
      hardware: [],
      firmware: [],
      software: [t("KB portal"), t("FAQ builder"), t("Ticket portal"), t("Docs site")],
      artifacts: [t("FAQs, how-to, guides"), t("Known issues, release notes")],
      docs: [t("External: FAQs, how-to, release notes"), t("External: Docs site")],
      loop: [t("Query → Jira / RCA"), t("Deflection analytics")],
    },
  },
];

// The master closed loop: how a field bug travels back to engineering and re-deploys.
export const FEEDBACK_LOOP: { icon: string; title: string; detail: string }[] = [
  { icon: "🚨", title: "Issue Raised", detail: "Field incident or customer-reported defect captured with logs & context." },
  { icon: "📋", title: "Logged in Jira", detail: "Typed as HW / FW / SW / INC issue, triaged & prioritized for a release." },
  { icon: "🔍", title: "Root Cause Analysis", detail: "NMS analytics + bench reproduce and correlate the failure." },
  { icon: "🧬", title: "Engineering Fix", detail: "Altium / VS Code change → new signed version in Git (ECR/ECO)." },
  { icon: "✅", title: "Validation", detail: "CI + bench regression before release." },
  { icon: "🚀", title: "Deploy", detail: "FOTA to fleet + updated production line + SDK release." },
];

// How design data is stored and how the delivery / NPI team consumes it.
export const DESIGN_GOVERNANCE = {
  storage: [
    "All design data (schematic, PCB, BOM, Gerber, firmware source & binaries) lives in a secure PLM vault (Altium 365 / Git + artifact registry) with role-based access and full audit history.",
    "Firmware releases are signed and tagged; only immutable, versioned artifacts leave engineering.",
  ],
  delivery: [
    "The delivery / NPI team pulls a specific released, version-tagged package for prototype and production runs — never raw working files.",
    "Any change flows through Jira ECR → ECO change control, keeping production and the field on known-good versions.",
    "Queries are raised against the exact part + version, linking manufacturing and field feedback straight back to the owning engineer.",
  ],
};

/* ------------------------------------------------------------------ */
/*  Documentation — internal vs external                               */
/* ------------------------------------------------------------------ */

export const DOCUMENTATION = {
  internal: [
    "HLD — High-Level Design",
    "LLD — Low-Level Design",
    "Doxygen / source API docs",
    "Architecture & interface specs",
    "Test plans & reports",
    "Manufacturing / PDI work instructions",
    "Service SOPs & runbooks",
    "Root-cause / 8D reports",
  ],
  external: [
    "Datasheet",
    "Getting Started Guide",
    "User / Installation Manual",
    "SDK & API Reference",
    "Firmware Upgrade Guide",
    "Release Notes / Changelog",
    "FAQ / Knowledge Base articles",
    "Compatibility Matrix",
  ],
};

/* ------------------------------------------------------------------ */
/*  What runs where — device + tool matrix per phase                   */
/* ------------------------------------------------------------------ */

export const FIELD_MATRIX: { phase: string; icon: string; devices: string; tools: string }[] = [
  {
    phase: "Manufacturing & PDI",
    icon: "🏭",
    devices: "All classes as bare units: Smart Meter NIC, RF Router, Gateway, DCU",
    tools: "Flashing & Provisioning jig · Functional test jig · RF validation jig",
  },
  {
    phase: "Pre-Installation Survey",
    icon: "📡",
    devices: "No device yet — the site itself is assessed",
    tools: "GPS RF survey handheld · GPS cellular survey handheld",
  },
  {
    phase: "Installation & Commissioning",
    icon: "🛠️",
    devices: "NIC + Meter, RF Router, Gateway, DCU (being installed)",
    tools: "RF network checker handheld · RF master handheld gateway · Installer app",
  },
  {
    phase: "Operations & Monitoring",
    icon: "📊",
    devices: "Full deployed fleet: NIC, RF Router, Gateway, DCU",
    tools: "Boltron NMS (remote, no HHD) — HHD only dispatched for Non/Never-Comm",
  },
  {
    phase: "Field Service & Diagnostics",
    icon: "🚚",
    devices: "Flagged units: Non-Comm / Never-Comm NIC, Router, Gateway, DCU",
    tools: "RF Service Handheld (HHD) · 4G Service Tool (HHD) · Service Gateway",
  },
  {
    phase: "Repair, Replacement & Warranty",
    icon: "🧰",
    devices: "Returned units (RMA) of any class",
    tools: "Service center test jig · RF validation bench · Cellular validation bench",
  },
];

/* ------------------------------------------------------------------ */
/*  RED — decisions that need your confirmation                        */
/* ------------------------------------------------------------------ */

export interface Decision {
  id: string;
  title: string;
  question: string;
  options: { name: string; note: string; recommended?: boolean }[];
  recommendation: string;
}

export const DECISIONS: Decision[] = [
  {
    id: "ai-tool",
    title: "Lock our AI coding tool",
    question: "Which AI tool do we standardize on across engineering?",
    options: [
      { name: "Devin (Cognition)", note: "Autonomous end-to-end tasks, PRs & CI — best for offloading whole tickets.", recommended: true },
      { name: "Cursor", note: "AI-native IDE for fast inline edits and refactors." },
      { name: "GitHub Copilot", note: "Inline completions inside VS Code." },
      { name: "Claude Code", note: "Terminal-based agentic coding." },
    ],
    recommendation:
      "Standardize the editor on VS Code and lock one agent for autonomous work (recommend Devin) + one inline assistant (Copilot/Cursor). Confirm the combination to lock.",
  },
  {
    id: "customer-integration",
    title: "Customer Integration approach",
    question: "How do customers consume our firmware?",
    options: [
      { name: "Public GitHub + SDK", note: "Repo with SDK (C/Python), samples, issues & tagged releases.", recommended: true },
      { name: "Hosted Sandbox", note: "Virtual-device sandbox so they integrate with no hardware." },
      { name: "API Docs + Postman", note: "Runnable protocol/API reference." },
      { name: "Private partner portal", note: "Gated access for select integrators." },
    ],
    recommendation:
      "As a software company: ship a public GitHub SDK (C/Python) + reference app + Postman + a hosted sandbox + an onboarding guide, all semantically versioned. Confirm scope & access model.",
  },
];

/* ------------------------------------------------------------------ */
/*  Jira — issue tracking & release planning                           */
/* ------------------------------------------------------------------ */

export const JIRA_ISSUE_TYPES = [
  { tag: "HW", name: "Hardware Bug", source: "PDI / bench / field", color: "#2563eb" },
  { tag: "FW", name: "Firmware Bug", source: "NMS / field / customer", color: "#7c3aed" },
  { tag: "SW", name: "Software / Cloud Bug", source: "NMS / apps / SDK", color: "#0f9d6b" },
  { tag: "INC", name: "Field Incident", source: "Service & warranty", color: "#dc2626" },
  { tag: "ECO", name: "Change Request / ECO", source: "Any stage", color: "#d97706" },
  { tag: "REL", name: "Release / Epic", source: "Release planning", color: "#0891b2" },
];

export const RELEASE_PLAN =
  "Issues are typed (HW/FW/SW/INC), triaged into a release/epic, gated by CI + bench validation, then shipped as a signed FOTA campaign and an SDK release — with the fix version traced back onto every affected device.";

/* ------------------------------------------------------------------ */
/*  Operations — device communication status                           */
/* ------------------------------------------------------------------ */

export const DEVICE_COMM = [
  {
    status: "Comm",
    count: "1,240,180",
    color: "#0f9d6b",
    how: "Recent telemetry / heartbeat within the SLA window.",
    tool: "No action — monitored in NMS",
  },
  {
    status: "Non-Comm",
    count: "38,420",
    color: "#d97706",
    how: "Was reporting, now silent — NMS last-seen age exceeds threshold.",
    tool: "Dispatch RF Service / 4G Service Handheld (HHD)",
  },
  {
    status: "Never-Comm",
    count: "5,930",
    color: "#dc2626",
    how: "Birth certificate exists but zero telemetry since install.",
    tool: "RF Network Checker HHD → re-commission / RMA",
  },
];

/* ------------------------------------------------------------------ */
/*  Connections graph                                                  */
/* ------------------------------------------------------------------ */

// feedback edges (RED) between stage keys
export const FEEDBACK_EDGES: [string, string][] = [
  ["manufacturing", "design"],
  ["operations", "design"],
  ["warranty", "design"],
  ["field-service", "warranty"],
  ["operations", "field-service"],
  ["integration", "design"],
  ["knowledge", "design"],
];

// Jira hub connects to these stage keys
export const JIRA_LINKS = ["design", "manufacturing", "field-service", "warranty", "integration", "knowledge"];

export const CENTRAL_PLATFORM = {
  name: "Boltron Hardware Lifecycle Management Platform",
  stores: [
    "Design & Firmware History",
    "Manufacturing History",
    "Installation History",
    "Connectivity History",
    "Service & Warranty History",
    "Integration & Support History",
  ],
  provides: [
    "Digital Device Passport",
    "Device Traceability",
    "Failure Analytics",
    "Vendor Quality Analytics",
    "Batch Failure Analytics",
    "Predictive Maintenance",
    "Root Cause Analysis",
  ],
};

// Illustrative fleet metrics for the executive overview (demo data).
export const FLEET_KPIS = [
  { label: "Devices Under Management", value: "1,284,530", delta: "+3.2%", positive: true },
  { label: "Fleet Health Score", value: "94.6%", delta: "+0.8%", positive: true },
  { label: "Active Predictive Alerts", value: "312", delta: "-11%", positive: true },
  { label: "Avg. Warranty Cost / Device", value: "$1.42", delta: "-6.4%", positive: true },
];

export const DEVICE_CATEGORIES = [
  { name: "Smart Meter NICs", count: 912400, health: 95 },
  { name: "RF Routers", count: 214300, health: 93 },
  { name: "Gateways", count: 118600, health: 96 },
  { name: "DCUs", count: 39230, health: 91 },
];

/* ------------------------------------------------------------------ */
/*  Board / CxO scorecard — critical metrics (illustrative demo data)  */
/* ------------------------------------------------------------------ */

export interface BoardKpi {
  label: string;
  value: string;
  sub: string;
  delta: string;
  positive: boolean;
  group: "Cost" | "Reliability" | "Efficiency";
}

export const BOARD_KPIS: BoardKpi[] = [
  // Cost
  { group: "Cost", label: "Avg. Cost to Operate", value: "$3.10", sub: "per device / year", delta: "-7.5%", positive: true },
  { group: "Cost", label: "Avg. Cost / Service Visit", value: "$86", sub: "per truck-roll", delta: "-9.1%", positive: true },
  { group: "Cost", label: "Avg. Cost / Warranty Claim", value: "$41", sub: "repair + logistics", delta: "-6.4%", positive: true },
  { group: "Cost", label: "Warranty Cost % of Revenue", value: "1.8%", sub: "target < 2.0%", delta: "-0.3 pt", positive: true },
  { group: "Cost", label: "Annual Cost Saved vs Baseline", value: "$4.6M", sub: "fewer visits + RMAs", delta: "+18%", positive: true },
  // Reliability
  { group: "Reliability", label: "MTBF", value: "8.7 yrs", sub: "mean time between failures", delta: "+0.4 yr", positive: true },
  { group: "Reliability", label: "Annual Failure Rate", value: "1.9%", sub: "of installed base", delta: "-0.5 pt", positive: true },
  { group: "Reliability", label: "Non / Never-Comm", value: "3.4%", sub: "of fleet needing HHD", delta: "-0.6 pt", positive: true },
  { group: "Reliability", label: "Fleet Health Score", value: "94.6%", sub: "weighted health", delta: "+0.8%", positive: true },
  // Efficiency
  { group: "Efficiency", label: "First-Pass Yield", value: "98.3%", sub: "manufacturing / PDI", delta: "+0.7 pt", positive: true },
  { group: "Efficiency", label: "Truck-Roll Avoidance", value: "62%", sub: "resolved remotely (FOTA/NMS)", delta: "+5 pt", positive: true },
  { group: "Efficiency", label: "Predictive Catch Rate", value: "71%", sub: "failures caught before outage", delta: "+8 pt", positive: true },
  { group: "Efficiency", label: "Mean Time to Resolve", value: "2.4 days", sub: "issue → fix deployed", delta: "-0.6 d", positive: true },
];

export function allTools(): (Tool & { stage: string; stageId: number })[] {
  return STAGES.flatMap((s) =>
    s.tools.map((t) => ({ ...t, stage: s.name, stageId: s.id })),
  );
}

export function toolTypeCounts(): Record<ToolType, number> {
  const counts: Record<ToolType, number> = { Hardware: 0, Firmware: 0, Software: 0 };
  for (const t of allTools()) counts[t.type] += 1;
  return counts;
}
