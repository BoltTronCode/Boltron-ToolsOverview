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
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
    icon: "🔧",
    description: "Physical jigs, handhelds, benches and gateways used in the field or on the line.",
  },
  Firmware: {
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.12)",
    icon: "💾",
    description: "Embedded software running on the device or test rigs during production and service.",
  },
  Software: {
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.12)",
    icon: "🖥️",
    description: "Applications, planning engines and platforms that orchestrate the lifecycle.",
  },
};

export const STAGES: Stage[] = [
  {
    id: 1,
    key: "manufacturing",
    name: "Manufacturing & PDI",
    tagline: "Every device is born with a verified digital identity.",
    icon: "🏭",
    tools: [
      { name: "Flashing & Provisioning Jig", type: "Hardware", purpose: "Loads firmware and provisions identity on the line." },
      { name: "Functional Test Jig", type: "Hardware", purpose: "Validates board-level functionality before shipment." },
      { name: "RF Validation Jig", type: "Hardware", purpose: "Verifies RF performance and calibration." },
      { name: "Manufacturing Test Software", type: "Software", purpose: "Orchestrates the production test sequence." },
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
      { name: "Firmware Monitoring", type: "Firmware", purpose: "Tracks firmware versions and rollout status." },
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
    id: 5,
    key: "field-service",
    name: "Field Service & Diagnostics",
    tagline: "Rapid on-site diagnosis and recovery to reduce repeat visits.",
    icon: "🚚",
    tools: [
      { name: "RF Service Handheld", type: "Hardware", purpose: "Local RF diagnostics and route validation." },
      { name: "4G Service Tool", type: "Hardware", purpose: "Cellular validation and troubleshooting." },
      { name: "Service Gateway", type: "Hardware", purpose: "Portable gateway for field recovery." },
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
    id: 6,
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

export const CENTRAL_PLATFORM = {
  name: "Boltron Hardware Lifecycle Management Platform",
  stores: [
    "Manufacturing History",
    "Installation History",
    "Connectivity History",
    "Firmware History",
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
