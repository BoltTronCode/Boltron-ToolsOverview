/* Ad-hoc verification harness (run: node scripts/verify.ts). Not shipped. */
import { DLMS_PROFILES } from '../src/config/dlmsProfiles.ts'
import { PHY_PROFILES } from '../src/config/phyProfiles.ts'
import { USE_CASES } from '../src/config/useCases.ts'
import { DEFAULT_NETWORK } from '../src/config/networkConfig.ts'
import { parseProfile } from '../src/lib/logParser.ts'
import {
  computeAirtime,
  computeBatch,
  computeCapacity,
  computeFlowDetail,
  computeSessionBudget,
  computeStageBudget,
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

console.log('\n=== Stage timing matrix · Block Load 7 Day @ 100 nodes (defaults) ===')
const b7 = parseProfile(DLMS_PROFILES.find((p) => p.id === 'block-7d')!.raw)
const batch = computeBatch(b7, phy, BASE, poll, 100)
for (const s of batch.stages) {
  console.log(
    `${s.label.padEnd(26)} ${s.serial ? 'serial  ' : 'parallel'} ` +
      `perPkt=${s.perPacketMs.toFixed(1)}ms perNode=${s.perNodeMs.toFixed(0)}ms agg=${(s.aggregateMs / 1000).toFixed(2)}s`,
  )
}
console.log(
  `Bottleneck=${batch.bottleneck.label} throughput=${(batch.batchThroughputMs / 1000).toFixed(1)}s ` +
    `completion=${(batch.batchCompletionMs / 1000).toFixed(1)}s`,
)
console.log(
  `BR backlog=${batch.brBacklogFrames}/${batch.brBufferFrames} overflow=${batch.brOverflow} ` +
    `assocGap=${(batch.assocGapMs / 1000).toFixed(1)}s assocOk=${batch.assocOk} oversize=${batch.oversizeFrame}`,
)

console.log('\n=== Fragmentation impact (Resp airtime, 797B, fsk-50) ===')
for (const fp of [1280, 255, 90]) {
  const a = computeAirtime(797, phy, { ...BASE, fragmentPayloadBytes: fp }, true)
  console.log(`fragSize=${String(fp).padStart(4)}B -> frags=${a.fragments} air=${a.totalAirtimeMs.toFixed(1)}ms reasm=${a.reassemblyMs.toFixed(1)}ms`)
}
const noFrag = computeAirtime(2000, phy, { ...BASE, fragmentationEnabled: false }, true)
console.log(`No-frag 2000B (PSDU cap ${BASE.maxPhyPayloadBytes}) -> oversize=${noFrag.oversize}`)

console.log('\n=== UART serial reality (115200 vs 921600 baud, 797B) ===')
for (const baud of [115200, 921600]) {
  const ms = ((797 + BASE.brFramingOverheadBytes) * BASE.uartBitsPerByte * 1000) / baud
  console.log(`${String(baud).padStart(7)} baud -> ${ms.toFixed(1)}ms/frame · 100 frames = ${(ms * 100 / 1000).toFixed(2)}s`)
}

console.log('\n=== Data-flow detail cross-check (Block Load 7d, heaviest txn, fsk-50) ===')
{
  const b7stats = parseProfile(DLMS_PROFILES.find((p) => p.id === 'block-7d')!.raw)
  const rep = [...b7stats.transactions].sort((a, b) => b.respBytes - a.respBytes)[0]
  const budget = computeStageBudget(rep.reqBytes, rep.respBytes, phy, BASE, { isPush: rep.isPush })
  const flow = computeFlowDetail(rep.reqBytes, rep.respBytes, phy, BASE, { isPush: rep.isPush })

  // Verify total matches
  const totalMatch = Math.abs(flow.totalMs - budget.totalMs) < 0.01
  console.log(`Total: budget=${budget.totalMs.toFixed(2)}ms flow=${flow.totalMs.toFixed(2)}ms match=${totalMatch}`)
  console.log(`Downlink: budget=${budget.downlinkMs.toFixed(2)}ms flow=${flow.downlinkMs.toFixed(2)}ms`)
  console.log(`Uplink:   budget=${budget.uplinkMs.toFixed(2)}ms flow=${flow.uplinkMs.toFixed(2)}ms`)
  console.log(`Meter:    budget=${budget.meterMs.toFixed(2)}ms flow=${flow.meterMs.toFixed(2)}ms`)

  // Verify each block matches the corresponding stage
  let allMatch = true
  for (const block of flow.blocks) {
    const stage = budget.stages.find((s) => s.key === block.key)
    if (!stage) {
      console.log(`  MISSING STAGE: ${block.key}`)
      allMatch = false
      continue
    }
    const match = Math.abs(block.ms - stage.ms) < 0.01
    if (!match) {
      console.log(`  MISMATCH ${block.key}: stage=${stage.ms.toFixed(3)}ms block=${block.ms.toFixed(3)}ms`)
      allMatch = false
    }
  }
  console.log(`All ${flow.blocks.length} blocks match stage budget: ${allMatch}`)

  // Print the full flow with sub-breakdowns
  console.log('\n--- Full per-stage breakdown ---')
  for (const block of flow.blocks) {
    console.log(`\n#${flow.blocks.indexOf(block) + 1} [${block.group.toUpperCase()}] ${block.label} — ${block.ms.toFixed(2)}ms (${block.pctOfTotal.toFixed(1)}%)`)
    console.log(`  formula: ${block.formula}`)
    console.log(`  params:  ${block.params.map((p) => `${p.label}=${p.value}`).join(', ')}`)
    if (block.subBreakdown.length > 0) {
      const subSum = block.subBreakdown.reduce((a, s) => a + s.ms, 0)
      console.log(`  sub:     ${block.subBreakdown.map((s) => `${s.label}=${s.ms.toFixed(2)}ms`).join(' + ')}`)
      console.log(`  sub sum: ${subSum.toFixed(2)}ms (stage=${block.ms.toFixed(2)}ms)`)
    }
  }
}
