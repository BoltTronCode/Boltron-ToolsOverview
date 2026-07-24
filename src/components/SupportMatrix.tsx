/**
 * "Which use-cases have an issue?" matrix — evaluates every DLMS profile at the
 * chosen target fleet size and classifies it ok / warn / fail, showing the
 * binding constraint, worst-case association gap and supported node count.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { CheckCircle2, AlertTriangle, XCircle, ClipboardCheck } from 'lucide-react'
import type { ProfileSupport, SupportStatus } from '../lib/types'
import { fmtMs, fmtNum } from '../lib/format'
import { Card, SectionTitle } from './ui'

const META: Record<SupportStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ok: {
    label: 'Supported',
    cls: 'text-teal-600 border-teal-200 bg-teal-50',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  warn: {
    label: 'Marginal',
    cls: 'text-amber-600 border-amber-200 bg-amber-50',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  fail: {
    label: 'At risk',
    cls: 'text-rose-600 border-rose-200 bg-rose-50',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

export function SupportMatrix({
  rows,
  targetNodes,
  assocTimeoutMs,
  useCaseLabel,
  parallel,
}: {
  rows: ProfileSupport[]
  targetNodes: number
  assocTimeoutMs: number
  useCaseLabel: string
  parallel: boolean
}) {
  const okCount = rows.filter((r) => r.status === 'ok').length
  const warnCount = rows.filter((r) => r.status === 'warn').length
  const failCount = rows.filter((r) => r.status === 'fail').length

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<ClipboardCheck className="h-4 w-4" />}
        title={`IS15959 usecase feasibility @ ${fmtNum(targetNodes)} nodes / gateway`}
        right={
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="chip text-teal-600 border-teal-200 bg-teal-50">{okCount} ok</span>
            {warnCount > 0 && (
              <span className="chip text-amber-600 border-amber-200 bg-amber-50">
                {warnCount} marginal
              </span>
            )}
            {failCount > 0 && (
              <span className="chip text-rose-600 border-rose-200 bg-rose-50">{failCount} at risk</span>
            )}
          </div>
        }
      />

      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span className="font-medium text-slate-900">Traffic mode:</span> {useCaseLabel}
      </div>

      <div className="grid gap-3 2xl:grid-cols-2">
        {rows.map((r) => {
          const m = META[r.status]
          const gapOver = parallel && r.gapAtTargetMs > assocTimeoutMs
          const utilOver = r.utilAtTargetPct > 100
          return (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.label}</div>
                  <div className="text-xs text-slate-500">{r.category}</div>
                </div>
                <span className={`chip ${m.cls}`}>
                  {m.icon}
                  {m.label}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="Req / Resp" value={`${r.reqBytesTotal}/${r.respBytesTotal} B`} />
                <Metric label="Heaviest step" value={fmtMs(r.maxStepChannelMs)} />
                <Metric label="Max nodes" value={fmtNum(r.nSupported)} accent="text-brand-600" />
                <Metric
                  label={parallel ? 'Assoc gap @ N' : 'Assoc gap @ N'}
                  value={parallel ? fmtMs(r.gapAtTargetMs) : 'spread'}
                  accent={gapOver ? 'text-rose-600' : 'text-slate-900'}
                />
                <Metric
                  label="RF util @ N"
                  value={`${r.utilAtTargetPct.toFixed(0)}%`}
                  accent={utilOver ? 'text-rose-600' : 'text-slate-900'}
                />
                <Metric label="Limited by" value={r.bottleneck} />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {parallel
          ? `Parallel poll model: all meters advance step-by-step over the shared BR radio. “Assoc gap @ N” is the worst-case time one meter waits while the radio serves the other ${fmtNum(
              targetNodes - 1,
            )} meters at the heaviest step, including the all-node response-randomisation spread. If it exceeds ${fmtMs(assocTimeoutMs)}, the meter may drop the association.`
          : 'Push / spread-load model: traffic is distributed across the interval, so association timeout is not used as a fleet-wide limiter in this view.'}
      </p>
    </Card>
  )
}

function Metric({
  label,
  value,
  accent = 'text-slate-900',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="label">{label}</div>
      <div className={`stat-value mt-1 text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  )
}
