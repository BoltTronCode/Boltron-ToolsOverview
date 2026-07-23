/**
 * Core modelling engine: WiSUN airtime, end-to-end latency budget and
 * fleet-capacity ("how many nodes") calculation.
 *
 * All timings are in milliseconds unless stated otherwise. The model is a
 * transparent, first-principles analytical model — every term maps to an
 * editable network parameter so results are explainable and auditable.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type {
  AirtimeResult,
  CapacityResult,
  LatencyBudget,
  LatencyStage,
  NetworkParams,
  PhyProfile,
  ProfileStats,
  UseCase,
} from './types'

/** Bits transmitted per byte on the WiSUN channel is simply 8. */
const BITS = 8

/** Serialization time (ms) for `bytes` at `kbps`. ms = bits / kbps. */
function serializeMs(bytes: number, kbps: number): number {
  if (kbps <= 0) return Infinity
  return (bytes * BITS) / kbps
}

/**
 * WiSUN airtime for `appBytes` of application payload (the DLMS-wrapper frame
 * that rides in the UDP payload). Accounts for 6LoWPAN fragmentation, per-frame
 * lower-layer headers, PHY preamble/header, MAC ACK, CSMA/CA, mesh hops and
 * retransmissions from PER.
 */
export function computeAirtime(
  appBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
): AirtimeResult {
  if (appBytes <= 0) {
    return {
      appBytes: 0,
      fragments: 0,
      onAirBytes: 0,
      frameAirtimeMs: 0,
      ackAirtimeMs: 0,
      csmaMs: 0,
      perHopMs: 0,
      retransFactor: 1,
      totalAirtimeMs: 0,
    }
  }

  const rate = phy.dataRateKbps
  const perFrameFixed = phy.preambleBytes + phy.phyHeaderBytes + net.macHeaderBytes + net.macFcsBytes
  const usablePerFrag = Math.max(1, net.maxPhyPayloadBytes)
  const fragments = Math.max(1, Math.ceil(appBytes / usablePerFrag))

  // Total on-air bytes = payload + per-fragment (6LoWPAN + MAC + PHY) overhead.
  const onAirBytes =
    appBytes + fragments * (net.lowpanHeaderBytes + perFrameFixed)

  const frameAirtimeMs = serializeMs(onAirBytes, rate)

  const ackFrameBytes = phy.preambleBytes + phy.phyHeaderBytes + net.macAckBytes
  const ackAirtimeMs = net.useMacAck ? fragments * serializeMs(ackFrameBytes, rate) : 0

  const csmaMs = fragments * (net.csmaAvgBackoffMs + net.ifsMs)

  const perHopMs = frameAirtimeMs + ackAirtimeMs + csmaMs
  const retransFactor = net.packetErrorRate >= 1 ? Infinity : 1 / (1 - net.packetErrorRate)
  const totalAirtimeMs = perHopMs * Math.max(1, net.hopCount) * retransFactor

  return {
    appBytes,
    fragments,
    onAirBytes,
    frameAirtimeMs,
    ackAirtimeMs,
    csmaMs,
    perHopMs,
    retransFactor,
    totalAirtimeMs,
  }
}

/** Extra MQTT handshake latency (ms) implied by the QoS level over cellular. */
function mqttHandshakeMs(net: NetworkParams): number {
  if (net.mqttQos === 2) return 2 * net.cellularRttMs // PUBREC + PUBCOMP round trips
  if (net.mqttQos === 1) return net.cellularRttMs // PUBACK round trip
  return 0
}

/** UART transfer time (ms) for an application frame of `bytes`. */
function uartMs(bytes: number, net: NetworkParams): number {
  if (bytes <= 0) return 0
  return ((bytes + net.brFramingOverheadBytes) * net.uartBitsPerByte * 1000) / net.uartBaud
}

/**
 * End-to-end latency budget for ONE transaction (request down, response up).
 * `isPush` transactions skip the downlink request path (meter originates).
 */
export function computeStageBudget(
  reqBytes: number,
  respBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
  opts: { isPush?: boolean; measuredRttMs?: number | null } = {},
): LatencyBudget {
  const isPush = opts.isPush ?? false
  const cellOneWay = net.cellularRttMs / 2
  const hs = mqttHandshakeMs(net)
  const qos2 = net.piNicQos2 ? net.piNicQos2Ms : 0
  const stages: LatencyStage[] = []

  const rfDown = computeAirtime(reqBytes, phy, net)
  const rfUp = computeAirtime(respBytes, phy, net)

  if (!isPush) {
    stages.push({
      key: 'hes-nms-down',
      label: 'HES → NMS',
      group: 'downlink',
      ms: net.brokerToHesMs,
      detail: 'Head-end to NMS backhaul (one way)',
    })
    stages.push({
      key: 'cell-down',
      label: 'NMS → Gateway (4G)',
      group: 'downlink',
      ms: cellOneWay + serializeMs(reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps) + hs,
      detail: `Cellular one-way + MQTT publish (${reqBytes} B) + QoS${net.mqttQos} handshake`,
    })
    stages.push({
      key: 'gw-down',
      label: 'MQTT → UDP (gateway)',
      group: 'downlink',
      ms: net.gwMqttToUdpMs,
      detail: 'Parse MQTT, MeterID → IPv6 lookup, build UDP datagram',
    })
    stages.push({
      key: 'uart-down',
      label: 'UART → Border Router',
      group: 'downlink',
      ms: uartMs(reqBytes, net),
      detail: `Pi ↔ BR serial @ ${net.uartBaud} baud`,
    })
    if (qos2 > 0)
      stages.push({
        key: 'qos2-down',
        label: 'Pi ↔ RF-NIC QoS2',
        group: 'downlink',
        ms: qos2,
        detail: 'Exactly-once (QoS2) handshake between Pi and RF NIC',
      })
    stages.push({
      key: 'rf-down',
      label: 'WiSUN RF (downlink)',
      group: 'downlink',
      ms: rfDown.totalAirtimeMs,
      detail: `${rfDown.fragments} frag · ${rfDown.onAirBytes} B on-air · ${net.hopCount} hop(s)`,
    })
  }

  stages.push({
    key: 'meter',
    label: 'Meter processing',
    group: 'meter',
    ms: net.meterProcessingMs,
    detail: 'DLMS request handling inside the meter',
  })

  stages.push({
    key: 'rf-up',
    label: 'WiSUN RF (uplink)',
    group: 'uplink',
    ms: rfUp.totalAirtimeMs,
    detail: `${rfUp.fragments} frag · ${rfUp.onAirBytes} B on-air · ${net.hopCount} hop(s)`,
  })
  if (qos2 > 0)
    stages.push({
      key: 'qos2-up',
      label: 'RF-NIC ↔ Pi QoS2',
      group: 'uplink',
      ms: qos2,
      detail: 'Exactly-once (QoS2) handshake between RF NIC and Pi',
    })
  stages.push({
    key: 'uart-up',
    label: 'Border Router → UART',
    group: 'uplink',
    ms: uartMs(respBytes, net),
    detail: `Pi ↔ BR serial @ ${net.uartBaud} baud`,
  })
  stages.push({
    key: 'gw-up',
    label: 'UDP → MQTT (gateway)',
    group: 'uplink',
    ms: net.gwUdpToMqttMs,
    detail: 'Parse UDP, IPv6 → MeterID, publish MQTT',
  })
  stages.push({
    key: 'cell-up',
    label: 'Gateway → NMS (4G)',
    group: 'uplink',
    ms: cellOneWay + serializeMs(respBytes + net.mqttOverheadBytes, net.cellularThroughputKbps) + hs,
    detail: `MQTT publish (${respBytes} B) + QoS${net.mqttQos} handshake + cellular one-way`,
  })
  stages.push({
    key: 'nms-hes-up',
    label: 'NMS → HES',
    group: 'uplink',
    ms: net.brokerToHesMs,
    detail: 'NMS to head-end backhaul (one way)',
  })

  const sum = (g: LatencyStage['group']) =>
    stages.filter((s) => s.group === g).reduce((a, s) => a + s.ms, 0)
  const downlinkMs = sum('downlink')
  const uplinkMs = sum('uplink')
  const meterMs = sum('meter')

  return {
    stages,
    totalMs: downlinkMs + uplinkMs + meterMs,
    downlinkMs,
    uplinkMs,
    meterMs,
    measuredRttMs: opts.measuredRttMs ?? null,
  }
}

/**
 * Aggregate the modelled end-to-end time to run an ENTIRE profile session for a
 * single meter (transactions are sequential in DLMS).
 */
export function computeSessionBudget(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
): LatencyBudget {
  const acc: Record<string, LatencyStage> = {}
  let downlinkMs = 0
  let uplinkMs = 0
  let meterMs = 0

  for (const t of stats.transactions) {
    const b = computeStageBudget(t.reqBytes, t.respBytes, phy, net, { isPush: t.isPush })
    downlinkMs += b.downlinkMs
    uplinkMs += b.uplinkMs
    meterMs += b.meterMs
    for (const s of b.stages) {
      if (!acc[s.key]) acc[s.key] = { ...s }
      else acc[s.key].ms += s.ms
    }
  }

  const stages = Object.values(acc)
  return {
    stages,
    totalMs: downlinkMs + uplinkMs + meterMs,
    downlinkMs,
    uplinkMs,
    meterMs,
    measuredRttMs: stats.measuredRttMsTotal || null,
  }
}

/** Channel busy time (ms) contributed by one meter running the profile once. */
export function perNodeChannelMs(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
): number {
  let ms = 0
  for (const t of stats.transactions) {
    ms += computeAirtime(t.reqBytes, phy, net).totalAirtimeMs
    ms += computeAirtime(t.respBytes, phy, net).totalAirtimeMs
  }
  return ms
}

/**
 * Channel occupancy (ms) of each individual transaction STEP (request +
 * response airtime, both directions). In the parallel poll model every meter
 * advances through these steps together, so the heaviest step governs the
 * worst-case inter-message gap that the meter association timeout must survive.
 */
export function stepChannelTimes(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
): number[] {
  return stats.transactions.map(
    (t) =>
      computeAirtime(t.reqBytes, phy, net).totalAirtimeMs +
      computeAirtime(t.respBytes, phy, net).totalAirtimeMs,
  )
}

/**
 * Fleet capacity under the PARALLEL poll model: every meter is polled at the
 * same time and the single BR radio serialises all frames round-robin per step.
 *
 * Two independent limits are evaluated:
 *  - Channel saturation : Σ per-node channel time must fit the poll cycle.
 *  - Association timeout : for one meter, the gap between consecutive messages
 *    (while the radio services the other N-1 meters at the heaviest step) must
 *    stay below the meter's association inactivity timeout, else it drops.
 *
 * Also checks UART, 4G/MQTT backhaul and gateway CPU. Returns the binding one.
 */
export function computeCapacity(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  useCase: UseCase,
  targetNodes = 100,
): CapacityResult {
  const cycleMs = useCase.cycleSeconds * 1000

  // ---- Per-node cost on each shared resource ----
  const perNodeRfMs = perNodeChannelMs(stats, phy, net)
  const steps = stepChannelTimes(stats, phy, net)
  const maxStepChannelMs = steps.length ? Math.max(...steps) : 0

  let perNodeUartMs = 0
  let perNodeCellularMs = 0
  for (const t of stats.transactions) {
    perNodeUartMs += uartMs(t.reqBytes, net) + uartMs(t.respBytes, net)
    if (t.reqBytes > 0)
      perNodeCellularMs += serializeMs(t.reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
    if (t.respBytes > 0)
      perNodeCellularMs += serializeMs(
        t.respBytes + net.mqttOverheadBytes,
        net.cellularThroughputKbps,
      )
  }
  const txns = stats.txnCount + stats.pushCount
  const perNodeGwMs = (txns / net.gwMaxTxnPerSec) * 1000

  // ---- Usable fraction of each resource ----
  const rfCap = Math.min(net.channelUtilizationMax, net.dutyCycleLimit)
  const otherCap = net.channelUtilizationMax

  const nodesFor = (perNodeMs: number, cap: number) =>
    perNodeMs <= 0 ? Infinity : Math.floor((cycleMs * cap) / perNodeMs)

  const maxNodesRf = nodesFor(perNodeRfMs, rfCap)
  const maxNodesUart = nodesFor(perNodeUartMs, otherCap)
  const maxNodesCellular = nodesFor(perNodeCellularMs, otherCap)
  const maxNodesGw = nodesFor(perNodeGwMs, otherCap)

  // Association-timeout limit: worst-case gap for a meter ≈ N × heaviest step
  // (the radio is busy with the other meters between its two messages).
  const gapAt = (nodes: number) => nodes * maxStepChannelMs
  const maxNodesAssoc =
    maxStepChannelMs <= 0 ? Infinity : Math.floor(net.assocTimeoutMs / maxStepChannelMs)

  const candidates: Array<{ name: string; nodes: number }> = [
    { name: 'WiSUN RF channel', nodes: maxNodesRf },
    { name: 'Association timeout', nodes: maxNodesAssoc },
    { name: 'Pi ↔ BR UART', nodes: maxNodesUart },
    { name: '4G / MQTT backhaul', nodes: maxNodesCellular },
    { name: 'Gateway CPU', nodes: maxNodesGw },
  ]
  const binding = candidates.reduce((a, b) => (b.nodes < a.nodes ? b : a))

  const gapAtTargetMs = gapAt(targetNodes)
  const statusAtTarget: CapacityResult['statusAtTarget'] =
    targetNodes <= binding.nodes ? 'ok' : targetNodes <= binding.nodes * 1.15 ? 'warn' : 'fail'

  return {
    perNodeRfMs,
    perNodeUartMs,
    perNodeCellularMs,
    perNodeGwMs,
    maxStepChannelMs,
    maxNodesRf,
    maxNodesUart,
    maxNodesCellular,
    maxNodesGw,
    maxNodesAssoc,
    maxNodes: binding.nodes,
    bottleneck: binding.name,
    cycleSeconds: useCase.cycleSeconds,
    targetNodes,
    gapAtTargetMs,
    statusAtTarget,
    channelUtilPercentAt: (nodes: number) => (nodes * perNodeRfMs * 100) / (cycleMs * rfCap),
    gapAt,
  }
}

/**
 * Evaluate EVERY DLMS profile at the chosen target fleet size and classify it
 * as ok / warn / fail — the "which use-cases have an issue?" matrix.
 */
export function evaluateProfiles(
  profiles: { id: string; label: string; category: string; stats: ProfileStats }[],
  phy: PhyProfile,
  net: NetworkParams,
  useCase: UseCase,
  targetNodes: number,
): import('./types').ProfileSupport[] {
  return profiles.map((p) => {
    const cap = computeCapacity(p.stats, phy, net, useCase, targetNodes)
    return {
      id: p.id,
      label: p.label,
      category: p.category,
      reqBytesTotal: p.stats.reqBytesTotal,
      respBytesTotal: p.stats.respBytesTotal,
      txnCount: p.stats.txnCount,
      perNodeChannelMs: cap.perNodeRfMs,
      maxStepChannelMs: cap.maxStepChannelMs,
      maxNodesRf: cap.maxNodesRf,
      maxNodesAssoc: cap.maxNodesAssoc,
      nSupported: cap.maxNodes,
      bottleneck: cap.bottleneck,
      gapAtTargetMs: cap.gapAtTargetMs,
      utilAtTargetPct: cap.channelUtilPercentAt(targetNodes),
      status: cap.statusAtTarget,
    }
  })
}
