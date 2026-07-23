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
  UseCase,
} from './types'

/** Bits transmitted per byte on the WiSUN channel is simply 8. */
const BITS = 8

/** Serialization time (ms) for `bytes` at `kbps`. ms = bits / kbps. */
function serializeMs(bytes: number, kbps: number): number {
  if (kbps <= 0) return Infinity
  return (bytes * BITS) / kbps
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
 * that rides in the UDP payload). Accounts for 6LoWPAN fragmentation, per-frame
 * lower-layer headers, PHY preamble/header, MAC ACK, CSMA/CA, per-frame
 * frequency-hopping rendezvous wait, mesh hops and PER retransmissions.
 *
 * Fragmentation is applied only when `isResponse` is true (the deployment
 * fragments the large uplink responses; downlink requests are small).
 */
export function computeAirtime(
  appBytes: number,
  phy: PhyProfile,
  net: NetworkParams,
  isResponse = true,
): AirtimeResult {
  if (appBytes <= 0) return { ...ZERO_AIRTIME }

  const rate = phy.dataRateKbps
  const perFrameFixed = phy.preambleBytes + phy.phyHeaderBytes + net.macHeaderBytes + net.macFcsBytes

  // Fragment only large uplink responses; requests always go as a single frame.
  const fragAllowed = net.fragmentationEnabled && isResponse
  const fragSize = Math.max(1, net.fragmentPayloadBytes)
  // With fragmentation off, the datagram must ride in a single frame; with it on
  // it is split into `fragSize`-byte pieces.
  const fragments = fragAllowed ? Math.max(1, Math.ceil(appBytes / fragSize)) : 1
  const fragHdr = fragments > 1 ? net.fragHeaderBytes : 0
  // A single frame cannot exceed the hard PSDU cap.
  const oversize =
    fragments === 1 && appBytes + net.lowpanHeaderBytes + fragHdr + perFrameFixed > net.maxPhyPayloadBytes

  // Total on-air bytes = payload + per-fragment (6LoWPAN + frag + MAC + PHY) overhead.
  const onAirBytes = appBytes + fragments * (net.lowpanHeaderBytes + fragHdr + perFrameFixed)
  const frameAirtimeMs = serializeMs(onAirBytes, rate)

  const ackFrameBytes = phy.preambleBytes + phy.phyHeaderBytes + net.macAckBytes
  const ackAirtimeMs = net.useMacAck ? fragments * serializeMs(ackFrameBytes, rate) : 0

  // Frequency hopping: each frame waits on average half a dwell for the RX slot.
  const fhMs = net.freqHoppingEnabled ? fragments * (net.unicastDwellMs / 2) : 0
  const csmaMs = fragments * (net.csmaAvgBackoffMs + net.ifsMs) + fhMs

  const reassemblyMs = fragments > 1 ? fragments * net.reassemblyMsPerFragment : 0

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
    reassemblyMs,
    oversize,
  }
}

/** Expected QoS2 latency (ms) on the local Pi<->RF-NIC link, incl. retries. */
export function qos2LocalMs(net: NetworkParams): number {
  if (!net.piNicQos2) return 0
  const per = clampPer(net.localLinkPer)
  const expRetries = Math.min(net.qos2MaxRetries, per / Math.max(1e-9, 1 - per))
  return net.piNicQos2Ms + net.qos2InterPacketMs + expRetries * net.qos2RetryWindowMs
}

function clampPer(p: number): number {
  return Math.min(0.999, Math.max(0, p))
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
  const qos2 = qos2LocalMs(net)
  const piCpu = (base: number) => (base + net.osSchedulingMs + net.piSelectPollMs) * net.piLoadFactor
  const stages: LatencyStage[] = []

  const rfDown = computeAirtime(reqBytes, phy, net, false)
  const rfUp = computeAirtime(respBytes, phy, net, true)
  const rnMs = (frags: number) => net.brProcessingMsPerFrame * Math.max(1, frags) + net.rnThreadDelayMs

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
      label: 'Pi: MQTT → UDP (Python)',
      group: 'downlink',
      ms: piCpu(net.gwMqttToUdpMs),
      detail: `Parse + IPv6 lookup + build UDP · ×${net.piLoadFactor} load, +OS ${net.osSchedulingMs}ms`,
    })
    if (qos2 > 0)
      stages.push({
        key: 'qos2-down',
        label: 'Pi → RF-NIC QoS2',
        group: 'downlink',
        ms: qos2,
        detail: `Exactly-once handshake (retry win ${net.qos2RetryWindowMs}ms, ≤${net.qos2MaxRetries} retries)`,
      })
    stages.push({
      key: 'uart-down',
      label: 'UART → Border Router',
      group: 'downlink',
      ms: uartMs(reqBytes, net),
      detail: `Pi ↔ BR serial @ ${net.uartBaud} baud (one packet at a time)`,
    })
    stages.push({
      key: 'rn-down',
      label: 'BR / RN thread (downlink)',
      group: 'downlink',
      ms: rnMs(rfDown.fragments),
      detail: `BR bridging + RN RTOS thread delay ${net.rnThreadDelayMs}ms`,
    })
    stages.push({
      key: 'rf-down',
      label: 'WiSUN RF (downlink)',
      group: 'downlink',
      ms: rfDown.totalAirtimeMs,
      detail: `${rfDown.fragments} frag · ${rfDown.onAirBytes} B on-air · ${net.hopCount} hop(s)${net.freqHoppingEnabled ? ' · FH rendezvous' : ''}`,
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
      detail: `NIC buffers response, sends after random [0, ${net.respRandomDelayMaxMs}] ms (avg)`,
    })
  stages.push({
    key: 'rf-up',
    label: 'WiSUN RF (uplink)',
    group: 'uplink',
    ms: rfUp.totalAirtimeMs,
    detail: `${rfUp.fragments} frag · ${rfUp.onAirBytes} B on-air · ${net.hopCount} hop(s)${net.freqHoppingEnabled ? ' · FH rendezvous' : ''}`,
  })
  stages.push({
    key: 'rn-up',
    label: 'BR / RN thread (uplink)',
    group: 'uplink',
    ms: rnMs(rfUp.fragments),
    detail: `RN RTOS thread delay ${net.rnThreadDelayMs}ms + BR bridging`,
  })
  if (rfUp.reassemblyMs > 0)
    stages.push({
      key: 'reassembly',
      label: '6LoWPAN reassembly',
      group: 'uplink',
      ms: rfUp.reassemblyMs,
      detail: `${rfUp.fragments} fragments × ${net.reassemblyMsPerFragment} ms`,
    })
  if (qos2 > 0)
    stages.push({
      key: 'qos2-up',
      label: 'RF-NIC → Pi QoS2',
      group: 'uplink',
      ms: qos2,
      detail: 'Exactly-once handshake between RF NIC and Pi',
    })
  stages.push({
    key: 'uart-up',
    label: 'Border Router → UART',
    group: 'uplink',
    ms: uartMs(respBytes, net),
    detail: `Pi ↔ BR serial @ ${net.uartBaud} baud (one packet at a time)`,
  })
  stages.push({
    key: 'gw-up',
    label: 'Pi: UDP → MQTT (Python)',
    group: 'uplink',
    ms: piCpu(net.gwUdpToMqttMs),
    detail: `Reverse IPv6 → MeterID lookup + MQTT publish · ×${net.piLoadFactor} load`,
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
    ms += computeAirtime(t.reqBytes, phy, net, false).totalAirtimeMs
    ms += computeAirtime(t.respBytes, phy, net, true).totalAirtimeMs
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
      computeAirtime(t.reqBytes, phy, net, false).totalAirtimeMs +
      computeAirtime(t.respBytes, phy, net, true).totalAirtimeMs,
  )
}

/** Per-node time on each direction of the (full-duplex) UART line. */
function perNodeUartSplit(stats: ProfileStats, net: NetworkParams) {
  let tx = 0
  let rx = 0
  for (const t of stats.transactions) {
    tx += uartMs(t.reqBytes, net)
    rx += uartMs(t.respBytes, net)
  }
  return { tx, rx }
}

/** Per-node Pi CPU (Python) time for the whole session, both directions. */
function perNodePi(stats: ProfileStats, net: NetworkParams): number {
  const perTxn =
    (net.gwMqttToUdpMs + net.gwUdpToMqttMs + 2 * (net.osSchedulingMs + net.piSelectPollMs)) *
    net.piLoadFactor
  return ((stats.txnCount + stats.pushCount) * perTxn) / Math.max(1, net.piConcurrency)
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

  // ---- Per-node cost on each shared / serial resource ----
  const perNodeRfMs = perNodeChannelMs(stats, phy, net)
  const steps = stepChannelTimes(stats, phy, net)
  const maxStepChannelMs = steps.length ? Math.max(...steps) : 0
  const { tx: perNodeUartTxMs, rx: perNodeUartRxMs } = perNodeUartSplit(stats, net)
  // Full-duplex UART: the binding line is the busier direction; half-duplex sums.
  const perNodeUartBindingMs = net.uartFullDuplex
    ? Math.max(perNodeUartTxMs, perNodeUartRxMs)
    : perNodeUartTxMs + perNodeUartRxMs
  const perNodeUartMs = perNodeUartTxMs + perNodeUartRxMs

  let perNodeCellularMs = 0
  for (const t of stats.transactions) {
    if (t.reqBytes > 0)
      perNodeCellularMs += serializeMs(t.reqBytes + net.mqttOverheadBytes, net.cellularThroughputKbps)
    if (t.respBytes > 0)
      perNodeCellularMs += serializeMs(
        t.respBytes + net.mqttOverheadBytes,
        net.cellularThroughputKbps,
      )
  }
  const perNodePiMs = perNodePi(stats, net)
  const perNodeBrMs = perNodeBr(stats, phy, net)
  const txns = stats.txnCount + stats.pushCount
  const perNodeGwMs = (txns / net.gwMaxTxnPerSec) * 1000

  // ---- Usable fraction of each resource ----
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

  // Association-timeout limit. With admission throttling only a wave of
  // `throttleWindowNodes` is active at once, so the inter-message gap is bounded
  // by the wave, not the whole fleet.
  const activeWave = (nodes: number) =>
    net.throttlingEnabled ? Math.min(net.throttleWindowNodes, nodes) : nodes
  const gapAt = (nodes: number) => activeWave(nodes) * maxStepChannelMs
  const assocNodesRaw =
    maxStepChannelMs <= 0 ? Infinity : Math.floor(net.assocTimeoutMs / maxStepChannelMs)
  // If throttling keeps each wave within the timeout, association no longer caps
  // the fleet (only the poll cycle does).
  const maxNodesAssoc =
    net.throttlingEnabled && assocNodesRaw >= net.throttleWindowNodes ? Infinity : assocNodesRaw

  const candidates: Array<{ name: string; nodes: number }> = [
    { name: 'WiSUN RF channel', nodes: maxNodesRf },
    { name: 'Association timeout', nodes: maxNodesAssoc },
    { name: 'Pi ↔ BR UART', nodes: maxNodesUart },
    { name: 'Pi CPU (Python)', nodes: maxNodesPi },
    { name: 'BR MCU', nodes: maxNodesBr },
    { name: '4G / MQTT backhaul', nodes: maxNodesCellular },
  ]
  const binding = candidates.reduce((a, b) => (b.nodes < a.nodes ? b : a))

  const gapAtTargetMs = gapAt(targetNodes)
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
): BatchAnalysis {
  const cap = computeCapacity(stats, phy, net, useCase, nodes)
  const activeWave = net.throttlingEnabled ? Math.min(net.throttleWindowNodes, nodes) : nodes

  // Heaviest single messages (for per-packet columns and BR backlog).
  const heaviestReq = Math.max(0, ...stats.transactions.map((t) => t.reqBytes))
  const heaviestResp = Math.max(0, ...stats.transactions.map((t) => t.respBytes))
  const airHeaviestResp = computeAirtime(heaviestResp, phy, net, true)
  const perTxnPi =
    (net.gwMqttToUdpMs + net.gwUdpToMqttMs + 2 * (net.osSchedulingMs + net.piSelectPollMs)) *
    net.piLoadFactor
  const oversizeFrame = stats.transactions.some(
    (t) => computeAirtime(t.respBytes, phy, net, true).oversize,
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
      serializeMs(heaviestResp + net.mqttOverheadBytes, net.cellularThroughputKbps),
      cap.perNodeCellularMs,
      'Single modem; publishes serialise (QoS handshake is latency, not throughput).',
    ),
    stage(
      'pi',
      'Pi CPU (Python bridge)',
      'shared',
      'RPi 2 W cores',
      true,
      perTxnPi,
      cap.perNodePiMs,
      `GIL-bound consumer ×${net.piConcurrency}, load ×${net.piLoadFactor}.`,
    ),
    stage(
      'uart-tx',
      'UART → BR (downlink)',
      'downlink',
      'UART TX line',
      true,
      uartMs(heaviestReq, net),
      cap.perNodeUartTxMs,
      'One packet at a time over the serial line.',
    ),
    stage(
      'uart-rx',
      'BR → UART (uplink)',
      'uplink',
      net.uartFullDuplex ? 'UART RX line' : 'UART (shared)',
      true,
      uartMs(heaviestResp, net),
      cap.perNodeUartRxMs,
      net.uartFullDuplex ? 'Separate RX line, concurrent with TX.' : 'Half-duplex: shares the line with TX.',
    ),
    stage(
      'br',
      'BR MCU processing',
      'shared',
      'BR MCU',
      true,
      net.brProcessingMsPerFrame * airHeaviestResp.fragments,
      cap.perNodeBrMs,
      'Per-frame RF↔UART bridging (RN thread delay counts as latency).',
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
        ? 'Single radio; FH spreads interference but does not add BR throughput.'
        : 'Single fixed-channel radio; all links serialise here.',
    ),
    stage(
      'meter',
      'Meter DLMS processing',
      'meter',
      'each meter (parallel)',
      false,
      net.meterProcessingMs,
      (stats.txnCount + stats.pushCount) * net.meterProcessingMs,
      'Runs in parallel across meters — does not limit the gateway.',
    ),
  ]

  const serialStages = stages.filter((s) => s.serial)
  const bottleneck = serialStages.reduce((a, b) => (b.aggregateMs > a.aggregateMs ? b : a))
  const batchThroughputMs = bottleneck.aggregateMs
  const singlePassLatencyMs = computeSessionBudget(stats, phy, net).totalMs
  const batchCompletionMs = batchThroughputMs + singlePassLatencyMs

  // BR receive backlog during the heaviest uplink burst: responses arrive on RF
  // and drain over UART. If UART is slower than RF, frames pile up in the BR.
  const airRespPerMsg = airHeaviestResp.totalAirtimeMs
  const uartRespPerMsg = uartMs(heaviestResp, net)
  const ratio = airRespPerMsg > 0 ? airRespPerMsg / uartRespPerMsg : 1
  const brBacklogFrames =
    uartRespPerMsg <= airRespPerMsg
      ? Math.min(activeWave, 2)
      : Math.max(1, Math.ceil(activeWave * (1 - ratio)))
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
    assocTimeoutMs: net.assocTimeoutMs,
    assocOk: cap.gapAtTargetMs <= net.assocTimeoutMs,
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
  const qos2 = qos2LocalMs(net)
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
    const gwDownMs = (net.gwMqttToUdpMs + net.osSchedulingMs + net.piSelectPollMs) * net.piLoadFactor
    blocks.push({
      key: 'gw-down',
      label: 'Pi: MQTT → UDP (Python)',
      group: 'downlink',
      ms: r(gwDownMs),
      formula: '(gwMqttToUdpMs + osSchedulingMs + piSelectPollMs) × piLoadFactor',
      params: [
        p('gwMqttToUdpMs', `${net.gwMqttToUdpMs} ms`),
        p('osSchedulingMs', `${net.osSchedulingMs} ms`),
        p('piSelectPollMs', `${net.piSelectPollMs} ms`),
        p('piLoadFactor', `×${net.piLoadFactor}`),
      ],
      subBreakdown: [
        sub('Python parse+build', net.gwMqttToUdpMs),
        sub('OS jitter', net.osSchedulingMs),
        sub('select()/poll()', net.piSelectPollMs),
        sub(`× load factor`, gwDownMs - (net.gwMqttToUdpMs + net.osSchedulingMs + net.piSelectPollMs)),
      ],
      pctOfTotal: pct(gwDownMs),
    })

    // Pi → RF-NIC QoS2
    if (qos2 > 0) {
      const per = clampPer(net.localLinkPer)
      const expRetries = Math.min(net.qos2MaxRetries, per / Math.max(1e-9, 1 - per))
      blocks.push({
        key: 'qos2-down',
        label: 'Pi → RF-NIC QoS2 (exactly-once)',
        group: 'downlink',
        ms: r(qos2),
        formula: 'piNicQos2Ms + qos2InterPacketMs + E[retries] × qos2RetryWindowMs',
        params: [
          p('piNicQos2Ms', `${net.piNicQos2Ms} ms`),
          p('qos2InterPacketMs', `${net.qos2InterPacketMs} ms`),
          p('localLinkPer', `${(per * 100).toFixed(1)}%`),
          p('E[retries]', r(expRetries, 3).toString()),
          p('qos2RetryWindowMs', `${net.qos2RetryWindowMs} ms`),
          p('qos2MaxRetries', `${net.qos2MaxRetries}`),
        ],
        subBreakdown: [
          sub('Base handshake', net.piNicQos2Ms),
          sub('Inter-packet guard', net.qos2InterPacketMs),
          sub('Expected retries', expRetries * net.qos2RetryWindowMs),
        ],
        pctOfTotal: pct(qos2),
      })
    }

    // UART → Border Router
    const uartDownMs = uartMs(reqBytes, net)
    blocks.push({
      key: 'uart-down',
      label: 'UART → Border Router',
      group: 'downlink',
      ms: r(uartDownMs),
      formula: '((reqBytes + brFramingOH) × uartBitsPerByte × 1000) / uartBaud',
      params: [
        p('reqBytes', `${reqBytes} B`),
        p('brFramingOH', `+${net.brFramingOverheadBytes} B`),
        p('uartBitsPerByte', `${net.uartBitsPerByte}`),
        p('uartBaud', `${net.uartBaud} baud`),
      ],
      subBreakdown: [sub('Serial transfer', uartDownMs)],
      pctOfTotal: pct(uartDownMs),
    })

    // BR / RN thread (downlink)
    const rnDownMs = net.brProcessingMsPerFrame * Math.max(1, rfDown.fragments) + net.rnThreadDelayMs
    blocks.push({
      key: 'rn-down',
      label: 'BR MCU + RN thread (downlink)',
      group: 'downlink',
      ms: r(rnDownMs),
      formula: 'brProcessingMsPerFrame × fragments + rnThreadDelayMs',
      params: [
        p('brProcessingMsPerFrame', `${net.brProcessingMsPerFrame} ms`),
        p('fragments', `${rfDown.fragments}`),
        p('rnThreadDelayMs', `${net.rnThreadDelayMs} ms`),
      ],
      subBreakdown: [
        sub(`BR bridging (${rfDown.fragments} frag)`, net.brProcessingMsPerFrame * Math.max(1, rfDown.fragments)),
        sub('RN RTOS thread', net.rnThreadDelayMs),
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
      formula: 'respRandomDelayMaxMs / 2 (uniform [0, max] average)',
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
  const rnUpMs = net.brProcessingMsPerFrame * Math.max(1, rfUp.fragments) + net.rnThreadDelayMs
  blocks.push({
    key: 'rn-up',
    label: 'BR MCU + RN thread (uplink)',
    group: 'uplink',
    ms: r(rnUpMs),
    formula: 'brProcessingMsPerFrame × fragments + rnThreadDelayMs',
    params: [
      p('brProcessingMsPerFrame', `${net.brProcessingMsPerFrame} ms`),
      p('fragments', `${rfUp.fragments}`),
      p('rnThreadDelayMs', `${net.rnThreadDelayMs} ms`),
    ],
    subBreakdown: [
      sub(`BR bridging (${rfUp.fragments} frag)`, net.brProcessingMsPerFrame * Math.max(1, rfUp.fragments)),
      sub('RN RTOS thread', net.rnThreadDelayMs),
    ],
    pctOfTotal: pct(rnUpMs),
  })

  // 6LoWPAN reassembly
  if (rfUp.reassemblyMs > 0) {
    blocks.push({
      key: 'reassembly',
      label: '6LoWPAN reassembly',
      group: 'uplink',
      ms: r(rfUp.reassemblyMs),
      formula: 'fragments × reassemblyMsPerFragment',
      params: [
        p('fragments', `${rfUp.fragments}`),
        p('reassemblyMsPerFragment', `${net.reassemblyMsPerFragment} ms`),
      ],
      subBreakdown: [sub(`${rfUp.fragments} fragments`, rfUp.reassemblyMs)],
      pctOfTotal: pct(rfUp.reassemblyMs),
    })
  }

  // RF-NIC → Pi QoS2
  if (qos2 > 0) {
    blocks.push({
      key: 'qos2-up',
      label: 'RF-NIC → Pi QoS2 ACK',
      group: 'uplink',
      ms: r(qos2),
      formula: 'piNicQos2Ms + qos2InterPacketMs + E[retries] × qos2RetryWindowMs',
      params: [
        p('piNicQos2Ms', `${net.piNicQos2Ms} ms`),
        p('qos2InterPacketMs', `${net.qos2InterPacketMs} ms`),
        p('qos2RetryWindowMs', `${net.qos2RetryWindowMs} ms`),
      ],
      subBreakdown: [
        sub('Base handshake', net.piNicQos2Ms),
        sub('Inter-packet guard', net.qos2InterPacketMs),
      ],
      pctOfTotal: pct(qos2),
    })
  }

  // Border Router → UART
  const uartUpMs = uartMs(respBytes, net)
  blocks.push({
    key: 'uart-up',
    label: 'Border Router → UART',
    group: 'uplink',
    ms: r(uartUpMs),
    formula: '((respBytes + brFramingOH) × uartBitsPerByte × 1000) / uartBaud',
    params: [
      p('respBytes', `${respBytes} B`),
      p('brFramingOH', `+${net.brFramingOverheadBytes} B`),
      p('uartBitsPerByte', `${net.uartBitsPerByte}`),
      p('uartBaud', `${net.uartBaud} baud`),
    ],
    subBreakdown: [sub('Serial transfer', uartUpMs)],
    pctOfTotal: pct(uartUpMs),
  })

  // Pi: UDP → MQTT (Python)
  const gwUpMs = (net.gwUdpToMqttMs + net.osSchedulingMs + net.piSelectPollMs) * net.piLoadFactor
  blocks.push({
    key: 'gw-up',
    label: 'Pi: UDP → MQTT (Python)',
    group: 'uplink',
    ms: r(gwUpMs),
    formula: '(gwUdpToMqttMs + osSchedulingMs + piSelectPollMs) × piLoadFactor',
    params: [
      p('gwUdpToMqttMs', `${net.gwUdpToMqttMs} ms`),
      p('osSchedulingMs', `${net.osSchedulingMs} ms`),
      p('piSelectPollMs', `${net.piSelectPollMs} ms`),
      p('piLoadFactor', `×${net.piLoadFactor}`),
    ],
    subBreakdown: [
      sub('Python reassemble+publish', net.gwUdpToMqttMs),
      sub('OS jitter', net.osSchedulingMs),
      sub('select()/poll()', net.piSelectPollMs),
      sub('× load factor', gwUpMs - (net.gwUdpToMqttMs + net.osSchedulingMs + net.piSelectPollMs)),
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
  const subBreakdown: FlowSubBreakdown[] = [
    sub(`Frame serialize (${air.onAirBytes} B on-air)`, air.frameAirtimeMs),
  ]
  if (air.ackAirtimeMs > 0) subBreakdown.push(sub(`MAC ACK (${air.fragments} frag)`, air.ackAirtimeMs))
  subBreakdown.push(sub(`CSMA/CA + IFS (${air.fragments} frag)`, air.fragments * (net.csmaAvgBackoffMs + net.ifsMs)))
  if (fhMs > 0) subBreakdown.push(sub(`FH rendezvous (${air.fragments} × ${net.unicastDwellMs}/2)`, fhMs))
  if (net.hopCount > 1) subBreakdown.push(sub(`× ${net.hopCount} hops`, air.perHopMs * (net.hopCount - 1)))
  if (air.retransFactor > 1.001)
    subBreakdown.push(sub(`× PER retrans (×${r(air.retransFactor, 3)})`, air.totalAirtimeMs - air.perHopMs * net.hopCount))

  return {
    key,
    label,
    group,
    ms: r(air.totalAirtimeMs),
    formula: '(frameAirtime + ackAirtime + CSMA + FH) × hopCount × retransFactor',
    params: [
      p('dataRate', `${phy.dataRateKbps} kbps`),
      p('appBytes', `${air.appBytes} B`),
      p('fragments', `${air.fragments}`),
      p('onAirBytes', `${air.onAirBytes} B`),
      p('hopCount', `${net.hopCount}`),
      p('PER', `${(net.packetErrorRate * 100).toFixed(1)}%`),
      p('retransFactor', `×${r(air.retransFactor, 3)}`),
      p('useMacAck', net.useMacAck ? 'yes' : 'no'),
      ...(net.freqHoppingEnabled ? [p('unicastDwellMs', `${net.unicastDwellMs} ms`)] : []),
    ],
    subBreakdown,
    pctOfTotal,
  }
}
