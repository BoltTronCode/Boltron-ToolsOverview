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
  // ---- Link layer / RF (IEEE 802.15.4e + 6LoWPAN) ----
  macHeaderBytes: 21, // MHR with src/dst + auxiliary security header
  macFcsBytes: 2,
  lowpanHeaderBytes: 6, // IPHC-compressed IPv6 + UDP NHC (typical intra-PAN)
  maxPhyPayloadBytes: 1500, // WiSUN allows large PSDU; fragment beyond this
  useMacAck: true,
  macAckBytes: 5, // Imm-ACK PHY payload
  csmaAvgBackoffMs: 4.0, // avg CSMA-CA backoff + CCA per frame
  ifsMs: 1.0, // turnaround / inter-frame spacing per frame
  hopCount: 1, // BR <-> meter mesh depth (airtime multiplier)
  packetErrorRate: 0.02, // 2% PER -> ~1.02 expected transmissions/hop

  // ---- Raspberry Pi Zero <-> Border Router UART ----
  uartBaud: 115200,
  uartBitsPerByte: 10, // 8N1
  brFramingOverheadBytes: 6, // host<->BR serial API framing per frame

  // ---- Gateway (Raspberry Pi) service processing ----
  gwMqttToUdpMs: 2.0,
  gwUdpToMqttMs: 2.0,
  gwMaxTxnPerSec: 500, // sustained DLMS transactions the Pi can pump

  // ---- Meter DLMS processing ----
  meterProcessingMs: 120, // per request (assoc/get) inside meter firmware

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
