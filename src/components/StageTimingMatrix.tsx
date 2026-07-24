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
  downlink: 'text-brand-300',
  uplink: 'text-teal-300',
  shared: 'text-violet-300',
  meter: 'text-amber-300',
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`chip ${ok ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-rose-300 border-rose-500/30 bg-rose-500/10'}`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

export function StageTimingMatrix({ batch }: { batch: BatchAnalysis }) {
  const maxAgg = Math.max(...batch.stages.filter((s) => s.serial).map((s) => s.aggregateMs), 0.0001)

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<Layers className="h-4 w-4" />}
        title={`Stage timing matrix · ${fmtNum(batch.nodes)} nodes in parallel`}
        right={
          <div className="flex flex-wrap gap-1.5">
            <Flag ok={batch.assocOk} label={batch.assocOk ? 'Assoc OK' : 'Assoc drop risk'} />
            <Flag ok={!batch.brOverflow} label={batch.brOverflow ? 'BR overflow' : 'BR buffer OK'} />
            {batch.oversizeFrame && <Flag ok={false} label="Frame > PSDU" />}
          </div>
        }
      />

      {/* Summary tiles */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Batch throughput', value: fmtMs(batch.batchThroughputMs), hint: 'drain all nodes' },
          { label: 'Batch completion', value: fmtMs(batch.batchCompletionMs), hint: '+ pipeline fill' },
          { label: 'Bottleneck', value: batch.bottleneck.label, hint: batch.bottleneck.resource },
          {
            label: 'BR peak backlog',
            value: `${fmtNum(batch.brBacklogFrames)} / ${fmtNum(batch.brBufferFrames)}`,
            hint: 'frames buffered',
          },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border border-white/5 bg-base-850/60 px-3 py-2">
            <div className="label">{t.label}</div>
            <div className="stat-value mt-0.5 truncate text-sm font-bold text-slate-900" title={String(t.value)}>
              {t.value}
            </div>
            <div className="text-[10px] text-slate-500">{t.hint}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-base-850 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Stage / resource</th>
              <th className="px-3 py-2 text-right font-medium">Per packet</th>
              <th className="px-3 py-2 text-right font-medium">Per node</th>
              <th className="px-3 py-2 text-right font-medium">Aggregate ({fmtNum(batch.nodes)})</th>
              <th className="px-3 py-2 font-medium">Serial load</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {batch.stages.map((s) => {
              const isBottleneck = s.key === batch.bottleneck.key
              return (
                <tr key={s.key} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <div className={`flex items-center gap-1.5 font-medium ${LANE_COLOR[s.lane]}`}>
                      <Server className="h-3 w-3 opacity-60" />
                      {s.label}
                      {isBottleneck && (
                        <span className="chip text-rose-300 border-rose-500/30 bg-rose-500/10 !px-1.5 !py-0.5">
                          bottleneck
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{s.note}</div>
                  </td>
                  <td className="px-3 py-2 text-right stat-value text-slate-300">{fmtMs(s.perPacketMs)}</td>
                  <td className="px-3 py-2 text-right stat-value text-slate-300">{fmtMs(s.perNodeMs)}</td>
                  <td className="px-3 py-2 text-right stat-value font-semibold text-slate-900">
                    {s.serial ? fmtMs(s.aggregateMs) : <span className="text-slate-500">parallel</span>}
                  </td>
                  <td className="px-3 py-2">
                    {s.serial ? (
                      <div className="h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-base-700">
                        <div
                          className={`h-full rounded-full ${isBottleneck ? 'bg-rose-400' : 'bg-brand-500'}`}
                          style={{ width: `${(s.aggregateMs / maxAgg) * 100}%` }}
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">not on gateway path</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Every serial resource (RF radio, each UART line, the Pi Python consumer, the BR MCU and the
        4G modem) processes packets <span className="text-slate-400">one at a time</span>, so its
        aggregate = per-node × N. Stages pipeline, so batch throughput is set by the single busiest
        (bottleneck) resource; batch completion adds one end-to-end fill. If the BR receives an
        uplink burst faster than the UART drains it, frames pile up — peak backlog above the BR
        buffer depth means <span className="text-rose-300">dropped responses</span>.
      </p>
    </Card>
  )
}
