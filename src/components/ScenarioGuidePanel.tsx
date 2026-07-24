/**
 * Poll / PUSH guide and currently selected traffic assumptions.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron telesystems private limited
 */
import { BookOpenText, Cpu, FileStack, Repeat, Router, ShieldCheck } from 'lucide-react'
import { USE_CASES } from '../config/useCases'
import { TOPOLOGY_SCENARIOS } from '../config/topologyScenarios'
import type { NetworkParams } from '../lib/types'
import { Card, Chip, SectionTitle } from './ui'

export function ScenarioGuidePanel({
  workload,
  workloadCategory,
  workloadDescription,
  selectedUseCaseId,
  selectedTopologyId,
  net,
  pushBytes,
}: {
  workload: string
  workloadCategory: string
  workloadDescription: string
  selectedUseCaseId: string
  selectedTopologyId: string
  net: NetworkParams
  pushBytes: number
}) {
  const selectedUseCase = USE_CASES.find((u) => u.id === selectedUseCaseId) ?? USE_CASES[0]
  const selectedTopology = TOPOLOGY_SCENARIOS.find((t) => t.id === selectedTopologyId) ?? TOPOLOGY_SCENARIOS[0]
  const isPush = selectedUseCase.kind === 'push'

  return (
    <Card className="card-pad">
      <SectionTitle icon={<BookOpenText className="h-4 w-4" />} title="Traffic mode + RF deployment guide" />

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Repeat className="h-4 w-4 text-brand-500" /> Selected traffic mode
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip color="brand">{selectedUseCase.label}</Chip>
              <Chip color={isPush ? 'amber' : 'cyan'}>{isPush ? 'uplink only' : 'downlink + uplink'}</Chip>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedUseCase.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Router className="h-4 w-4 text-brand-500" /> Selected RF deployment scenario
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip color="cyan">{selectedTopology.label}</Chip>
              <Chip color="slate">{selectedTopology.buckets.map((b) => b.percent).join('/')}</Chip>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedTopology.description}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Slash notation means 1-hop / 2-hop / 3-hop / ... fleet distribution across the RF mesh.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileStack className="h-4 w-4 text-brand-500" /> Active workload reference
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip color="brand">{workload}</Chip>
              <Chip color="violet">{workloadCategory}</Chip>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{workloadDescription}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Cpu className="h-4 w-4 text-brand-500" /> Current modelling assumptions
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <div className="label">Pi Zero 2 W effective workers</div>
                <div className="mt-1 stat-value font-semibold text-slate-900">{net.piConcurrency.toFixed(1)}</div>
                <p className="mt-1 text-xs text-slate-500">Modelled at ~80% usable service capacity by default.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <div className="label">Meter DLMS processing</div>
                <div className="mt-1 stat-value font-semibold text-slate-900">{net.meterProcessingMs} ms</div>
                <p className="mt-1 text-xs text-slate-500">1PH default baseline requested for the model.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <div className="label">Base RF PER</div>
                <div className="mt-1 stat-value font-semibold text-slate-900">{(net.packetErrorRate * 100).toFixed(1)}%</div>
                <p className="mt-1 text-xs text-slate-500">Editable in percentage because this is an RF path assumption.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <div className="label">Poor-link node share</div>
                <div className="mt-1 stat-value font-semibold text-slate-900">{(net.poorLinkShare * 100).toFixed(1)}%</div>
                <p className="mt-1 text-xs text-slate-500">Weak-RSSI overlay applied on top of the RF deployment scenario.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> What Poll means here
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm leading-relaxed text-slate-600">
                Poll mode means HES/NMS sends <span className="font-medium text-slate-900">REQT</span> downlink and the meter returns
                <span className="font-medium text-slate-900"> RESP</span> uplink. Instant profile, block load, daily,
                billing, and FOTA are all treated as polling workloads. Only the raw payload size changes from one profile to another.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> What PUSH means here
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm leading-relaxed text-slate-600">
                PUSH mode means an uplink-only event such as <span className="font-medium text-slate-900">Last Gasp</span>.
                All meters are assumed to send the same <span className="font-medium text-slate-900">{pushBytes}-byte</span> 1PH raw DLMS PUSH payload at the same time.
                There is no HES downlink request in this mode.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> 1PH note
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm leading-relaxed text-slate-600">
                The dashboard is currently presenting the <span className="font-medium text-slate-900">1PH meter</span> reference sizes.
                If you want accurate 3PH modelling, the raw request / response / PUSH byte sizes must be replaced with the 3PH captures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
