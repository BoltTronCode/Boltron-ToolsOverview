/**
 * Simple vertical block-diagram walkthrough for explaining the packet journey.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron telesystems private limited
 */
import {
  ArrowDown,
  Cable,
  Cloud,
  Cpu,
  Gauge,
  Network,
  RadioTower,
  Router,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import type { FlowBlockDetail, FlowDetail } from '../lib/types'
import { fmtMs } from '../lib/format'
import { Card, Chip, SectionTitle } from './ui'

const GROUP_STYLE: Record<FlowBlockDetail['group'], 'brand' | 'teal' | 'cyan'> = {
  downlink: 'brand',
  meter: 'teal',
  uplink: 'cyan',
}

const STAGE_META: Record<string, { short: string; what: string; icon: typeof Server; color: string }> = {
  'hes-nms-down': {
    short: 'HES gives the command to NMS.',
    what: 'Start of polling request flow.',
    icon: Server,
    color: 'text-slate-600',
  },
  'cell-down': {
    short: 'NMS sends the request over 4G / MQTT.',
    what: 'Backhaul transfer toward the gateway.',
    icon: Cloud,
    color: 'text-brand-600',
  },
  'gw-down': {
    short: 'Pi app converts MQTT into IPv6/UDP for the meter.',
    what: 'MeterID lookup and packet build happen here.',
    icon: Cpu,
    color: 'text-violet-600',
  },
  'qos2-down': {
    short: 'UDP app-layer QoS2 adds exactly-once state.',
    what: 'Duplicate protection / retry bookkeeping before WiSUN forwarding.',
    icon: ShieldCheck,
    color: 'text-amber-600',
  },
  'uart-down': {
    short: 'Packet is serialized onto UART.',
    what: 'wfantund / Spinel / HDLC host-to-BR transfer.',
    icon: Cable,
    color: 'text-amber-600',
  },
  'rn-down': {
    short: 'Border Router firmware schedules the radio path.',
    what: 'NWP + RN thread handling before RF transmission.',
    icon: Router,
    color: 'text-cyan-600',
  },
  'rf-down': {
    short: 'Request travels through the WiSUN RF mesh.',
    what: 'Includes hops, CSMA, ACKs, hopping, and retries.',
    icon: RadioTower,
    color: 'text-cyan-600',
  },
  meter: {
    short: 'Meter processes the DLMS request.',
    what: 'Meter firmware prepares the application response.',
    icon: Gauge,
    color: 'text-teal-600',
  },
  'resp-delay': {
    short: 'Meter waits before uplink transmit.',
    what: 'Randomized delay used to spread simultaneous responses.',
    icon: Zap,
    color: 'text-amber-600',
  },
  'rf-up': {
    short: 'Response comes back through the WiSUN RF mesh.',
    what: 'Uplink over the same mesh path.',
    icon: RadioTower,
    color: 'text-cyan-600',
  },
  'rn-up': {
    short: 'Border Router firmware receives and forwards the response.',
    what: 'RN thread + NWP uplink processing.',
    icon: Router,
    color: 'text-cyan-600',
  },
  reassembly: {
    short: 'Pi app reassembles the UDP packet stream.',
    what: 'Needed when the uplink payload was packetized across multiple UDP app packets.',
    icon: Network,
    color: 'text-cyan-600',
  },
  'qos2-up': {
    short: 'UDP app-layer QoS2 validates the response.',
    what: 'ACK / state update for exactly-once handling.',
    icon: ShieldCheck,
    color: 'text-amber-600',
  },
  'uart-up': {
    short: 'Response is serialized from BR back to Linux host.',
    what: 'UART / Spinel / HDLC BR-to-host transfer.',
    icon: Cable,
    color: 'text-amber-600',
  },
  'gw-up': {
    short: 'Pi app converts IPv6/UDP into MQTT.',
    what: 'Reverse lookup and publish toward upstream systems.',
    icon: Cpu,
    color: 'text-violet-600',
  },
  'cell-up': {
    short: 'Gateway sends the response over 4G / MQTT.',
    what: 'Backhaul transfer from gateway to NMS.',
    icon: Cloud,
    color: 'text-brand-600',
  },
  'nms-hes-up': {
    short: 'NMS hands the result back to HES.',
    what: 'Final response delivery to the head-end system.',
    icon: Server,
    color: 'text-slate-600',
  },
}

function StepRow({ block, index }: { block: FlowBlockDetail; index: number }) {
  const meta = STAGE_META[block.key] ?? STAGE_META.meter
  const Icon = meta.icon

  return (
    <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <div className="mb-2 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
            <Icon className={clsx('h-5 w-5', meta.color)} />
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500">STEP {String(index + 1).padStart(2, '0')}</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{block.label}</div>
        <div className="mt-2 flex justify-center">
          <Chip color={GROUP_STYLE[block.group]}>{block.group}</Chip>
        </div>
        <div className="mt-2 stat-value text-base font-bold text-brand-600">{fmtMs(block.ms)}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">{meta.short}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{meta.what}</p>
      </div>
    </div>
  )
}

export function StageWalkthrough({ detail }: { detail: FlowDetail }) {
  return (
    <Card className="card-pad">
      <SectionTitle icon={<Network className="h-4 w-4" />} title="Simple stage walkthrough" />
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        This is a simple vertical block diagram for explanation. The downward arrows show the reading direction of the story.
        Downlink, meter processing, and uplink are all shown in one easy top-to-bottom sequence.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip color="brand">Request {detail.reqBytes} B</Chip>
        <Chip color="cyan">Response {detail.respBytes} B</Chip>
        <Chip color="teal">Total {fmtMs(detail.totalMs)}</Chip>
      </div>

      <div className="space-y-2">
        {detail.blocks.map((block, index) => (
          <div key={block.key}>
            <StepRow block={block} index={index} />
            {index < detail.blocks.length - 1 && (
              <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex justify-center py-2">
                  <ArrowDown className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
