/**
 * End-to-end latency breakdown: per-stage bars + downlink/meter/uplink split
 * + modelled-vs-measured calibration.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, Cpu, Timer } from 'lucide-react'
import type { LatencyBudget } from '../lib/types'
import { fmtMs } from '../lib/format'
import { Card, SectionTitle } from './ui'

const GROUP_COLOR: Record<string, string> = {
  downlink: '#1f78ff',
  meter: '#f59e0b',
  uplink: '#2dd4bf',
}

export function LatencyPanel({
  budget,
  title,
  subtitle,
}: {
  budget: LatencyBudget
  title: string
  subtitle?: string
}) {
  const maxStage = Math.max(...budget.stages.map((s) => s.ms), 0.0001)
  const pieData = [
    { name: 'Downlink', value: budget.downlinkMs, key: 'downlink' },
    { name: 'Meter', value: budget.meterMs, key: 'meter' },
    { name: 'Uplink', value: budget.uplinkMs, key: 'uplink' },
  ].filter((d) => d.value > 0)

  const measured = budget.measuredRttMs
  const modelledCore = budget.totalMs // includes HES legs where present
  const delta = measured != null ? ((budget.totalMs - measured) / measured) * 100 : null

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<Timer className="h-4 w-4" />}
        title={title}
        right={
          <span className="stat-value text-lg font-bold text-slate-900">{fmtMs(budget.totalMs)}</span>
        }
      />
      {subtitle && <p className="-mt-2 mb-3 text-xs text-slate-400">{subtitle}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        {/* Stage bars */}
        <div className="space-y-1.5">
          {budget.stages.map((s) => (
            <div key={s.key} className="group flex items-center gap-2">
              <div className="w-40 shrink-0 truncate text-right text-xs text-slate-400" title={s.detail}>
                {s.label}
              </div>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-base-800">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(s.ms / maxStage) * 100}%`,
                    backgroundColor: GROUP_COLOR[s.group],
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className="w-16 shrink-0 stat-value text-right text-xs font-semibold text-slate-800">
                {fmtMs(s.ms)}
              </div>
            </div>
          ))}
        </div>

        {/* Split donut */}
        <div className="flex flex-col items-center justify-center">
          <div className="h-[150px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={GROUP_COLOR[d.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0f1729',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtMs(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 text-brand-300">
              <ArrowDownToLine className="h-3 w-3" /> {fmtMs(budget.downlinkMs)}
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <Cpu className="h-3 w-3" /> {fmtMs(budget.meterMs)}
            </span>
            <span className="flex items-center gap-1 text-teal-300">
              <ArrowUpFromLine className="h-3 w-3" /> {fmtMs(budget.uplinkMs)}
            </span>
          </div>
        </div>
      </div>

      {measured != null && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-white/5 bg-base-850/60 px-3 py-2 text-xs">
          <span className="text-slate-400">
            Modelled:{' '}
            <span className="stat-value font-semibold text-slate-900">{fmtMs(modelledCore)}</span>
          </span>
          <span className="text-slate-400">
            Measured (NMS log):{' '}
            <span className="stat-value font-semibold text-cyan-300">{fmtMs(measured)}</span>
          </span>
          {delta != null && (
            <span className="text-slate-400">
              Δ{' '}
              <span
                className={`stat-value font-semibold ${
                  Math.abs(delta) < 25 ? 'text-teal-300' : 'text-amber-300'
                }`}
              >
                {delta > 0 ? '+' : ''}
                {delta.toFixed(0)}%
              </span>
            </span>
          )}
          <span className="text-slate-500">
            (measured excludes HES↔NMS legs; used for calibration)
          </span>
        </div>
      )}
    </Card>
  )
}
