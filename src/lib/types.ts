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
  maxPhyPayloadBytes: number // max PSDU before 6LoWPAN fragmentation
  useMacAck: boolean
  macAckBytes: number // ACK frame size (PHY payload)
  csmaAvgBackoffMs: number // average CSMA/CA backoff + CCA per frame
  ifsMs: number // inter-frame spacing / turnaround per frame
  hopCount: number // mesh depth (BR <-> meter), airtime multiplier
  packetErrorRate: number // 0..1, drives expected retransmissions per hop

  // ---- Pi Zero <-> Border Router UART ----
  uartBaud: number // bits per second
  uartBitsPerByte: number // 10 for 8N1 (start+8+stop)
  brFramingOverheadBytes: number // host<->BR serial API overhead per frame

  // ---- Gateway (Raspberry Pi) processing ----
  gwMqttToUdpMs: number // MQTT parse + MeterID->IPv6 lookup + build UDP
  gwUdpToMqttMs: number // UDP parse + IPv6->MeterID + publish
  gwMaxTxnPerSec: number // sustained transaction throughput of gateway CPU

  // ---- Meter ----
  meterProcessingMs: number // DLMS request handling time inside the meter

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
}

/** Capacity result: how many nodes can be served. */
export interface CapacityResult {
  perNodeRfMs: number // channel busy time per node per cycle
  perNodeUartMs: number
  perNodeCellularMs: number
  perNodeGwMs: number
  maxNodesRf: number
  maxNodesUart: number
  maxNodesCellular: number
  maxNodesGw: number
  maxNodes: number
  bottleneck: string
  cycleSeconds: number
  channelUtilPercentAt: (nodes: number) => number
}
