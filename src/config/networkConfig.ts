/**
 * Default network / protocol-stack parameters for the Boltron WiSUN gateway.
 *
 * Topology modelled:
 *   HES/NMS  --4G(EC200U/USB)-->  MQTT broker  <-->  RPi gateway
 *   RPi  --UART-->  WiSUN Border Router  --RF mesh-->  Meter nodes
 *
 * Every value here is editable at runtime in the UI; this file only provides
 * sensible, defensible defaults. Change a default and rebuild to ship a new
 * baseline.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { NetworkParams } from '../lib/types'

export const DEFAULT_NETWORK: NetworkParams = {
  // ---- Link layer / RF (IEEE 802.15.4e + WiSUN compressed IPv6/UDP) ----
  macHeaderBytes: 21, // MHR with src/dst + auxiliary security header
  macFcsBytes: 2,
  lowpanHeaderBytes: 6, // IPHC-compressed IPv6 + UDP NHC (typical intra-PAN)
  maxPhyPayloadBytes: 1500, // hard PSDU cap (WiSUN allows large PSDU)
  useMacAck: true,
  macAckBytes: 5, // Imm-ACK PHY payload
  csmaAvgBackoffMs: 4.0, // avg CSMA-CA backoff + CCA per frame
  ifsMs: 1.0, // turnaround / inter-frame spacing per frame
  hopCount: 1, // BR <-> meter mesh depth (airtime multiplier)
  packetErrorRate: 0.02, // 2% base RF PER -> ~1.02 expected transmissions/hop before poor-link overlay
  poorLinkShare: 0, // no weak-RSSI tail by default
  poorLinkExtraPer: 0.08, // poor-link nodes can be modelled with higher RF PER when enabled

  // ---- UDP application packetization / reassembly over WiSUN ----
  fragmentationEnabled: true,
  fragmentRequests: false, // default DLMS traffic is request-small / response-heavier; FOTA may enable this
  fragmentPayloadBytes: 256, // default application payload bytes per UDP app packet
  fragHeaderBytes: 5, // app-layer fragment metadata per packet
  reassemblyMsPerFragment: 0.5, // gateway UDP app reassembly cost per packet

  // ---- Raspberry Pi Zero 2 W <-> Border Router UART (single serial line) ----
  uartBaud: 230400,
  uartBitsPerByte: 10, // 8N1
  brFramingOverheadBytes: 6, // effective Spinel/HDLC-Lite framing overhead per UART packet
  uartFullDuplex: true, // separate TX/RX lines -> directions overlap

  // ---- Border Router MCU ----
  brProcessingMsPerFrame: 0.5, // RF<->UART bridging per frame
  brBufferFrames: 64, // receive queue depth before frames are dropped

  // ---- Gateway (Raspberry Pi Zero 2 W, Debian, Python bridge service) ----
  gwMqttToUdpMs: 1.8, // Python app-layer MQTT decode + IPv6 lookup + UDP build/send
  gwUdpToMqttMs: 1.8, // Python app-layer UDP decode + reverse lookup + MQTT publish
  piConcurrency: 3.2, // 4 cores × 80% usable service capacity on a Pi Zero 2 W
  piLoadFactor: 1.0, // keep neutral by default; worker capacity already reserves 20% headroom
  gwMaxTxnPerSec: 500, // legacy info metric

  // ---- Meter DLMS processing ----
  meterProcessingMs: 50, // default assumed DLMS request handling time inside meter firmware
  assocTimeoutMs: 20000, // default deployment uses 20 s association inactivity timeout
  respRandomDelayMaxMs: 0, // NIC randomised response delay (0 now; tunable later)

  // ---- Frequency hopping (WiSUN FAN unicast schedule) ----
  freqHoppingEnabled: true,
  numChannels: 20, // e.g. India 865-867 MHz @ 100 kHz spacing
  unicastDwellMs: 15, // typical WiSUN unicast dwell interval
  minTxOffMs: 0, // requested default: no extra guard beyond CSMA/IFS/FH unless field data says otherwise

  // ---- OS / RTOS scheduling ----
  osSchedulingMs: 2, // Debian non-RT scheduler + syscall jitter per Pi op
  piSelectPollMs: 1, // Pi select()/poll() wakeup latency
  rnThreadDelayMs: 20, // RF-NIC / Radio-Node RTOS thread scheduling delay per frame

  // ---- UDP application-layer QoS2 / exactly-once control ----
  udpAppQos2: true,
  udpAppQos2Ms: 3, // base app-layer exactly-once bookkeeping / ACK overhead per packet
  qos2RetryWindowMs: 200, // retry timeout if the UDP app-layer ACK is not observed
  qos2MaxRetries: 3,
  qos2InterPacketMs: 0, // guard delay between two consecutive QoS2-protected packets
  udpAppAckLossRate: 0, // app-layer ACK/path loss probability used for expected retries

  // ---- BR admission throttling ----
  throttlingEnabled: false,
  throttleWindowNodes: 50, // admit 50 nodes per wave; next wave after 50% complete

  // ---- MQTT / cellular backhaul (EC200U 4G over USB) ----
  cellularRttMs: 120, // gateway <-> broker round trip over 4G
  cellularThroughputKbps: 1000, // effective usable throughput (conservative)
  mqttQos: 2,
  mqttOverheadBytes: 80, // MQTT fixed/var header + TCP/TLS amortised per publish
  brokerToHesMs: 15, // broker/NMS -> HES backhaul (one way, LAN/WAN)

  // ---- Capacity assumptions ----
  channelUtilizationMax: 0.85, // usable fraction of channel time
  dutyCycleLimit: 1.0, // 1.0 = LBT (no hard duty cap); set e.g. 0.01 for 1%
}
