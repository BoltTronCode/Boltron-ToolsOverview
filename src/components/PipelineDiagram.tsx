/**
 * Horizontal data-path diagram (HES ↔ meter) annotated with modelled latency
 * for each hop of one representative transaction.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import {
  Server,
  Cloud,
  RadioTower,
  Cpu,
  Cable,
  Router,
  Gauge,
  ChevronRight,
} from 'lucide-react'
import type { LatencyBudget } from '../lib/types'
import { fmtMs } from '../lib/format'
import { Card, SectionTitle } from './ui'

const ICONS = { Server, Cloud, RadioTower, Cpu, Cable, Router, Gauge }

export function PipelineDiagram({ budget }: { budget: LatencyBudget }) {
  const by = (k: string) => budget.stages.find((s) => s.key === k)?.ms ?? 0
  const cellular = by('cell-down') + by('cell-up')
  const gateway = by('gw-down') + by('gw-up')
  const uart = by('uart-down') + by('uart-up')
  const rf = by('rf-down') + by('rf-up')

  const nodes: { icon: keyof typeof ICONS; label: string; ms: number; color: string }[] = [
    { icon: 'Server', label: 'HES / NMS', ms: by('hes-nms-down') + by('nms-hes-up'), color: 'text-slate-300' },
    { icon: 'Cloud', label: 'MQTT · 4G', ms: cellular, color: 'text-brand-300' },
    { icon: 'Cpu', label: 'RPi Gateway', ms: gateway, color: 'text-violet-300' },
    { icon: 'Cable', label: 'UART', ms: uart, color: 'text-amber-300' },
    { icon: 'RadioTower', label: 'WiSUN BR · RF', ms: rf, color: 'text-cyan-300' },
    { icon: 'Gauge', label: 'Meter', ms: budget.meterMs, color: 'text-teal-300' },
  ]

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<Router className="h-4 w-4" />}
        title="End-to-end data path (round-trip latency per stage)"
      />
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {nodes.map((n, i) => {
          const Icon = ICONS[n.icon]
          return (
            <div key={n.label} className="flex items-center gap-1">
              <div className="flex min-w-[92px] flex-col items-center rounded-xl border border-white/5 bg-base-850/70 px-3 py-3">
                <Icon className={`h-6 w-6 ${n.color}`} />
                <span className="mt-1.5 text-center text-[11px] font-medium text-slate-300">
                  {n.label}
                </span>
                <span className="stat-value mt-0.5 text-[11px] font-semibold text-slate-900">
                  {fmtMs(n.ms)}
                </span>
              </div>
              {i < nodes.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        MeterID ↔ IPv6 translation happens at the RPi gateway (MQTT ↔ UDP). Values shown are the
        modelled sum of downlink + uplink for one transaction of the selected profile.
      </p>
    </Card>
  )
}
