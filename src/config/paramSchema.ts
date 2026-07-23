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
    ],
  },
  {
    id: 'uart',
    title: 'Pi Zero ↔ Border Router UART',
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
      { key: 'brFramingOverheadBytes', label: 'BR serial framing', unit: 'B', kind: 'number', min: 0, max: 32, step: 1 },
    ],
  },
  {
    id: 'gateway',
    title: 'Gateway (Raspberry Pi) Services',
    icon: 'Cpu',
    fields: [
      { key: 'gwMqttToUdpMs', label: 'MQTT → UDP time', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'gwUdpToMqttMs', label: 'UDP → MQTT time', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'meterProcessingMs', label: 'Meter DLMS processing', unit: 'ms', kind: 'number', min: 0, max: 1000, step: 5 },
      { key: 'gwMaxTxnPerSec', label: 'Gateway throughput', unit: 'txn/s', kind: 'number', min: 10, max: 5000, step: 10 },
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
