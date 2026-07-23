/* Ad-hoc verification harness (run: node scripts/verify.ts). Not shipped. */
import { DLMS_PROFILES } from '../src/config/dlmsProfiles.ts'
import { PHY_PROFILES } from '../src/config/phyProfiles.ts'
import { USE_CASES } from '../src/config/useCases.ts'
import { DEFAULT_NETWORK } from '../src/config/networkConfig.ts'
import { parseProfile } from '../src/lib/logParser.ts'
import {
  computeAirtime,
  computeCapacity,
  computeSessionBudget,
  evaluateProfiles,
} from '../src/lib/engine.ts'
import { DEFAULT_NETWORK as BASE } from '../src/config/networkConfig.ts'

const phy = PHY_PROFILES.find((p) => p.id === 'fsk-50')!
const poll = USE_CASES.find((u) => u.id === 'poll-15m')!

console.log('=== Profile parse summary ===')
for (const p of DLMS_PROFILES) {
  const s = parseProfile(p.raw)
  console.log(
    `${p.label.padEnd(26)} txns=${String(s.txnCount).padStart(2)} push=${s.pushCount} ` +
      `req=${String(s.reqBytesTotal).padStart(5)}B resp=${String(s.respBytesTotal).padStart(5)}B ` +
      `total=${String(s.appBytesTotal).padStart(5)}B measuredDur=${(s.measuredDurationMs / 1000).toFixed(2)}s`,
  )
}

console.log('\n=== Airtime sanity (fsk-50) ===')
for (const b of [13, 103, 797]) {
  const a = computeAirtime(b, phy, DEFAULT_NETWORK)
  console.log(`${String(b).padStart(4)}B -> onAir=${a.onAirBytes}B air=${a.totalAirtimeMs.toFixed(2)}ms frags=${a.fragments}`)
}

console.log('\n=== Capacity + session (fsk-50, poll-15m) ===')
for (const p of DLMS_PROFILES) {
  const s = parseProfile(p.raw)
  const cap = computeCapacity(s, phy, DEFAULT_NETWORK, poll)
  const bud = computeSessionBudget(s, phy, DEFAULT_NETWORK)
  console.log(
    `${p.label.padEnd(26)} maxNodes=${String(cap.maxNodes).padStart(5)} (${cap.bottleneck.padEnd(18)}) ` +
      `rf/node=${cap.perNodeRfMs.toFixed(0)}ms modelled=${(bud.totalMs / 1000).toFixed(2)}s measuredCore=${(s.measuredRttMsTotal / 1000).toFixed(2)}s`,
  )
}

console.log('\n=== Feasibility @ 100 nodes · Ideal RF (PER 0, 1 hop) · fsk-50 · poll-15m ===')
const idealNet = { ...BASE, packetErrorRate: 0, hopCount: 1 }
const rows = evaluateProfiles(
  DLMS_PROFILES.map((p) => ({ id: p.id, label: p.label, category: p.category, stats: parseProfile(p.raw) })),
  phy,
  idealNet,
  poll,
  100,
)
for (const r of rows) {
  console.log(
    `${r.label.padEnd(26)} ${r.status.toUpperCase().padEnd(4)} supported=${String(r.nSupported).padStart(5)} ` +
      `heaviestStep=${r.maxStepChannelMs.toFixed(0)}ms gap@100=${(r.gapAtTargetMs / 1000).toFixed(1)}s ` +
      `util@100=${r.utilAtTargetPct.toFixed(0)}% limitedBy=${r.bottleneck}`,
  )
}

console.log(`\nAssoc timeout = ${idealNet.assocTimeoutMs / 1000}s`)
