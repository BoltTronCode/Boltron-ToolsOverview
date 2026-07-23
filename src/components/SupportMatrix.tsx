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
    cls: 'text-teal-300 border-teal-500/30 bg-teal-500/10',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  warn: {
    label: 'Marginal',
    cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  fail: {
    label: 'At risk',
    cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

export function SupportMatrix({
  rows,
  targetNodes,
  assocTimeoutMs,
}: {
  rows: ProfileSupport[]
  targetNodes: number
  assocTimeoutMs: number
}) {
  const okCount = rows.filter((r) => r.status === 'ok').length
  const warnCount = rows.filter((r) => r.status === 'warn').length
  const failCount = rows.filter((r) => r.status === 'fail').length

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<ClipboardCheck className="h-4 w-4" />}
        title={`Use-case feasibility @ ${fmtNum(targetNodes)} nodes / gateway`}
        right={
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="chip text-teal-300 border-teal-500/30 bg-teal-500/10">{okCount} ok</span>
            {warnCount > 0 && (
              <span className="chip text-amber-300 border-amber-500/30 bg-amber-500/10">
                {warnCount} marginal
              </span>
            )}
            {failCount > 0 && (
              <span className="chip text-rose-300 border-rose-500/30 bg-rose-500/10">
                {failCount} at risk
              </span>
            )}
          </div>
        }
      />
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-base-850 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Profile</th>
              <th className="px-3 py-2 text-right font-medium">Req/Resp</th>
              <th className="px-3 py-2 text-right font-medium">Heaviest step</th>
              <th className="px-3 py-2 text-right font-medium">Assoc gap @ N</th>
              <th className="px-3 py-2 text-right font-medium">RF util @ N</th>
              <th className="px-3 py-2 text-right font-medium">Max nodes</th>
              <th className="px-3 py-2 font-medium">Limited by</th>
              <th className="px-3 py-2 text-center font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => {
              const m = META[r.status]
              const gapOver = r.gapAtTargetMs > assocTimeoutMs
              const utilOver = r.utilAtTargetPct > 100
              return (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-200">{r.label}</div>
                    <div className="text-[10px] text-slate-500">{r.category}</div>
                  </td>
                  <td className="px-3 py-2 text-right stat-value text-slate-400">
                    {r.reqBytesTotal}/{r.respBytesTotal}B
                  </td>
                  <td className="px-3 py-2 text-right stat-value text-slate-300">
                    {fmtMs(r.maxStepChannelMs)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right stat-value ${gapOver ? 'text-rose-300' : 'text-slate-300'}`}
                  >
                    {fmtMs(r.gapAtTargetMs)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right stat-value ${utilOver ? 'text-rose-300' : 'text-slate-300'}`}
                  >
                    {r.utilAtTargetPct.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-right stat-value font-semibold text-brand-300">
                    {fmtNum(r.nSupported)}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{r.bottleneck}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <span className={`chip ${m.cls}`}>
                        {m.icon}
                        {m.label}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Parallel poll model: all meters advance step-by-step over the shared BR radio. "Assoc gap @
        N" is the worst-case time a meter waits between two messages while the radio serves the other{' '}
        {fmtNum(targetNodes - 1)} meters at the heaviest step — if it exceeds the association timeout
        ({fmtMs(assocTimeoutMs)}) the meter drops its association. Red = over the limit.
      </p>
    </Card>
  )
}
