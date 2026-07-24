/**
 * Declarative schema for every editable network parameter. The control panel
 * renders itself from this list, so adding a tunable knob is a one-line change.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron telesystems private limited
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
      {
        key: 'hopCount',
        label: 'Representative air hops',
        kind: 'slider',
        min: 1,
        max: 8,
        step: 1,
        hint: 'Used for single-meter latency. Fleet timing and counts use the selected RF deployment scenario hop distribution.',
      },
      {
        key: 'packetErrorRate',
        label: 'Base RF packet error rate',
        unit: '%',
        kind: 'slider',
        min: 0,
        max: 0.4,
        step: 0.01,
        hint: 'Base WiSUN RF PER before the poor-link overlay is applied. Dense or multi-hop deployments usually push this higher.',
      },
      {
        key: 'poorLinkShare',
        label: 'Poor-link node share',
        unit: '%',
        kind: 'slider',
        min: 0,
        max: 0.5,
        step: 0.01,
        hint: 'Fraction of the fleet suffering poor RSSI / weak links on top of the hop-distribution scenario.',
      },
      {
        key: 'poorLinkExtraPer',
        label: 'Extra PER on poor links',
        unit: '%',
        kind: 'slider',
        min: 0,
        max: 0.5,
        step: 0.01,
        hint: 'Additional RF packet error rate applied only to the poor-link share of the fleet.',
      },
      { key: 'maxPhyPayloadBytes', label: 'Max PHY payload', unit: 'B', kind: 'number', min: 90, max: 2043, step: 1 },
      { key: 'macHeaderBytes', label: 'MAC header + security', unit: 'B', kind: 'number', min: 9, max: 64, step: 1 },
      { key: 'lowpanHeaderBytes', label: 'WiSUN IPv6/UDP hdr', unit: 'B', kind: 'number', min: 2, max: 48, step: 1 },
      { key: 'macFcsBytes', label: 'MAC FCS', unit: 'B', kind: 'number', min: 2, max: 4, step: 2 },
      { key: 'csmaAvgBackoffMs', label: 'Avg CSMA/CA backoff', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'ifsMs', label: 'Inter-frame spacing', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.5 },
      { key: 'useMacAck', label: 'MAC layer ACK', kind: 'toggle' },
      { key: 'macAckBytes', label: 'MAC ACK size', unit: 'B', kind: 'number', min: 3, max: 32, step: 1 },
      { key: 'freqHoppingEnabled', label: 'Frequency hopping', kind: 'toggle', hint: 'Nodes hop across all channels; TX waits for the RX slot.' },
      { key: 'numChannels', label: 'Hopping channels', kind: 'number', min: 1, max: 129, step: 1, hint: 'Spreads interference; does NOT multiply a single BR radio.' },
      { key: 'unicastDwellMs', label: 'Unicast dwell interval', unit: 'ms', kind: 'slider', min: 0, max: 255, step: 1, hint: 'Avg rendezvous wait ≈ dwell/2 per TX.' },
      { key: 'minTxOffMs', label: 'Minimum TX off time', unit: 'ms', kind: 'number', min: 0, max: 100, step: 0.5, hint: 'Extra RF guard time between consecutive packets. Requested default is 0 ms.' },
    ],
  },
  {
    id: 'fragmentation',
    title: 'UDP App Packetization / Reassembly',
    icon: 'Split',
    fields: [
      {
        key: 'fragmentationEnabled',
        label: 'Packetization enabled',
        kind: 'toggle',
        hint: 'Split large application payloads into multiple UDP app packets before WiSUN transport. Off = one packet must fit the RF payload cap.',
      },
      {
        key: 'fragmentRequests',
        label: 'Also packetize requests',
        kind: 'toggle',
        hint: 'Enable for large downlink cases such as FOTA chunk transfer.',
      },
      {
        key: 'fragmentPayloadBytes',
        label: 'Application bytes / packet',
        unit: 'B',
        kind: 'slider',
        min: 40,
        max: 1280,
        step: 8,
        hint: 'Useful application payload carried in each UDP app packet. Requested default is 256 B.',
      },
      { key: 'fragHeaderBytes', label: 'App fragment header', unit: 'B', kind: 'number', min: 0, max: 16, step: 1 },
      { key: 'reassemblyMsPerFragment', label: 'Gateway reassembly / packet', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.1, hint: 'Pi-side UDP application reassembly cost for every packet in a packetized response.' },
    ],
  },
  {
    id: 'timing',
    title: 'OS / RTOS Scheduling',
    icon: 'Timer',
    fields: [
      { key: 'osSchedulingMs', label: 'Debian scheduler jitter / op', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5, hint: 'Non-realtime kernel scheduling + syscall latency.' },
      { key: 'piSelectPollMs', label: 'Pi select()/poll() wakeup', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.5 },
      { key: 'rnThreadDelayMs', label: 'RF-NIC (RN) thread delay / packet', unit: 'ms', kind: 'number', min: 0, max: 100, step: 1, hint: 'Radio-Node RTOS thread scheduling latency applied for each packet.' },
    ],
  },
  {
    id: 'uart',
    title: 'Pi Zero 2 W ↔ Border Router UART',
    icon: 'Cable',
    fields: [
      {
        key: 'uartBaud',
        label: 'UART baud rate',
        unit: 'bps',
        kind: 'select',
        options: [
          { label: '9600', value: 9600 },
          { label: '19200', value: 19200 },
          { label: '38400', value: 38400 },
          { label: '57600', value: 57600 },
          { label: '115200', value: 115200 },
          { label: '230400', value: 230400 },
          { label: '460800', value: 460800 },
          { label: '921600', value: 921600 },
        ],
      },
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
      { key: 'brProcessingMsPerFrame', label: 'BR per-packet handling', unit: 'ms', kind: 'number', min: 0, max: 20, step: 0.1 },
      { key: 'brBufferFrames', label: 'BR RX buffer depth', unit: 'frames', kind: 'number', min: 1, max: 1024, step: 1, hint: 'Uplink burst packets the BR can hold before dropping.' },
      { key: 'throttlingEnabled', label: 'Admission throttling', kind: 'toggle', hint: 'Hold part of the fleet; admit the next wave after 50% complete.' },
      { key: 'throttleWindowNodes', label: 'Throttle wave size', unit: 'nodes', kind: 'number', min: 1, max: 500, step: 1 },
    ],
  },
  {
    id: 'gateway',
    title: 'Raspberry Pi Zero 2 W · Debian Service',
    icon: 'Cpu',
    fields: [
      { key: 'gwMqttToUdpMs', label: 'Python MQTT→UDP / packet', unit: 'ms', kind: 'number', min: 0.1, max: 50, step: 0.1, hint: 'MQTT parse + meterID/IPv6 lookup + UDP send into Linux/wfantund path.' },
      { key: 'gwUdpToMqttMs', label: 'Python UDP→MQTT / packet', unit: 'ms', kind: 'number', min: 0.1, max: 50, step: 0.1, hint: 'Receive from Linux/wfantund path + reverse lookup + MQTT publish.' },
      { key: 'piConcurrency', label: 'Effective worker threads', kind: 'number', min: 0.5, max: 8, step: 0.1, hint: 'Service-capacity abstraction, not literal Python threads. Pi Zero 2 W has 4 cores; 80% usable capacity ≈ 3.2 effective workers.' },
      { key: 'piLoadFactor', label: 'Other-services load factor', kind: 'slider', min: 1, max: 3, step: 0.1, hint: 'Extra slowdown from logging, TLS, background services, and scheduler contention. 1.0 = already budgeted into worker capacity.' },
      { key: 'meterProcessingMs', label: 'Meter DLMS processing', unit: 'ms', kind: 'number', min: 0, max: 1000, step: 5, hint: 'Default baseline is 50 ms unless the meter firmware proves otherwise.' },
    ],
  },
  {
    id: 'reliability',
    title: 'Meter Association / UDP App QoS2',
    icon: 'ShieldCheck',
    fields: [
      { key: 'assocTimeoutMs', label: 'Association inactivity timeout', unit: 'ms', kind: 'slider', min: 1000, max: 120000, step: 1000, hint: 'Default deployment baseline is 20,000 ms. In parallel poll mode, if the next request arrives later than this, the meter drops the association.' },
      { key: 'respRandomDelayMaxMs', label: 'Randomised response delay (max)', unit: 'ms', kind: 'slider', min: 0, max: 2000, step: 10, hint: 'Each node draws its own independent delay in [0,max]. Single-meter latency uses avg=max/2; batch timing uses the all-node spread across the fleet.' },
      { key: 'udpAppQos2', label: 'UDP app-layer QoS2', kind: 'toggle', hint: 'Exactly-once control handled by the UDP application layer before packets enter the WiSUN stack.' },
      { key: 'udpAppQos2Ms', label: 'QoS2 base overhead', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5, hint: 'Per-packet app-layer state/ACK bookkeeping cost.' },
      { key: 'qos2RetryWindowMs', label: 'QoS2 retry window', unit: 'ms', kind: 'number', min: 10, max: 2000, step: 10, hint: 'Wait before retry when the UDP app-layer ACK is missing.' },
      { key: 'qos2MaxRetries', label: 'QoS2 max retries', kind: 'number', min: 0, max: 10, step: 1 },
      { key: 'qos2InterPacketMs', label: 'Inter-packet guard delay', unit: 'ms', kind: 'number', min: 0, max: 50, step: 0.5 },
      { key: 'udpAppAckLossRate', label: 'UDP app ACK loss rate', kind: 'slider', min: 0, max: 0.2, step: 0.005, hint: 'Expected ACK / app-path loss probability used to estimate retries.' },
    ],
  },
  {
    id: 'cellular',
    title: '4G Backhaul / MQTT (EC200U)',
    icon: 'Signal',
    fields: [
      { key: 'cellularRttMs', label: 'Cellular RTT', unit: 'ms', kind: 'slider', min: 20, max: 800, step: 5 },
      { key: 'cellularThroughputKbps', label: 'Cellular throughput', unit: 'kbps', kind: 'number', min: 50, max: 20000, step: 50 },
      {
        key: 'mqttQos',
        label: 'MQTT QoS',
        kind: 'select',
        options: [
          { label: 'QoS 0', value: 0 },
          { label: 'QoS 1', value: 1 },
          { label: 'QoS 2', value: 2 },
        ],
      },
      { key: 'mqttOverheadBytes', label: 'MQTT/TCP/TLS overhead', unit: 'B', kind: 'number', min: 0, max: 400, step: 5 },
      { key: 'brokerToHesMs', label: 'NMS ↔ HES backhaul', unit: 'ms', kind: 'number', min: 0, max: 500, step: 1 },
    ],
  },
  {
    id: 'capacity',
    title: 'Fleet assumptions',
    icon: 'Gauge',
    fields: [
      { key: 'channelUtilizationMax', label: 'Max channel utilization', kind: 'slider', min: 0.1, max: 1, step: 0.05 },
      { key: 'dutyCycleLimit', label: 'Regulatory duty cycle cap', kind: 'slider', min: 0.01, max: 1, step: 0.01, hint: '1.0 = LBT (no hard cap).' },
    ],
  },
]
