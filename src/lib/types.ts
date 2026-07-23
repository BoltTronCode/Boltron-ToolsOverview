/**
 * Shared domain types for the WiSUN Throughput & Capacity Calculator.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */

/** Direction of a DLMS/MQTT message as encoded in the NMS topic. */
export type Direction = 'REQT' | 'RESP' | 'PUSH'

/** A single parsed line from an NMS MQTT capture log. */
export interface LogRecord {
  isoTime: string
  epoch: number // seconds (with millisecond fraction)
  topic: string
  vendor: string // e.g. "HRF"
  phase: string // e.g. "1Ph"
  direction: Direction
  meterId: string
  frameBytes: number // value of the "length" column = full DLMS-wrapper frame size
  hex: string
  apduTag?: number // first APDU byte after the 8-byte wrapper
  apduName?: string // human readable APDU name
}

/** A request/response pair (or a standalone PUSH) derived from log records. */
export interface Transaction {
  seq: number
  reqBytes: number
  respBytes: number
  reqEpoch: number | null
  respEpoch: number | null
  rttMs: number | null // measured RESP - REQT at the NMS
  reqApdu?: string
  respApdu?: string
  isPush: boolean
}

/** Aggregated statistics for one DLMS profile / use-case log. */
export interface ProfileStats {
  transactions: Transaction[]
  txnCount: number // request/response pairs
  pushCount: number
  reqBytesTotal: number
  respBytesTotal: number
  appBytesTotal: number // req + resp
  measuredDurationMs: number // last - first record
  measuredRttMsTotal: number // sum of matched RTTs
  frames: number // total frames on air (all REQT+RESP+PUSH records)
  records: LogRecord[]
}

/** A WiSUN PHY operating mode. */
export interface PhyProfile {
  id: string
  label: string
  modulation: string
  dataRateKbps: number // physical channel bitrate
  /** Preamble + SFD duration expressed in bytes-equivalent at the channel rate. */
  preambleBytes: number
  /** PHY header (PHR/SHR after preamble) in bytes. */
  phyHeaderBytes: number
  channelSpacingKHz: number
  notes: string
}

/** All tunable network / stack parameters (fully editable in the UI). */
export interface NetworkParams {
  // ---- Link layer / RF ----
  macHeaderBytes: number // 802.15.4e MHR + aux security header
  macFcsBytes: number // MFR / FCS
  lowpanHeaderBytes: number // 6LoWPAN IPHC + IPv6/UDP NHC compressed headers
  maxPhyPayloadBytes: number // hard PSDU cap (frame cannot exceed this)
  useMacAck: boolean
  macAckBytes: number // ACK frame size (PHY payload)
  csmaAvgBackoffMs: number // average CSMA/CA backoff + CCA per frame
  ifsMs: number // inter-frame spacing / turnaround per frame
  hopCount: number // mesh depth (BR <-> meter), airtime multiplier
  packetErrorRate: number // 0..1, drives expected retransmissions per hop

  // ---- 6LoWPAN fragmentation / reassembly ----
  fragmentationEnabled: boolean // split IPv6 payloads into L2 fragments
  fragmentPayloadBytes: number // datagram payload carried per fragment
  fragHeaderBytes: number // 6LoWPAN FRAG1/FRAGN dispatch header per fragment
  reassemblyMsPerFragment: number // receiver reassembly cost per fragment

  // ---- Pi Zero 2 <-> Border Router UART (single serial line, per direction) ----
  uartBaud: number // bits per second
  uartBitsPerByte: number // 10 for 8N1 (start+8+stop)
  brFramingOverheadBytes: number // host<->BR serial API (SLIP/HDLC) overhead per frame
  uartFullDuplex: boolean // true = TX and RX lines run concurrently

  // ---- Border Router MCU ----
  brProcessingMsPerFrame: number // BR per-frame handling (RF<->UART bridging)
  brBufferFrames: number // BR receive queue depth (frames) before drop

  // ---- Gateway (Raspberry Pi 2 W, Debian, Python service) ----
  gwMqttToUdpMs: number // Python: parse MQTT + MeterID->IPv6 lookup + build UDP (per pkt)
  gwUdpToMqttMs: number // Python: parse UDP + IPv6->MeterID + publish MQTT (per pkt)
  piConcurrency: number // effective parallel workers (GIL-bound Python ~1)
  piLoadFactor: number // >=1 contention multiplier from other Debian services
  gwMaxTxnPerSec: number // legacy sustained transaction throughput (info only)

  // ---- Meter ----
  meterProcessingMs: number // DLMS request handling time inside the meter
  assocTimeoutMs: number // meter association inactivity timeout; if the next
  // request arrives later than this after a response, the meter tears down the
  // association and the transaction/session must restart.
  respRandomDelayMaxMs: number // RF NIC buffers the response and sends it after a
  // uniform random delay in [0, max] to de-correlate uplink bursts (avg = max/2).

  // ---- Frequency hopping (WiSUN FAN unicast schedule) ----
  freqHoppingEnabled: boolean // nodes hop across all channels on time schedules
  numChannels: number // channels in the hopping set (info + collision spreading)
  unicastDwellMs: number // unicast dwell interval; TX must hit the RX's slot
  // (average rendezvous wait ~= dwell/2 per transmission).

  // ---- OS / RTOS scheduling ----
  osSchedulingMs: number // Debian (non-RT) scheduling + syscall jitter per Pi op
  piSelectPollMs: number // Pi select()/poll() wakeup latency per packet
  rnThreadDelayMs: number // RF-NIC / Radio-Node RTOS thread scheduling delay/frame

  // ---- Pi <-> RF NIC QoS2 (exactly-once) engine ----
  piNicQos2: boolean // exactly-once delivery engine between Pi and RF NIC
  piNicQos2Ms: number // base per-message overhead of that handshake
  qos2RetryWindowMs: number // retransmit timeout before a QoS2 packet is retried
  qos2MaxRetries: number // max QoS2 retransmissions
  qos2InterPacketMs: number // guard delay between two consecutive packets
  localLinkPer: number // 0..1 Pi<->NIC link error rate (drives QoS2 retries)

  // ---- BR admission throttling ----
  throttlingEnabled: boolean // hold part of the fleet's first requests in queue
  throttleWindowNodes: number // nodes admitted per wave; next wave after 50% done

  // ---- MQTT / cellular backhaul (EC200U over USB) ----
  cellularRttMs: number // round-trip latency gateway <-> broker over 4G
  cellularThroughputKbps: number // effective usable uplink throughput
  mqttQos: 0 | 1 | 2 // QoS level -> extra handshake round-trips
  mqttOverheadBytes: number // fixed MQTT/TCP/TLS overhead per publish
  brokerToHesMs: number // broker/NMS -> HES backhaul one way

  // ---- Capacity assumptions ----
  channelUtilizationMax: number // 0..1 usable fraction of channel time
  dutyCycleLimit: number // 0..1 regulatory transmit duty cycle cap
}

/** A deployment scenario (poll vs push) driving the capacity calculation. */
export interface UseCase {
  id: string
  label: string
  kind: 'poll' | 'push'
  description: string
  cycleSeconds: number // how often the whole fleet is polled / pushes
  parallel: boolean // requests issued concurrently by HES
}

/** Result of the end-to-end latency budget for one transaction. */
export interface LatencyStage {
  key: string
  label: string
  group: 'downlink' | 'meter' | 'uplink'
  ms: number
  detail: string
}

export interface LatencyBudget {
  stages: LatencyStage[]
  totalMs: number
  downlinkMs: number
  uplinkMs: number
  meterMs: number
  measuredRttMs: number | null // from the log, for calibration
}

/** Airtime breakdown for a set of application bytes over WiSUN. */
export interface AirtimeResult {
  appBytes: number
  fragments: number
  onAirBytes: number // includes all lower-layer headers + fragmentation
  frameAirtimeMs: number // single traversal (no hops)
  ackAirtimeMs: number
  csmaMs: number
  perHopMs: number
  retransFactor: number
  totalAirtimeMs: number // includes hops + retransmissions
  reassemblyMs: number // receiver reassembly cost (fragments > 1)
  oversize: boolean // fragmentation disabled but payload exceeds PSDU cap
}

/** Capacity result: how many nodes can be served. */
export interface CapacityResult {
  perNodeRfMs: number // channel busy time per node per cycle
  perNodeUartMs: number // both directions summed (info)
  perNodeUartTxMs: number // downlink UART line
  perNodeUartRxMs: number // uplink UART line
  perNodeCellularMs: number
  perNodePiMs: number // Pi CPU (Python) per node, both directions
  perNodeBrMs: number // BR MCU per node, both directions
  perNodeGwMs: number
  maxStepChannelMs: number // heaviest single transaction step (both directions)
  maxNodesRf: number // limited by cycle-time channel saturation
  maxNodesUart: number
  maxNodesCellular: number
  maxNodesPi: number
  maxNodesBr: number
  maxNodesGw: number
  maxNodesAssoc: number // limited by association inactivity timeout
  maxNodes: number
  bottleneck: string
  cycleSeconds: number
  targetNodes: number
  gapAtTargetMs: number // worst-case inter-message gap for one meter at targetNodes
  statusAtTarget: SupportStatus
  channelUtilPercentAt: (nodes: number) => number
  gapAt: (nodes: number) => number
}

export type SupportStatus = 'ok' | 'warn' | 'fail'

/** Per-profile verdict at the chosen target fleet size (parallel poll model). */
export interface ProfileSupport {
  id: string
  label: string
  category: string
  reqBytesTotal: number
  respBytesTotal: number
  txnCount: number
  perNodeChannelMs: number
  maxStepChannelMs: number
  maxNodesRf: number
  maxNodesAssoc: number
  nSupported: number
  bottleneck: string
  gapAtTargetMs: number
  utilAtTargetPct: number
  status: SupportStatus
}

/** One resource/stage in the batch timing matrix. */
export interface StageTiming {
  key: string
  label: string
  lane: 'downlink' | 'uplink' | 'meter' | 'shared'
  resource: string // physical resource (RF, UART-TX, Pi-CPU, ...)
  serial: boolean // strict serial (queue) vs parallel across nodes
  perPacketMs: number // one message / heaviest step, one device
  perNodeMs: number // whole profile session, one device
  aggregateMs: number // whole profile session, all N devices (if serial)
  note: string
}

/** Full timing/queue analysis for polling N nodes in parallel. */
export interface BatchAnalysis {
  nodes: number
  stages: StageTiming[]
  bottleneck: StageTiming
  batchThroughputMs: number // time to drain the whole batch (pipeline = max serial aggregate)
  singlePassLatencyMs: number // one transaction end-to-end (pipeline fill)
  batchCompletionMs: number // batchThroughputMs + one fill
  brBacklogFrames: number // peak BR receive-queue depth during an uplink burst
  brBufferFrames: number
  brOverflow: boolean
  assocGapMs: number // worst-case inter-message gap for one meter
  assocTimeoutMs: number
  assocOk: boolean
  oversizeFrame: boolean // a frame exceeds PSDU cap with fragmentation off
}

/** One parameter name/value pair shown as a chip in the data-flow diagram. */
export interface FlowParam {
  label: string
  value: string
}

/** A sub-component timing within a stage (e.g. RF = frame + ACK + CSMA + FH). */
export interface FlowSubBreakdown {
  label: string
  ms: number
}

/** Full per-stage detail for the data-flow diagram: timing + formula + params. */
export interface FlowBlockDetail {
  key: string
  label: string
  group: 'downlink' | 'meter' | 'uplink'
  ms: number
  formula: string // human-readable formula expression
  params: FlowParam[] // parameter name-value pairs that feed the formula
  subBreakdown: FlowSubBreakdown[] // sub-component timings (empty if atomic)
  pctOfTotal: number // percentage of the total round-trip
}

/** Complete data-flow breakdown for one transaction (request down + response up). */
export interface FlowDetail {
  blocks: FlowBlockDetail[]
  totalMs: number
  downlinkMs: number
  meterMs: number
  uplinkMs: number
  reqBytes: number
  respBytes: number
  isPush: boolean
}
