/**
 * Declarative schema for every editable network parameter. The control panel
 * renders itself from this list, so adding a tunable knob is a one-line change.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { NetworkParams } from '../lib/types'

export type FieldKind = 'number' | 'slider' | 'toggle' | 'select'

export interface ParamField {
  key: keyof NetworkParams
  label: string
  unit?: string
  kind: FieldKind
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: number }[]
  hint?: string
}

export interface ParamGroup {
  id: string
  title: string
  icon: string // lucide icon name
  fields: ParamField[]
}

export const PARAM_GROUPS: ParamGroup[] = [
  {
    id: 'rf',
    title: 'WiSUN RF / Link Layer',
    icon: 'RadioTower',
    fields: [
      { key: 'hopCount', label: 'Mesh hop count', kind: 'slider', min: 1, max: 8, step: 1, hint: 'BR ↔ meter depth; multiplies airtime.' },
      { key: 'packetErrorRate', label: 'Packet error rate', kind: 'slider', min: 0, max: 0.4, step: 0.01, hint: 'Drives expected retransmissions per hop.' },
      { key: 'maxPhyPayloadBytes', label: 'Max PHY payload (frag)', unit: 'B', kind: 'number', min: 90, max: 2043, step: 1 },
      { key: 'macHeaderBytes', label: 'MAC header + security', unit: 'B', kind: 'number', min: 9, max: 64, step: 1 },
      { key: 'lowpanHeaderBytes', label: '6LoWPAN/IPv6/UDP hdr', unit: 'B', kind: 'number', min: 2, max: 48, step: 1 },
      { key: 'macFcsBytes', label: 'MAC FCS', unit: 'B', kind: 'number', min: 2, max: 4, step: 2 },
      { key: 'csmaAvgBackoffMs', label: 'Avg CSMA/CA backoff', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'ifsMs', label: 'Inter-frame spacing', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.5 },
      { key: 'useMacAck', label: 'MAC layer ACK', kind: 'toggle' },
      { key: 'macAckBytes', label: 'MAC ACK size', unit: 'B', kind: 'number', min: 3, max: 32, step: 1 },
      { key: 'freqHoppingEnabled', label: 'Frequency hopping', kind: 'toggle', hint: 'Nodes hop across all channels; TX waits for the RX slot.' },
      { key: 'numChannels', label: 'Hopping channels', kind: 'number', min: 1, max: 129, step: 1, hint: 'Spreads interference; does NOT multiply a single BR radio.' },
      { key: 'unicastDwellMs', label: 'Unicast dwell interval', unit: 'ms', kind: 'slider', min: 0, max: 255, step: 1, hint: 'Avg rendezvous wait ≈ dwell/2 per TX.' },
    ],
  },
  {
    id: 'fragmentation',
    title: '6LoWPAN Fragmentation / Reassembly',
    icon: 'Split',
    fields: [
      { key: 'fragmentationEnabled', label: 'Fragmentation enabled', kind: 'toggle', hint: 'Response-only (uplink); requests are small. Off = single frame (must fit PSDU cap).' },
      { key: 'fragmentPayloadBytes', label: 'Fragment payload size', unit: 'B', kind: 'slider', min: 40, max: 1280, step: 8, hint: 'Datagram bytes carried per L2 fragment.' },
      { key: 'fragHeaderBytes', label: 'Fragment header', unit: 'B', kind: 'number', min: 0, max: 12, step: 1 },
      { key: 'reassemblyMsPerFragment', label: 'Reassembly / fragment', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.1 },
    ],
  },
  {
    id: 'timing',
    title: 'OS / RTOS Scheduling',
    icon: 'Timer',
    fields: [
      { key: 'osSchedulingMs', label: 'Debian scheduler jitter / op', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5, hint: 'Non-realtime kernel scheduling + syscall latency.' },
      { key: 'piSelectPollMs', label: 'Pi select()/poll() wakeup', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.5 },
      { key: 'rnThreadDelayMs', label: 'RF-NIC (RN) thread delay / frame', unit: 'ms', kind: 'number', min: 0, max: 100, step: 1, hint: 'Radio-Node RTOS thread scheduling delay per frame.' },
    ],
  },
  {
    id: 'uart',
    title: 'Pi 2 W ↔ Border Router UART',
    icon: 'Cable',
    fields: [
      { key: 'uartBaud', label: 'UART baud rate', unit: 'bps', kind: 'select', options: [
        { label: '9600', value: 9600 },
        { label: '19200', value: 19200 },
        { label: '38400', value: 38400 },
        { label: '57600', value: 57600 },
        { label: '115200', value: 115200 },
        { label: '230400', value: 230400 },
        { label: '460800', value: 460800 },
        { label: '921600', value: 921600 },
      ] },
      { key: 'uartBitsPerByte', label: 'Bits per byte', kind: 'number', min: 8, max: 12, step: 1, hint: '10 for 8N1 (start+8+stop).' },
      { key: 'brFramingOverheadBytes', label: 'Serial framing (SLIP/HDLC)', unit: 'B', kind: 'number', min: 0, max: 32, step: 1 },
      { key: 'uartFullDuplex', label: 'Full-duplex (TX/RX overlap)', kind: 'toggle' },
    ],
  },
  {
    id: 'br',
    title: 'WiSUN Border Router MCU',
    icon: 'Router',
    fields: [
      { key: 'brProcessingMsPerFrame', label: 'BR per-frame handling', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.1 },
      { key: 'brBufferFrames', label: 'BR RX buffer depth', unit: 'frames', kind: 'number', min: 1, max: 1024, step: 1, hint: 'Uplink burst frames the BR can hold before dropping.' },
      { key: 'throttlingEnabled', label: 'Admission throttling', kind: 'toggle', hint: 'Hold part of the fleet; admit the next wave after 50% complete.' },
      { key: 'throttleWindowNodes', label: 'Throttle wave size', unit: 'nodes', kind: 'number', min: 1, max: 500, step: 1 },
    ],
  },
  {
    id: 'gateway',
    title: 'Raspberry Pi 2 W · Debian Service',
    icon: 'Cpu',
    fields: [
      { key: 'gwMqttToUdpMs', label: 'Python MQTT→UDP / pkt', unit: 'ms', kind: 'number', min: 0.1, max: 50, step: 0.1, hint: 'Parse + IPv6 lookup + build UDP + serial write.' },
      { key: 'gwUdpToMqttMs', label: 'Python UDP→MQTT / pkt', unit: 'ms', kind: 'number', min: 0.1, max: 50, step: 0.1 },
      { key: 'piConcurrency', label: 'Effective worker threads', kind: 'number', min: 1, max: 4, step: 1, hint: 'CPython GIL usually limits this to ~1.' },
      { key: 'piLoadFactor', label: 'Other-services load factor', kind: 'slider', min: 1, max: 3, step: 0.1 },
      { key: 'meterProcessingMs', label: 'Meter DLMS processing', unit: 'ms', kind: 'number', min: 0, max: 1000, step: 5 },
    ],
  },
  {
    id: 'reliability',
    title: 'Meter Association / QoS2 Engine',
    icon: 'ShieldCheck',
    fields: [
      { key: 'assocTimeoutMs', label: 'Association inactivity timeout', unit: 'ms', kind: 'slider', min: 1000, max: 120000, step: 1000, hint: 'If the next request to a meter arrives after this gap, the meter drops the association.' },
      { key: 'respRandomDelayMaxMs', label: 'Randomised response delay (max)', unit: 'ms', kind: 'slider', min: 0, max: 2000, step: 10, hint: 'NIC buffers the response and sends after a random delay in [0,max]; avg = max/2.' },
      { key: 'piNicQos2', label: 'Pi ↔ RF-NIC QoS2 (exactly-once)', kind: 'toggle' },
      { key: 'piNicQos2Ms', label: 'QoS2 base overhead', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'qos2RetryWindowMs', label: 'QoS2 retry window', unit: 'ms', kind: 'number', min: 10, max: 2000, step: 10 },
      { key: 'qos2MaxRetries', label: 'QoS2 max retries', kind: 'number', min: 0, max: 10, step: 1 },
      { key: 'qos2InterPacketMs', label: 'Inter-packet guard delay', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'localLinkPer', label: 'Pi↔NIC link error rate', kind: 'slider', min: 0, max: 0.2, step: 0.005 },
    ],
  },
  {
    id: 'cellular',
    title: '4G Backhaul / MQTT (EC200U)',
    icon: 'Signal',
    fields: [
      { key: 'cellularRttMs', label: 'Cellular RTT', unit: 'ms', kind: 'slider', min: 20, max: 800, step: 5 },
      { key: 'cellularThroughputKbps', label: 'Cellular throughput', unit: 'kbps', kind: 'number', min: 50, max: 20000, step: 50 },
      { key: 'mqttQos', label: 'MQTT QoS', kind: 'select', options: [
        { label: 'QoS 0', value: 0 },
        { label: 'QoS 1', value: 1 },
        { label: 'QoS 2', value: 2 },
      ] },
      { key: 'mqttOverheadBytes', label: 'MQTT/TCP/TLS overhead', unit: 'B', kind: 'number', min: 0, max: 400, step: 5 },
      { key: 'brokerToHesMs', label: 'NMS ↔ HES backhaul', unit: 'ms', kind: 'number', min: 0, max: 500, step: 1 },
    ],
  },
  {
    id: 'capacity',
    title: 'Capacity Assumptions',
    icon: 'Gauge',
    fields: [
      { key: 'channelUtilizationMax', label: 'Max channel utilization', kind: 'slider', min: 0.1, max: 1, step: 0.05 },
      { key: 'dutyCycleLimit', label: 'Regulatory duty cycle cap', kind: 'slider', min: 0.01, max: 1, step: 0.01, hint: '1.0 = LBT (no hard cap).' },
    ],
  },
]
