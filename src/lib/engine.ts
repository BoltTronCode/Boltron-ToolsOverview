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
  BatchAnalysis,
  CapacityResult,
  FlowBlockDetail,
  FlowDetail,
  FlowParam,
  FlowSubBreakdown,
  LatencyBudget,
  LatencyStage,
  NetworkParams,
  PhyProfile,
  ProfileStats,
  StageTiming,
  TopologyScenario,
  UseCase,
} from './types'

/** Bits transmitted per byte on the WiSUN channel is simply 8. */
const BITS = 8

/** Serialization time (ms) for `bytes` at `kbps`. ms = bits / kbps. */
function serializeMs(bytes: number, kbps: number): number {
  if (kbps <= 0) return Infinity
  return (bytes * BITS) / kbps
}

function clampPer(p: number): number {
  return Math.min(0.999, Math.max(0, p))
}

function packetCount(appBytes: number, net: NetworkParams, isResponse = true): number {
  if (appBytes <= 0) return 0
  const packetizationAllowed = net.fragmentationEnabled && (isResponse || net.fragmentRequests)
  return packetizationAllowed ? Math.max(1, Math.ceil(appBytes / Math.max(1, net.fragmentPayloadBytes))) : 1
}

function packetHeaderBytes(packets: number, net: NetworkParams): number {
  return packets > 1 ? net.fragHeaderBytes : 0
}

function effectiveRetransFactor(net: NetworkParams): number {
  const basePer = clampPer(net.packetErrorRate)
  const poorShare = clampPer(net.poorLinkShare)
  const poorPer = clampPer(basePer + net.poorLinkExtraPer)
  return (1 - poorShare) * (1 / Math.max(1e-9, 1 - basePer)) + poorShare * (1 / Math.max(1e-9, 1 - poorPer))
}

function effectiveRfPer(net: NetworkParams): number {
  const retrans = effectiveRetransFactor(net)
  return retrans <= 1 ? clampPer(net.packetErrorRate) : 1 - 1 / retrans
}

function responseSpreadMs(maxDelayMs: number, nodes: number): number {
  if (maxDelayMs <= 0 || nodes <= 1) return 0
  return (maxDelayMs * (nodes - 1)) / (nodes + 1)
}

const ZERO_AIRTIME: AirtimeResult = {
  appBytes: 0,
  fragments: 0,
  onAirBytes: 0,
  frameAirtimeMs: 0,
  ackAirtimeMs: 0,
  csmaMs: 0,
  perHopMs: 0,
  retransFactor: 1,
  totalAirtimeMs: 0,
  reassemblyMs: 0,
  oversize: false,
}

/**
 * WiSUN airtime for `appBytes` of application payload (the DLMS-wrapper frame
 * that rides in the UDP payload). Accounts for application-layer UDP
 * packetization, per-packet lower-layer headers, PHY preamble/header, MAC ACK,
 * CSMA/CA, minimum TX-off time, frequency-hopping rendezvous wait, mesh hops,
 * and RF retransmissions.
 *
 * By default large uplink responses packetize and downlink requests do not.
 * `net.fragmentRequests` enables request packetization too (e.g. FOTA chunks).
 */
function computeAirtimeForHops(
  appBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
  airHops: number,
  isResponse = true,
): AirtimeResult {
  if (appBytes <= 0) return { ...ZERO_AIRTIME }

  const rate = phy.dataRateKbps
  const perFrameFixed = phy.preambleBytes + phy.phyHeaderBytes + net.macHeaderBytes + net.macFcsBytes
  const fragments = packetCount(appBytes, net, isResponse)
  const fragHdr = packetHeaderBytes(fragments, net)
  const oversize =
    fragments === 1 && appBytes + net.lowpanHeaderBytes + fragHdr + perFrameFixed > net.maxPhyPayloadBytes

  const onAirBytes = appBytes + fragments * (net.lowpanHeaderBytes + fragHdr + perFrameFixed)
  const frameAirtimeMs = serializeMs(onAirBytes, rate)

  const ackFrameBytes = phy.preambleBytes + phy.phyHeaderBytes + net.macAckBytes
  const ackAirtimeMs = net.useMacAck ? fragments * serializeMs(ackFrameBytes, rate) : 0

  const fhMs = net.freqHoppingEnabled ? fragments * (net.unicastDwellMs / 2) : 0
  const txOffMs = fragments * net.minTxOffMs
  const csmaMs = fragments * (net.csmaAvgBackoffMs + net.ifsMs) + fhMs + txOffMs

  const reassemblyMs = fragments > 1 ? fragments * net.reassemblyMsPerFragment : 0

  const perHopMs = frameAirtimeMs + ackAirtimeMs + csmaMs
  const retransFactor = effectiveRetransFactor(net)
  const totalAirtimeMs = perHopMs * Math.max(1, airHops) * retransFactor

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
    reassemblyMs,
    oversize,
  }
}

export function computeAirtime(
  appBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
  isResponse = true,
): AirtimeResult {
  return computeAirtimeForHops(appBytes, phy, net, Math.max(1, net.hopCount), isResponse)
}

/** Expected UDP app-layer QoS2 latency (ms), including expected retries. */
export function qos2UdpAppMs(net: NetworkParams): number {
  if (!net.udpAppQos2) return 0
  const per = clampPer(net.udpAppAckLossRate)
  const expRetries = Math.min(net.qos2MaxRetries, per / Math.max(1e-9, 1 - per))
  return net.udpAppQos2Ms + net.qos2InterPacketMs + expRetries * net.qos2RetryWindowMs
}

function qos2UdpAppTotalMs(net: NetworkParams, packets: number): number {
  return packets <= 0 ? 0 : packets * qos2UdpAppMs(net)
}

/** Extra MQTT handshake latency (ms) implied by the QoS level over cellular. */
function mqttHandshakeMs(net: NetworkParams): number {
  if (net.mqttQos === 2) return 2 * net.cellularRttMs // PUBREC + PUBCOMP round trips
  if (net.mqttQos === 1) return net.cellularRttMs // PUBACK round trip
  return 0
}

/** Total UART time (ms) for an application exchange after UDP app packetization. */
function totalUartMs(bytes: number, net: NetworkParams, isResponse = true): number {
  if (bytes <= 0) return 0
  const packets = packetCount(bytes, net, isResponse)
  return ((bytes + packets * (packetHeaderBytes(packets, net) + net.brFramingOverheadBytes)) * net.uartBitsPerByte * 1000) / net.uartBaud
}

function piPacketPathMs(baseMs: number, bytes: number, net: NetworkParams, isResponse = true): number {
  const packets = packetCount(bytes, net, isResponse)
  if (packets <= 0) return 0
  return packets * (baseMs + net.osSchedulingMs + net.piSelectPollMs) * net.piLoadFactor
}

function rnLatencyMs(packets: number, net: NetworkParams): number {
  return packets <= 0 ? 0 : packets * (net.brProcessingMsPerFrame + net.rnThreadDelayMs)
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
  const reqPackets = packetCount(reqBytes, net, false)
  const respPackets = packetCount(respBytes, net, true)
  const qos2Down = qos2UdpAppTotalMs(net, reqPackets)
  const qos2Up = qos2UdpAppTotalMs(net, respPackets)
  const stages: LatencyStage[] = []

  const rfDown = computeAirtime(reqBytes, phy, net, false)
  const rfUp = computeAirtime(respBytes, phy, net, true)

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
      label: 'NMS → Gateway (EC200U/4G)',
      group: 'downlink',
      ms: cellOneWay + serializeMs(reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps) + hs,
      detail: `Cellular one-way + MQTT publish (${reqBytes} B) + QoS${net.mqttQos} handshake`,
    })
    stages.push({
      key: 'gw-down',
      label: 'Pi app: MQTT → IPv6/UDP',
      group: 'downlink',
      ms: piPacketPathMs(net.gwMqttToUdpMs, reqBytes, net, false),
      detail: `Parse + MeterID→IPv6 lookup + packetization into ${reqPackets || 1} UDP app packet(s) · ×${net.piLoadFactor} load`,
    })
    if (qos2Down > 0)
      stages.push({
        key: 'qos2-down',
        label: 'UDP app-layer QoS2',
        group: 'downlink',
        ms: qos2Down,
        detail: `${reqPackets} packet(s) × exactly-once control (retry win ${net.qos2RetryWindowMs}ms, ≤${net.qos2MaxRetries} retries)`,
      })
    stages.push({
      key: 'uart-down',
      label: 'wfantund / Spinel → UART',
      group: 'downlink',
      ms: totalUartMs(reqBytes, net, false),
      detail: `Linux wfantund marshals ${reqPackets || 1} UDP app packet(s) into Spinel/HDLC over UART @ ${net.uartBaud} baud`,
    })
    stages.push({
      key: 'rn-down',
      label: 'BR NWP / RN thread (downlink)',
      group: 'downlink',
      ms: rnLatencyMs(rfDown.fragments, net),
      detail: `BR/NWP packet handling + RN RTOS thread delay ${net.rnThreadDelayMs}ms per packet`,
    })
    stages.push({
      key: 'rf-down',
      label: 'WiSUN RF (downlink)',
      group: 'downlink',
      ms: rfDown.totalAirtimeMs,
      detail: `${rfDown.fragments} UDP app packet(s) · ${rfDown.onAirBytes} B on-air · ${net.hopCount} hop(s)${net.freqHoppingEnabled ? ' · FH rendezvous' : ''}`,
    })
  }

  stages.push({
    key: 'meter',
    label: 'Meter processing',
    group: 'meter',
    ms: net.meterProcessingMs,
    detail: 'DLMS request handling inside the meter',
  })

  if (net.respRandomDelayMaxMs > 0)
    stages.push({
      key: 'resp-delay',
      label: 'Randomised response delay',
      group: 'uplink',
      ms: net.respRandomDelayMaxMs / 2,
      detail: `Each node independently draws a delay in [0, ${net.respRandomDelayMaxMs}] ms; single-meter latency uses the mean wait`,
    })
  stages.push({
    key: 'rf-up',
    label: 'WiSUN RF (uplink)',
    group: 'uplink',
    ms: rfUp.totalAirtimeMs,
    detail: `${rfUp.fragments} UDP app packet(s) · ${rfUp.onAirBytes} B on-air · ${net.hopCount} hop(s)${net.freqHoppingEnabled ? ' · FH rendezvous' : ''}`,
  })
  stages.push({
    key: 'rn-up',
    label: 'BR NWP / RN thread (uplink)',
    group: 'uplink',
    ms: rnLatencyMs(rfUp.fragments, net),
    detail: `RN RTOS thread delay ${net.rnThreadDelayMs}ms + BR/NWP packet handling per packet`,
  })
  stages.push({
    key: 'uart-up',
    label: 'UART → wfantund / Spinel',
    group: 'uplink',
    ms: totalUartMs(respBytes, net, true),
    detail: `BR/NWP sends ${respPackets || 1} packetized UDP app payload(s) over UART @ ${net.uartBaud} baud into Linux wfantund`,
  })
  if (rfUp.reassemblyMs > 0)
    stages.push({
      key: 'reassembly',
      label: 'UDP app reassembly',
      group: 'uplink',
      ms: rfUp.reassemblyMs,
      detail: `${rfUp.fragments} packet(s) × ${net.reassemblyMsPerFragment} ms at the Pi UDP application`,
    })
  if (qos2Up > 0)
    stages.push({
      key: 'qos2-up',
      label: 'UDP app-layer QoS2 ACK',
      group: 'uplink',
      ms: qos2Up,
      detail: `Application-layer ACK / duplicate suppression for ${respPackets} UDP packet(s)`,
    })
  stages.push({
    key: 'gw-up',
    label: 'Pi app: IPv6/UDP → MQTT',
    group: 'uplink',
    ms: piPacketPathMs(net.gwUdpToMqttMs, respBytes, net, true) + rfUp.reassemblyMs,
    detail: `Receive packetized UDP payload(s), reassemble at the Pi app, reverse IPv6→MeterID lookup, then publish MQTT · ×${net.piLoadFactor} load`,
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

/** One topology bucket with a normalized fraction. */
function topologyBuckets(net: NetworkParams, topology?: TopologyScenario) {
  if (!topology) {
    return [{ airHops: Math.max(1, net.hopCount), fraction: 1, label: `${Math.max(1, net.hopCount)} air hop(s)` }]
  }
  const sum = topology.buckets.reduce((a, b) => a + b.percent, 0)
  const scale = sum > 0 ? 1 / sum : 0
  return topology.buckets.map((b) => ({ airHops: Math.max(1, b.airHops), fraction: b.percent * scale, label: b.label }))
}

/** Channel busy time (ms) contributed by one meter at a given air-hop depth. */
function perNodeChannelMsForHops(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  airHops: number,
): number {
  let ms = 0
  for (const t of stats.transactions) {
    ms += computeAirtimeForHops(t.reqBytes, phy, net, airHops, false).totalAirtimeMs
    ms += computeAirtimeForHops(t.respBytes, phy, net, airHops, true).totalAirtimeMs
  }
  return ms
}

/** Weighted channel busy time (ms) for one fleet-average meter under a topology. */
export function perNodeChannelMs(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  topology?: TopologyScenario,
): number {
  return topologyBuckets(net, topology).reduce(
    (a, b) => a + b.fraction * perNodeChannelMsForHops(stats, phy, net, b.airHops),
    0,
  )
}

/**
 * Channel occupancy (ms) of each individual transaction STEP (request +
 * response airtime, both directions), weighted by the fleet topology.
 */
export function stepChannelTimes(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  topology?: TopologyScenario,
): number[] {
  const buckets = topologyBuckets(net, topology)
  return stats.transactions.map((t) =>
    buckets.reduce(
      (acc, b) =>
        acc +
        b.fraction *
          (computeAirtimeForHops(t.reqBytes, phy, net, b.airHops, false).totalAirtimeMs +
            computeAirtimeForHops(t.respBytes, phy, net, b.airHops, true).totalAirtimeMs),
      0,
    ),
  )
}

/** Per-node time on each direction of the (full-duplex) UART line. */
function perNodeUartSplit(stats: ProfileStats, net: NetworkParams) {
  let tx = 0
  let rx = 0
  for (const t of stats.transactions) {
    tx += totalUartMs(t.reqBytes, net, false)
    rx += totalUartMs(t.respBytes, net, true)
  }
  return { tx, rx }
}

/** Per-node Pi CPU (Python) time for the whole session, both directions. */
function perNodePi(stats: ProfileStats, net: NetworkParams): number {
  let total = 0
  for (const t of stats.transactions) {
    total += piPacketPathMs(net.gwMqttToUdpMs, t.reqBytes, net, false)
    total += piPacketPathMs(net.gwUdpToMqttMs, t.respBytes, net, true)
    total += packetCount(t.respBytes, net, true) > 1 ? packetCount(t.respBytes, net, true) * net.reassemblyMsPerFragment : 0
  }
  return total / Math.max(1, net.piConcurrency)
}

/** Per-node BR MCU processing time for the whole session (both directions). */
function perNodeBr(stats: ProfileStats, phy: PhyProfile, net: NetworkParams): number {
  let frames = 0
  for (const t of stats.transactions) {
    frames += computeAirtime(t.reqBytes, phy, net, false).fragments
    frames += computeAirtime(t.respBytes, phy, net, true).fragments
  }
  return frames * net.brProcessingMsPerFrame
}

/**
 * Fleet capacity under the selected use-case and topology.
 *
 * For parallel poll scenarios the shared BR radio serialises every meter step by
 * step, so the heaviest weighted step governs the association-gap limit.
 * For non-parallel / push scenarios, association gap is not a fleet-wide limit
 * because traffic is spread across the cycle instead of forming one synchronized wave.
 */
export function computeCapacity(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  useCase: UseCase,
  targetNodes = 100,
  topology?: TopologyScenario,
): CapacityResult {
  const cycleMs = useCase.cycleSeconds * 1000
  const buckets = topologyBuckets(net, topology)
  const topologyWeightedAirHops = buckets.reduce((a, b) => a + b.airHops * b.fraction, 0)
  const topologyWorstAirHops = buckets.reduce((a, b) => Math.max(a, b.airHops), 1)

  const perNodeRfMs = perNodeChannelMs(stats, phy, net, topology)
  const steps = stepChannelTimes(stats, phy, net, topology)
  const maxStepChannelMs = steps.length ? Math.max(...steps) : 0
  const { tx: perNodeUartTxMs, rx: perNodeUartRxMs } = perNodeUartSplit(stats, net)
  const perNodeUartBindingMs = net.uartFullDuplex
    ? Math.max(perNodeUartTxMs, perNodeUartRxMs)
    : perNodeUartTxMs + perNodeUartRxMs
  const perNodeUartMs = perNodeUartTxMs + perNodeUartRxMs

  let perNodeCellularMs = 0
  for (const t of stats.transactions) {
    if (t.reqBytes > 0)
      perNodeCellularMs += serializeMs(t.reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
    if (t.respBytes > 0)
      perNodeCellularMs += serializeMs(t.respBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
  }
  const perNodePiMs = perNodePi(stats, net)
  const perNodeBrMs = perNodeBr(stats, phy, net)
  const txns = stats.txnCount + stats.pushCount
  const perNodeGwMs = (txns / net.gwMaxTxnPerSec) * 1000
  const effectivePacketErrorRate = effectiveRfPer(net)

  const rfCap = Math.min(net.channelUtilizationMax, net.dutyCycleLimit)
  const otherCap = net.channelUtilizationMax
  const nodesFor = (perNodeMs: number, cap: number) =>
    perNodeMs <= 0 ? Infinity : Math.floor((cycleMs * cap) / perNodeMs)

  const maxNodesRf = nodesFor(perNodeRfMs, rfCap)
  const maxNodesUart = nodesFor(perNodeUartBindingMs, otherCap)
  const maxNodesCellular = nodesFor(perNodeCellularMs, otherCap)
  const maxNodesPi = nodesFor(perNodePiMs, otherCap)
  const maxNodesBr = nodesFor(perNodeBrMs, otherCap)
  const maxNodesGw = nodesFor(perNodeGwMs, otherCap)

  const assocApplies = useCase.kind === 'poll' && useCase.parallel
  const activeWave = (nodes: number) =>
    assocApplies && net.throttlingEnabled ? Math.min(net.throttleWindowNodes, nodes) : nodes
  const spreadAt = (nodes: number) =>
    assocApplies ? responseSpreadMs(net.respRandomDelayMaxMs, activeWave(nodes)) : 0
  const gapAt = (nodes: number) => (assocApplies ? activeWave(nodes) * maxStepChannelMs + spreadAt(nodes) : 0)

  function assocCapacityLimit(): number {
    if (!assocApplies || maxStepChannelMs <= 0) return Infinity
    if (net.throttlingEnabled && gapAt(net.throttleWindowNodes) <= net.assocTimeoutMs) return Infinity

    let lo = 0
    let hi = 1
    while (hi < 1_000_000 && gapAt(hi) <= net.assocTimeoutMs) hi *= 2
    if (hi >= 1_000_000 && gapAt(hi) <= net.assocTimeoutMs) return Infinity

    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (gapAt(mid) <= net.assocTimeoutMs) lo = mid
      else hi = mid
    }
    return lo
  }

  const maxNodesAssoc = assocCapacityLimit()

  const candidates: Array<{ name: string; nodes: number }> = [
    { name: 'WiSUN RF channel', nodes: maxNodesRf },
    { name: 'Association timeout', nodes: maxNodesAssoc },
    { name: 'Pi ↔ BR UART', nodes: maxNodesUart },
    { name: 'Pi Zero 2 W service CPU', nodes: maxNodesPi },
    { name: 'BR MCU', nodes: maxNodesBr },
    { name: '4G / MQTT backhaul', nodes: maxNodesCellular },
  ]
  const binding = candidates.reduce((a, b) => (b.nodes < a.nodes ? b : a))

  const gapAtTargetMs = gapAt(targetNodes)
  const responseSpreadMsAtTarget = spreadAt(targetNodes)
  const statusAtTarget: CapacityResult['statusAtTarget'] =
    targetNodes <= binding.nodes ? 'ok' : targetNodes <= binding.nodes * 1.15 ? 'warn' : 'fail'

  return {
    perNodeRfMs,
    perNodeUartMs,
    perNodeUartTxMs,
    perNodeUartRxMs,
    perNodeCellularMs,
    perNodePiMs,
    perNodeBrMs,
    perNodeGwMs,
    topologyWeightedAirHops,
    topologyWorstAirHops,
    effectivePacketErrorRate,
    responseSpreadMsAtTarget,
    maxStepChannelMs,
    maxNodesRf,
    maxNodesUart,
    maxNodesCellular,
    maxNodesPi,
    maxNodesBr,
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
  topology?: TopologyScenario,
): import('./types').ProfileSupport[] {
  return profiles.map((p) => {
    const cap = computeCapacity(p.stats, phy, net, useCase, targetNodes, topology)
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

/**
 * Full timing / queue analysis for polling N meters in parallel. Produces the
 * per-stage timing matrix (per-packet, per-node, and aggregate serial time for
 * N nodes), the pipeline bottleneck, the peak BR receive backlog during an
 * uplink burst, and the association-gap check.
 */
export function computeBatch(
  stats: ProfileStats,
  phy: PhyProfile,
  net: NetworkParams,
  useCase: UseCase,
  nodes: number,
  topology?: TopologyScenario,
): BatchAnalysis {
  const cap = computeCapacity(stats, phy, net, useCase, nodes, topology)
  const assocApplies = useCase.kind === 'poll' && useCase.parallel
  const activeWave = assocApplies && net.throttlingEnabled ? Math.min(net.throttleWindowNodes, nodes) : nodes

  const heaviestReq = Math.max(0, ...stats.transactions.map((t) => t.reqBytes))
  const heaviestResp = Math.max(0, ...stats.transactions.map((t) => t.respBytes))
  const buckets = topologyBuckets(net, topology)
  const dominantAirHops = buckets.reduce((a, b) => (b.fraction > a.fraction ? b : a), buckets[0]).airHops
  const airHeaviestReq = computeAirtimeForHops(heaviestReq, phy, net, dominantAirHops, false)
  const airHeaviestResp = computeAirtimeForHops(heaviestResp, phy, net, dominantAirHops, true)
  const heaviestReqPiMs = piPacketPathMs(net.gwMqttToUdpMs, heaviestReq, net, false)
  const heaviestRespPiMs = piPacketPathMs(net.gwUdpToMqttMs, heaviestResp, net, true) + airHeaviestResp.reassemblyMs
  const perPktPi = Math.max(heaviestReqPiMs, heaviestRespPiMs)
  const oversizeFrame = stats.transactions.some(
    (t) =>
      computeAirtimeForHops(t.reqBytes, phy, net, dominantAirHops, false).oversize ||
      computeAirtimeForHops(t.respBytes, phy, net, dominantAirHops, true).oversize,
  )

  const stage = (
    key: string,
    label: string,
    lane: StageTiming['lane'],
    resource: string,
    serial: boolean,
    perPacketMs: number,
    perNodeMs: number,
    note: string,
  ): StageTiming => ({
    key,
    label,
    lane,
    resource,
    serial,
    perPacketMs,
    perNodeMs,
    aggregateMs: serial ? perNodeMs * nodes : perNodeMs,
    note,
  })

  const stages: StageTiming[] = [
    stage(
      'cell',
      '4G / MQTT backhaul',
      'shared',
      'EC200U link',
      true,
      Math.max(
        serializeMs(heaviestReq + net.mqttOverheadBytes, net.cellularThroughputKbps),
        serializeMs(heaviestResp + net.mqttOverheadBytes, net.cellularThroughputKbps),
      ),
      cap.perNodeCellularMs,
      'Single modem; payload serializes here while MQTT handshakes mainly add latency.',
    ),
    stage(
      'pi',
      'Pi Zero 2 W service CPU',
      'shared',
      'Pi Zero 2 W cores',
      true,
      perPktPi,
      cap.perNodePiMs,
      `Effective service workers ×${net.piConcurrency} on Pi Zero 2 W, load ×${net.piLoadFactor}.`,
    ),
    stage(
      'uart-tx',
      'wfantund / Spinel → UART (downlink)',
      'downlink',
      'UART TX line',
      true,
      totalUartMs(heaviestReq, net, false),
      cap.perNodeUartTxMs,
      'Linux IPv6/TUN traffic is marshalled by wfantund into Spinel/HDLC over UART after any app packetization.',
    ),
    stage(
      'uart-rx',
      'UART → wfantund / Spinel (uplink)',
      'uplink',
      net.uartFullDuplex ? 'UART RX line' : 'UART (shared)',
      true,
      totalUartMs(heaviestResp, net, true),
      cap.perNodeUartRxMs,
      net.uartFullDuplex ? 'Separate RX line, concurrent with TX.' : 'Half-duplex: shares the line with TX.',
    ),
    stage(
      'br',
      'BR MCU processing',
      'shared',
      'BR MCU / NWP',
      true,
      net.brProcessingMsPerFrame * Math.max(airHeaviestReq.fragments, airHeaviestResp.fragments),
      cap.perNodeBrMs,
      'Per-frame NWP / BR processing; RTOS thread delay is latency, not sustained CPU occupancy.',
    ),
    stage(
      'rf',
      'WiSUN RF channel',
      'shared',
      'BR radio (half-duplex)',
      true,
      cap.maxStepChannelMs,
      cap.perNodeRfMs,
      net.freqHoppingEnabled
        ? 'Single radio across a mixed-hop fleet; FH spreads interference but does not multiply BR throughput.'
        : 'Single fixed-channel radio; all links serialize here.',
    ),
    stage(
      'meter',
      'Meter DLMS processing',
      'meter',
      'each meter',
      false,
      net.meterProcessingMs,
      (stats.txnCount + stats.pushCount) * net.meterProcessingMs,
      useCase.kind === 'push'
        ? 'Each meter prepares its PUSH locally; this stage does not serialize on the gateway.'
        : useCase.parallel
          ? 'Runs in parallel across meters — does not limit the gateway.'
          : 'Traffic is spread across the cycle.',
    ),
  ]

  const serialStages = stages.filter((s) => s.serial)
  const bottleneck = serialStages.reduce((a, b) => (b.aggregateMs > a.aggregateMs ? b : a))
  const batchThroughputMs = bottleneck.aggregateMs
  const singlePassLatencyMs = computeSessionBudget(stats, phy, net).totalMs
  const responseSpread = assocApplies ? responseSpreadMs(net.respRandomDelayMaxMs, activeWave) : 0
  const extraResponseTailMs = Math.max(0, responseSpread - net.respRandomDelayMaxMs / 2)
  const batchCompletionMs = batchThroughputMs + singlePassLatencyMs + extraResponseTailMs

  const airRespPerMsg = airHeaviestResp.totalAirtimeMs
  const uartRespPerMsg = totalUartMs(heaviestResp, net, true)
  const ratio = airRespPerMsg > 0 ? airRespPerMsg / Math.max(1e-9, uartRespPerMsg) : 1
  const staggerFactor = 1 + responseSpread / Math.max(1, airRespPerMsg)
  const effectiveBurstNodes = activeWave / staggerFactor
  const brBacklogFrames =
    uartRespPerMsg <= airRespPerMsg
      ? Math.min(activeWave, Math.max(1, Math.ceil(2 / staggerFactor)))
      : Math.max(1, Math.ceil(effectiveBurstNodes * (1 - ratio)))
  const brOverflow = brBacklogFrames > net.brBufferFrames

  return {
    nodes,
    stages,
    bottleneck,
    batchThroughputMs,
    singlePassLatencyMs,
    batchCompletionMs,
    brBacklogFrames,
    brBufferFrames: net.brBufferFrames,
    brOverflow,
    assocGapMs: cap.gapAtTargetMs,
    responseSpreadMs: responseSpread,
    assocTimeoutMs: net.assocTimeoutMs,
    assocOk: useCase.kind !== 'poll' || !useCase.parallel || cap.gapAtTargetMs <= net.assocTimeoutMs,
    oversizeFrame,
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  DATA-FLOW DETAIL — per-stage formula breakdown for the block diagram      */
/* ────────────────────────────────────────────────────────────────────────── */

/** Round to a sensible number of decimals for display. */
function r(n: number, d = 2): number {
  if (!isFinite(n)) return n
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

/** Build a FlowSubBreakdown entry (module-level so buildRfBlock can use it). */
function sub(label: string, ms: number): FlowSubBreakdown {
  return { label, ms: r(ms) }
}

/** Build a FlowParam entry (module-level so buildRfBlock can use it). */
function p(label: string, value: string): FlowParam {
  return { label, value }
}

/** Build the complete per-stage formula / parameter breakdown for one txn. */
export function computeFlowDetail(
  reqBytes: number,
  respBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
  opts: { isPush?: boolean } = {},
): FlowDetail {
  const isPush = opts.isPush ?? false
  const budget = computeStageBudget(reqBytes, respBytes, phy, net, { isPush })
  const rfDown = computeAirtime(reqBytes, phy, net, false)
  const rfUp = computeAirtime(respBytes, phy, net, true)
  const reqPackets = packetCount(reqBytes, net, false)
  const respPackets = packetCount(respBytes, net, true)
  const qos2 = qos2UdpAppMs(net)
  const cellOneWay = net.cellularRttMs / 2
  const hs = mqttHandshakeMs(net)
  const total = budget.totalMs

  const pct = (ms: number) => (total > 0 ? (ms / total) * 100 : 0)

  const blocks: FlowBlockDetail[] = []

  // ── DOWNLINK ──────────────────────────────────────────────────────────
  if (!isPush) {
    // HES → NMS
    blocks.push({
      key: 'hes-nms-down',
      label: 'HES → NMS',
      group: 'downlink',
      ms: r(net.brokerToHesMs),
      formula: 'brokerToHesMs',
      params: [p('brokerToHesMs', `${net.brokerToHesMs} ms`)],
      subBreakdown: [],
      pctOfTotal: pct(net.brokerToHesMs),
    })

    // NMS → Gateway (4G via EC200U over USB)
    const cellSerialDown = serializeMs(reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
    blocks.push({
      key: 'cell-down',
      label: 'NMS → Gateway (4G/EC200U)',
      group: 'downlink',
      ms: r(budget.stages.find((s) => s.key === 'cell-down')?.ms ?? 0),
      formula: '(cellularRttMs / 2) + serialize(reqBytes + mqttOH, cellKbps) + mqttHandshake',
      params: [
        p('cellularRttMs', `${net.cellularRttMs} ms`),
        p('cellularRtt/2', `${r(cellOneWay)} ms`),
        p('reqBytes', `${reqBytes} B`),
        p('mqttOverhead', `${net.mqttOverheadBytes} B`),
        p('cellThroughput', `${net.cellularThroughputKbps} kbps`),
        p('mqttQos', `${net.mqttQos}`),
        p('handshake', `${r(hs)} ms`),
      ],
      subBreakdown: [
        sub('4G one-way', cellOneWay),
        sub('MQTT serialize', cellSerialDown),
        sub(`QoS${net.mqttQos} handshake`, hs),
      ],
      pctOfTotal: pct(budget.stages.find((s) => s.key === 'cell-down')?.ms ?? 0),
    })

    // Pi: MQTT → UDP (Python)
    const gwDownMs = piPacketPathMs(net.gwMqttToUdpMs, reqBytes, net, false)
    blocks.push({
      key: 'gw-down',
      label: 'Pi app: MQTT → IPv6/UDP',
      group: 'downlink',
      ms: r(gwDownMs),
      formula: 'packets × (gwMqttToUdpMs + osSchedulingMs + piSelectPollMs) × piLoadFactor',
      params: [
        p('packets', `${reqPackets}`),
        p('gwMqttToUdpMs', `${net.gwMqttToUdpMs} ms`),
        p('osSchedulingMs', `${net.osSchedulingMs} ms`),
        p('piSelectPollMs', `${net.piSelectPollMs} ms`),
        p('piLoadFactor', `×${net.piLoadFactor}`),
      ],
      subBreakdown: [
        sub('Per-packet parse+build', reqPackets * net.gwMqttToUdpMs),
        sub('OS jitter', reqPackets * net.osSchedulingMs),
        sub('select()/poll()', reqPackets * net.piSelectPollMs),
        sub(`× load factor`, gwDownMs - reqPackets * (net.gwMqttToUdpMs + net.osSchedulingMs + net.piSelectPollMs)),
      ],
      pctOfTotal: pct(gwDownMs),
    })

    // Pi → RF-NIC QoS2
    if (qos2 > 0 && reqPackets > 0) {
      const per = clampPer(net.udpAppAckLossRate)
      const expRetries = Math.min(net.qos2MaxRetries, per / Math.max(1e-9, 1 - per))
      blocks.push({
        key: 'qos2-down',
        label: 'UDP app-layer QoS2 (exactly-once)',
        group: 'downlink',
        ms: r(qos2 * reqPackets),
        formula: 'packets × (udpAppQos2Ms + qos2InterPacketMs + E[retries] × qos2RetryWindowMs)',
        params: [
          p('packets', `${reqPackets}`),
          p('udpAppQos2Ms', `${net.udpAppQos2Ms} ms`),
          p('qos2InterPacketMs', `${net.qos2InterPacketMs} ms`),
          p('udpAppAckLossRate', `${(per * 100).toFixed(1)}%`),
          p('E[retries]', r(expRetries, 3).toString()),
          p('qos2RetryWindowMs', `${net.qos2RetryWindowMs} ms`),
          p('qos2MaxRetries', `${net.qos2MaxRetries}`),
        ],
        subBreakdown: [
          sub('Base handshake', reqPackets * net.udpAppQos2Ms),
          sub('Inter-packet guard', reqPackets * net.qos2InterPacketMs),
          sub('Expected retries', reqPackets * expRetries * net.qos2RetryWindowMs),
        ],
        pctOfTotal: pct(qos2 * reqPackets),
      })
    }

    // UART → Border Router
    const uartDownMs = totalUartMs(reqBytes, net, false)
    blocks.push({
      key: 'uart-down',
      label: 'wfantund / Spinel → UART',
      group: 'downlink',
      ms: r(uartDownMs),
      formula: '((reqBytes + packets × (fragHdr + brFramingOH)) × uartBitsPerByte × 1000) / uartBaud',
      params: [
        p('reqBytes', `${reqBytes} B`),
        p('packets', `${reqPackets}`),
        p('fragHdr', `+${packetHeaderBytes(reqPackets, net)} B`),
        p('brFramingOH', `+${net.brFramingOverheadBytes} B`),
        p('uartBitsPerByte', `${net.uartBitsPerByte}`),
        p('uartBaud', `${net.uartBaud} baud`),
      ],
      subBreakdown: [sub('Serial transfer', uartDownMs)],
      pctOfTotal: pct(uartDownMs),
    })

    // BR / RN thread (downlink)
    const rnDownMs = rnLatencyMs(rfDown.fragments, net)
    blocks.push({
      key: 'rn-down',
      label: 'BR NWP + RN thread (downlink)',
      group: 'downlink',
      ms: r(rnDownMs),
      formula: 'packets × (brProcessingMsPerFrame + rnThreadDelayMs)',
      params: [
        p('packets', `${rfDown.fragments}`),
        p('brProcessingMsPerFrame', `${net.brProcessingMsPerFrame} ms`),
        p('rnThreadDelayMs', `${net.rnThreadDelayMs} ms`),
      ],
      subBreakdown: [
        sub(`BR bridging (${rfDown.fragments} pkt)`, net.brProcessingMsPerFrame * rfDown.fragments),
        sub('RN RTOS thread', net.rnThreadDelayMs * rfDown.fragments),
      ],
      pctOfTotal: pct(rnDownMs),
    })

    // WiSUN RF (downlink)
    blocks.push(
      buildRfBlock('rf-down', 'WiSUN RF (downlink)', 'downlink', rfDown, phy, net, pct(rfDown.totalAirtimeMs)),
    )
  }

  // ── METER ─────────────────────────────────────────────────────────────
  blocks.push({
    key: 'meter',
    label: 'Meter DLMS processing',
    group: 'meter',
    ms: r(net.meterProcessingMs),
    formula: 'meterProcessingMs (includes meter internal UART → NIC)',
    params: [p('meterProcessingMs', `${net.meterProcessingMs} ms`)],
    subBreakdown: [sub('DLMS request handling', net.meterProcessingMs)],
    pctOfTotal: pct(net.meterProcessingMs),
  })

  // ── UPLINK ────────────────────────────────────────────────────────────

  // Randomised response delay
  if (net.respRandomDelayMaxMs > 0) {
    const dMs = net.respRandomDelayMaxMs / 2
    blocks.push({
      key: 'resp-delay',
      label: 'NIC randomised response delay',
      group: 'uplink',
      ms: r(dMs),
      formula: 'respRandomDelayMaxMs / 2 (one node average); all-node burst spread is handled separately in batch timing',
      params: [p('respRandomDelayMaxMs', `${net.respRandomDelayMaxMs} ms`)],
      subBreakdown: [sub('Average wait', dMs)],
      pctOfTotal: pct(dMs),
    })
  }

  // WiSUN RF (uplink)
  blocks.push(
    buildRfBlock('rf-up', 'WiSUN RF (uplink)', 'uplink', rfUp, phy, net, pct(rfUp.totalAirtimeMs)),
  )

  // BR / RN thread (uplink)
  const rnUpMs = rnLatencyMs(rfUp.fragments, net)
  blocks.push({
    key: 'rn-up',
    label: 'BR NWP + RN thread (uplink)',
    group: 'uplink',
    ms: r(rnUpMs),
    formula: 'packets × (brProcessingMsPerFrame + rnThreadDelayMs)',
    params: [
      p('packets', `${rfUp.fragments}`),
      p('brProcessingMsPerFrame', `${net.brProcessingMsPerFrame} ms`),
      p('rnThreadDelayMs', `${net.rnThreadDelayMs} ms`),
    ],
    subBreakdown: [
      sub(`BR bridging (${rfUp.fragments} pkt)`, net.brProcessingMsPerFrame * rfUp.fragments),
      sub('RN RTOS thread', net.rnThreadDelayMs * rfUp.fragments),
    ],
    pctOfTotal: pct(rnUpMs),
  })

  // Border Router → UART
  const uartUpMs = totalUartMs(respBytes, net, true)
  blocks.push({
    key: 'uart-up',
    label: 'UART → wfantund / Spinel',
    group: 'uplink',
    ms: r(uartUpMs),
    formula: '((respBytes + packets × (fragHdr + brFramingOH)) × uartBitsPerByte × 1000) / uartBaud',
    params: [
      p('respBytes', `${respBytes} B`),
      p('packets', `${respPackets}`),
      p('fragHdr', `+${packetHeaderBytes(respPackets, net)} B`),
      p('brFramingOH', `+${net.brFramingOverheadBytes} B`),
      p('uartBitsPerByte', `${net.uartBitsPerByte}`),
      p('uartBaud', `${net.uartBaud} baud`),
    ],
    subBreakdown: [sub('Serial transfer', uartUpMs)],
    pctOfTotal: pct(uartUpMs),
  })

  // UDP app reassembly at Pi
  if (rfUp.reassemblyMs > 0) {
    blocks.push({
      key: 'reassembly',
      label: 'UDP app reassembly',
      group: 'uplink',
      ms: r(rfUp.reassemblyMs),
      formula: 'packets × reassemblyMsPerFragment',
      params: [
        p('packets', `${rfUp.fragments}`),
        p('reassemblyMsPerFragment', `${net.reassemblyMsPerFragment} ms`),
      ],
      subBreakdown: [sub(`${rfUp.fragments} packet(s)`, rfUp.reassemblyMs)],
      pctOfTotal: pct(rfUp.reassemblyMs),
    })
  }

  // RF-NIC → Pi QoS2
  if (qos2 > 0 && respPackets > 0) {
    blocks.push({
      key: 'qos2-up',
      label: 'UDP app-layer QoS2 ACK',
      group: 'uplink',
      ms: r(qos2 * respPackets),
      formula: 'packets × (udpAppQos2Ms + qos2InterPacketMs + E[retries] × qos2RetryWindowMs)',
      params: [
        p('packets', `${respPackets}`),
        p('udpAppQos2Ms', `${net.udpAppQos2Ms} ms`),
        p('qos2InterPacketMs', `${net.qos2InterPacketMs} ms`),
        p('qos2RetryWindowMs', `${net.qos2RetryWindowMs} ms`),
      ],
      subBreakdown: [
        sub('Base handshake', respPackets * net.udpAppQos2Ms),
        sub('Inter-packet guard', respPackets * net.qos2InterPacketMs),
      ],
      pctOfTotal: pct(qos2 * respPackets),
    })
  }

  // Pi: UDP → MQTT (Python)
  const gwUpMs = piPacketPathMs(net.gwUdpToMqttMs, respBytes, net, true) + rfUp.reassemblyMs
  blocks.push({
    key: 'gw-up',
    label: 'Pi app: IPv6/UDP → MQTT',
    group: 'uplink',
    ms: r(gwUpMs),
    formula: 'packets × (gwUdpToMqttMs + osSchedulingMs + piSelectPollMs) × piLoadFactor + packets × reassemblyMsPerFragment',
    params: [
      p('packets', `${respPackets}`),
      p('gwUdpToMqttMs', `${net.gwUdpToMqttMs} ms`),
      p('osSchedulingMs', `${net.osSchedulingMs} ms`),
      p('piSelectPollMs', `${net.piSelectPollMs} ms`),
      p('piLoadFactor', `×${net.piLoadFactor}`),
      p('reassemblyMsPerFragment', `${net.reassemblyMsPerFragment} ms`),
    ],
    subBreakdown: [
      sub('Per-packet UDP intake + publish path', piPacketPathMs(net.gwUdpToMqttMs, respBytes, net, true)),
      sub('Gateway app reassembly', rfUp.reassemblyMs),
    ],
    pctOfTotal: pct(gwUpMs),
  })

  // Gateway → NMS (4G)
  const cellSerialUp = serializeMs(respBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
  blocks.push({
    key: 'cell-up',
    label: 'Gateway → NMS (4G/EC200U)',
    group: 'uplink',
    ms: r(budget.stages.find((s) => s.key === 'cell-up')?.ms ?? 0),
    formula: '(cellularRttMs / 2) + serialize(respBytes + mqttOH, cellKbps) + mqttHandshake',
    params: [
      p('cellularRttMs', `${net.cellularRttMs} ms`),
      p('cellularRtt/2', `${r(cellOneWay)} ms`),
      p('respBytes', `${respBytes} B`),
      p('mqttOverhead', `${net.mqttOverheadBytes} B`),
      p('cellThroughput', `${net.cellularThroughputKbps} kbps`),
      p('mqttQos', `${net.mqttQos}`),
      p('handshake', `${r(hs)} ms`),
    ],
    subBreakdown: [
      sub('4G one-way', cellOneWay),
      sub('MQTT serialize', cellSerialUp),
      sub(`QoS${net.mqttQos} handshake`, hs),
    ],
    pctOfTotal: pct(budget.stages.find((s) => s.key === 'cell-up')?.ms ?? 0),
  })

  // NMS → HES
  blocks.push({
    key: 'nms-hes-up',
    label: 'NMS → HES',
    group: 'uplink',
    ms: r(net.brokerToHesMs),
    formula: 'brokerToHesMs',
    params: [p('brokerToHesMs', `${net.brokerToHesMs} ms`)],
    subBreakdown: [],
    pctOfTotal: pct(net.brokerToHesMs),
  })

  return {
    blocks,
    totalMs: r(total),
    downlinkMs: r(budget.downlinkMs),
    meterMs: r(budget.meterMs),
    uplinkMs: r(budget.uplinkMs),
    reqBytes,
    respBytes,
    isPush,
  }
}

/** Build an RF stage block with full airtime sub-breakdown. */
function buildRfBlock(
  key: string,
  label: string,
  group: 'downlink' | 'uplink',
  air: AirtimeResult,
  phy: PhyProfile,
  net: NetworkParams,
  pctOfTotal: number,
): FlowBlockDetail {
  const fhMs = net.freqHoppingEnabled ? air.fragments * (net.unicastDwellMs / 2) : 0
  const txOffMs = air.fragments * net.minTxOffMs
  const subBreakdown: FlowSubBreakdown[] = [
    sub(`Frame serialize (${air.onAirBytes} B on-air)`, air.frameAirtimeMs),
  ]
  if (air.ackAirtimeMs > 0) subBreakdown.push(sub(`MAC ACK (${air.fragments} pkt)`, air.ackAirtimeMs))
  subBreakdown.push(sub(`CSMA/CA + IFS (${air.fragments} pkt)`, air.fragments * (net.csmaAvgBackoffMs + net.ifsMs)))
  if (txOffMs > 0) subBreakdown.push(sub(`Min TX off (${air.fragments} pkt)`, txOffMs))
  if (fhMs > 0) subBreakdown.push(sub(`FH rendezvous (${air.fragments} × ${net.unicastDwellMs}/2)`, fhMs))
  if (net.hopCount > 1) subBreakdown.push(sub(`× ${net.hopCount} hops`, air.perHopMs * (net.hopCount - 1)))
  if (air.retransFactor > 1.001)
    subBreakdown.push(sub(`× RF retrans (×${r(air.retransFactor, 3)})`, air.totalAirtimeMs - air.perHopMs * net.hopCount))

  return {
    key,
    label,
    group,
    ms: r(air.totalAirtimeMs),
    formula: '(frameAirtime + ackAirtime + CSMA + minTxOff + FH) × hopCount × retransFactor',
    params: [
      p('dataRate', `${phy.dataRateKbps} kbps`),
      p('appBytes', `${air.appBytes} B`),
      p('packets', `${air.fragments}`),
      p('onAirBytes', `${air.onAirBytes} B`),
      p('hopCount', `${net.hopCount}`),
      p('RF PER', `${(effectiveRfPer(net) * 100).toFixed(1)}%`),
      p('retransFactor', `×${r(air.retransFactor, 3)}`),
      p('useMacAck', net.useMacAck ? 'yes' : 'no'),
      ...(net.minTxOffMs > 0 ? [p('minTxOffMs', `${net.minTxOffMs} ms`)] : []),
      ...(net.freqHoppingEnabled ? [p('unicastDwellMs', `${net.unicastDwellMs} ms`)] : []),
    ],
    subBreakdown,
    pctOfTotal,
  }
}
