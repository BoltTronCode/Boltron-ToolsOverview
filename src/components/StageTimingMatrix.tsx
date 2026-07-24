/**
 * Real-time stage timing matrix for polling N meters in parallel: per-packet,
 * per-node and aggregate (serial) time on every physical resource, the pipeline
 * bottleneck, BR receive-buffer backlog and the association-gap / oversize checks.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { Layers, AlertTriangle, CheckCircle2, Server } from 'lucide-react'
import type { BatchAnalysis } from '../lib/types'
import { fmtMs, fmtNum } from '../lib/format'
import { Card, SectionTitle } from './ui'

const LANE_COLOR: Record<string, string> = {
  downlink: 'text-brand-600 border-brand-200 bg-brand-50',
  uplink: 'text-teal-600 border-teal-200 bg-teal-50',
  shared: 'text-violet-600 border-violet-200 bg-violet-50',
  meter: 'text-amber-600 border-amber-200 bg-amber-50',
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`chip ${ok ? 'text-teal-600 border-teal-200 bg-teal-50' : 'text-rose-600 border-rose-200 bg-rose-50'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

export function StageTimingMatrix({
  batch,
  useCaseLabel,
  assocApplies,
}: {
  batch: BatchAnalysis
  useCaseLabel: string
  assocApplies: boolean
}) {
  const maxAgg = Math.max(...batch.stages.filter((s) => s.serial).map((s) => s.aggregateMs), 0.0001)

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<Layers className="h-4 w-4" />}
        title={`Stage timing matrix · ${fmtNum(batch.nodes)} nodes / gateway`}
        right={
          <div className="flex flex-wrap gap-1.5">
            <Flag ok={batch.assocOk} label={assocApplies ? (batch.assocOk ? 'Assoc OK' : 'Assoc drop risk') : 'No assoc limit'} />
            <Flag ok={!batch.brOverflow} label={batch.brOverflow ? 'BR overflow' : 'BR buffer OK'} />
            {batch.oversizeFrame && <Flag ok={false} label="Frame > PSDU" />}
          </div>
        }
      />

      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span className="font-medium text-slate-900">Traffic mode:</span> {useCaseLabel}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Fleet throughput window', value: fmtMs(batch.batchThroughputMs), hint: 'slowest serial resource drain' },
          { label: 'Fleet completion', value: fmtMs(batch.batchCompletionMs), hint: 'throughput + one end-to-end fill + random tail' },
          { label: 'Resp spread @ N', value: fmtMs(batch.responseSpreadMs), hint: 'independent per-node random-response spread' },
          { label: 'Bottleneck', value: batch.bottleneck.label, hint: batch.bottleneck.resource },
          {
            label: 'BR peak backlog',
            value: `${fmtNum(batch.brBacklogFrames)} / ${fmtNum(batch.brBufferFrames)}`,
            hint: 'frames buffered at peak burst',
          },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="label">{t.label}</div>
            <div className="stat-value mt-1 text-sm font-semibold text-slate-900">{t.value}</div>
            <div className="mt-1 text-[10px] text-slate-500">{t.hint}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {batch.stages.map((s) => {
          const isBottleneck = s.key === batch.bottleneck.key
          return (
            <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900">
                      <Server className="h-3 w-3 text-slate-400" />
                      {s.label}
                    </div>
                    <span className={`chip ${LANE_COLOR[s.lane]}`}>{s.lane}</span>
                    {isBottleneck && <span className="chip text-rose-600 border-rose-200 bg-rose-50">bottleneck</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{s.resource}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-600">{s.note}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                  <div className="label">Aggregate</div>
                  <div className="stat-value mt-1 text-sm font-semibold text-slate-900">
                    {s.serial ? fmtMs(s.aggregateMs) : 'parallel'}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Metric label="Per packet" value={fmtMs(s.perPacketMs)} />
                <Metric label="Per node" value={fmtMs(s.perNodeMs)} />
                <Metric label="Serial aggregate" value={s.serial ? fmtMs(s.aggregateMs) : 'parallel'} />
              </div>

              {s.serial ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Relative serial load</span>
                    <span>{((s.aggregateMs / maxAgg) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${isBottleneck ? 'bg-rose-500' : 'bg-brand-500'}`}
                      style={{ width: `${(s.aggregateMs / maxAgg) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-slate-500">This stage runs inside each meter and does not serialize on the gateway path.</div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Serial resources (RF radio, UART directions, Pi service CPU, BR MCU, and 4G modem) handle packets one at a time, so their
        aggregate load scales with the fleet. The bottleneck is the busiest such resource. Response randomisation is modelled as an
        independent per-node delay distribution, so it adds a batch-wide response spread instead of a single common delay. BR backlog shows
        whether uplink bursts can be drained safely before the receive queue overflows.
      </p>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="label">{label}</div>
      <div className="stat-value mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}
