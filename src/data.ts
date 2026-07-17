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
}

export const TOOL_TYPE_META: Record<
  ToolType,
  { color: string; bg: string; icon: string; description: string }
> = {
  Hardware: {
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.14)",
    icon: "🔧",
    description: "Physical jigs, handhelds, benches, probes and gateways used on the line or in the field.",
  },
  Firmware: {
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.14)",
    icon: "💾",
    description: "Embedded images running on the device or test rigs — dev, production, and FOTA.",
  },
  Software: {
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.14)",
    icon: "🖥️",
    description: "Design suites, planning engines, mobile apps and cloud platforms that orchestrate the lifecycle.",
  },
};

export const STAGES: Stage[] = [
  {
    id: 1,
    key: "design",
    name: "Product Design & Development",
    tagline: "The device is engineered, versioned and released for build.",
    icon: "🧬",
    tools: [
      { name: "Altium Designer", type: "Software", purpose: "Schematic, PCB layout, BOM and Gerber/ODB++ generation." },
      { name: "Altium 365 / PLM Vault", type: "Software", purpose: "Secure, access-controlled store for all design data." },
      { name: "TI Code Composer Studio", type: "Software", purpose: "Firmware IDE for the TI MCU/SoC." },
      { name: "Git Version Control", type: "Software", purpose: "Source control with signed, tagged firmware releases." },
      { name: "CI/CD Firmware Pipeline", type: "Software", purpose: "Automated builds, tests and release artifacts." },
      { name: "JTAG / Debug Probe", type: "Hardware", purpose: "On-chip debug and flashing during bring-up." },
      { name: "Prototype Bring-up Bench", type: "Hardware", purpose: "First-article validation of new hardware revisions." },
      { name: "Release Firmware Image", type: "Firmware", purpose: "Versioned, signed binary handed to production & FOTA." },
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
    tagline: "Continuous health monitoring with predictive alerting.",
    icon: "📊",
    tools: [
      { name: "Boltron NMS", type: "Software", purpose: "Central network management and monitoring platform." },
      { name: "RF Network Monitoring", type: "Software", purpose: "Tracks mesh health and routing quality." },
      { name: "Cellular Network Monitoring", type: "Software", purpose: "Tracks cellular registration and signal." },
      { name: "MQTT Monitoring", type: "Software", purpose: "Watches broker connectivity and disconnects." },
      { name: "DLMS Monitoring", type: "Software", purpose: "Monitors metering protocol communication." },
      { name: "Device Health Monitoring", type: "Software", purpose: "Aggregates device vitals into a health score." },
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
      "Reboot Count",
      "Reset Reasons",
      "Memory Usage",
      "Uptime",
    ],
    output: "Health Score & Predictive Alerts",
  },
  {
    id: 6,
    key: "field-service",
    name: "Field Service & Diagnostics",
    tagline: "Rapid on-site diagnosis and recovery to reduce repeat visits.",
    icon: "🚚",
    tools: [
      { name: "RF Service Handheld", type: "Hardware", purpose: "Local RF diagnostics and route validation." },
      { name: "4G Service Tool", type: "Hardware", purpose: "Cellular validation and troubleshooting." },
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
];

/* ------------------------------------------------------------------ */
/*  Lifecycle Timeline — swimlane matrix (disciplines x phases)        */
/* ------------------------------------------------------------------ */

export type LaneKey = "hardware" | "firmware" | "software" | "artifacts" | "loop";

export const LANES: { key: LaneKey; name: string; icon: string; color: string; bg: string }[] = [
  { key: "hardware", name: "Hardware", icon: "🔧", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { key: "firmware", name: "Firmware", icon: "💾", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  { key: "software", name: "Software & Cloud", icon: "🖥️", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { key: "artifacts", name: "Artifacts & Data", icon: "🗄️", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { key: "loop", name: "Feedback & Quality", icon: "🔁", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
];

export interface Phase {
  id: number;
  short: string;
  name: string;
  icon: string;
  output: string;
  lanes: Record<LaneKey, string[]>;
}

export const PHASES: Phase[] = [
  {
    id: 1,
    short: "Design",
    name: "Product Design & Development",
    icon: "🧬",
    output: "Released Design Package",
    lanes: {
      hardware: ["Altium schematic + PCB", "BOM / Gerber / ODB++", "JTAG debug probe", "Prototype bring-up bench"],
      firmware: ["TI Code Composer Studio", "Git version control", "CI/CD build pipeline", "Signed release image"],
      software: ["Requirements / PLM", "Cloud API contracts", "Design reviews"],
      artifacts: ["Schematic, PCB, BOM, Gerber", "Firmware source + signed binary", "→ Secure PLM Vault (RBAC, audit)"],
      loop: ["ECR / ECO change control", "Issue tracker (bug intake)", "Field fixes land here"],
    },
  },
  {
    id: 2,
    short: "Mfg / PDI",
    name: "Manufacturing & PDI",
    icon: "🏭",
    output: "Device Birth Certificate",
    lanes: {
      hardware: ["Flash & Provisioning jig", "Functional test jig", "RF validation jig"],
      firmware: ["Production test firmware", "Flash released image"],
      software: ["Manufacturing test software (MES)", "Device serialization utility"],
      artifacts: ["FW/HW version, MAC, IMEI, ICCID", "RF calibration, batch, test results"],
      loop: ["Yield & first-pass tracking", "Batch failure analytics", "Systematic defect → Design"],
    },
  },
  {
    id: 3,
    short: "Survey",
    name: "Pre-Installation Survey",
    icon: "📡",
    output: "Site Readiness Report",
    lanes: {
      hardware: ["GPS RF survey handheld", "GPS cellular survey handheld"],
      firmware: ["Survey device firmware"],
      software: ["RF network planning software", "Coverage prediction engine"],
      artifacts: ["GPS, noise floor, occupancy", "RSSI/RSRP/RSRQ/SINR, operator"],
      loop: ["Weak site → re-plan / defer"],
    },
  },
  {
    id: 4,
    short: "Install",
    name: "Installation & Commissioning",
    icon: "🛠️",
    output: "Installation Certificate",
    lanes: {
      hardware: ["RF network checker handheld", "RF master handheld gateway"],
      firmware: ["Commissioning / join stack"],
      software: ["Installer mobile application"],
      artifacts: ["Meter/NIC ID, GPS, photos", "RF join, parent, hop, cellular, MQTT"],
      loop: ["Commissioning fail → on-site fix", "Config / parent re-selection"],
    },
  },
  {
    id: 5,
    short: "Operate",
    name: "Operations & Monitoring",
    icon: "📊",
    output: "Health Score & Predictive Alerts",
    lanes: {
      hardware: ["Deployed gateways / DCUs"],
      firmware: ["Firmware version tracking", "FOTA campaign manager"],
      software: ["Boltron NMS", "RF / cellular / MQTT / DLMS", "Device health monitoring"],
      artifacts: ["RSSI, ETX, neighbors, hop", "Reboots, resets, memory, uptime"],
      loop: ["Predictive alert → dispatch", "Anomaly pattern → RCA → fix"],
    },
  },
  {
    id: 6,
    short: "Service",
    name: "Field Service & Diagnostics",
    icon: "🚚",
    output: "Field Service Report",
    lanes: {
      hardware: ["RF service handheld", "4G service tool", "Service gateway"],
      firmware: ["Firmware recovery", "FOTA recovery"],
      software: ["On-site diagnostics app"],
      artifacts: ["Device & connectivity logs", "RF route, cellular history, signatures"],
      loop: ["Unresolved → return to depot", "Failure signature → RCA"],
    },
  },
  {
    id: 7,
    short: "Warranty",
    name: "Repair, Replacement & Warranty",
    icon: "🧰",
    output: "Warranty Closure Report",
    lanes: {
      hardware: ["Service center test jig", "RF validation bench", "Cellular validation bench"],
      firmware: ["Reflash / refurbish image"],
      software: ["RMA / warranty system"],
      artifacts: ["Failure class, root cause", "Repair actions, replacement history"],
      loop: ["Root cause → vendor/batch analytics", "Corrective action → Design"],
    },
  },
];

// The master closed loop: how a field bug travels back to engineering and re-deploys.
export const FEEDBACK_LOOP: { icon: string; title: string; detail: string }[] = [
  { icon: "🚨", title: "Failure Signature", detail: "Field / warranty defect captured with logs & context." },
  { icon: "🔍", title: "Root Cause Analysis", detail: "NMS analytics + bench correlate the failure." },
  { icon: "📝", title: "ECR / ECO", detail: "Change request raised in the issue tracker." },
  { icon: "🧬", title: "Engineering Fix", detail: "Altium / TI change → new signed version in Git." },
  { icon: "✅", title: "Validation", detail: "CI + bench regression before release." },
  { icon: "🚀", title: "Deploy", detail: "FOTA to fleet + updated production line." },
];

// How design data is stored and how the delivery / NPI team consumes it.
export const DESIGN_GOVERNANCE = {
  storage: [
    "All design data (schematic, PCB, BOM, Gerber, firmware source & binaries) lives in a secure PLM vault (e.g. Altium 365 + Git) with role-based access and full audit history.",
    "Firmware releases are signed and tagged; only immutable, versioned artifacts leave engineering.",
  ],
  delivery: [
    "The delivery / NPI team pulls a specific released, version-tagged package for prototype and production runs — never raw working files.",
    "Any change flows through ECR → ECO change control, keeping production and the field on known-good versions.",
    "Queries are raised against the exact part + version in the issue tracker, linking manufacturing and field feedback straight back to the owning engineer.",
  ],
};

export const CENTRAL_PLATFORM = {
  name: "Boltron Hardware Lifecycle Management Platform",
  stores: [
    "Design & Firmware History",
    "Manufacturing History",
    "Installation History",
    "Connectivity History",
    "Service History",
    "Warranty History",
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
