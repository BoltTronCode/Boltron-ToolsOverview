/**
 * Fleet-capacity visualisation: binding bottleneck, per-resource node limits,
 * and channel-utilisation vs node-count curve.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts'
import { Users, TriangleAlert } from 'lucide-react'
import type { CapacityResult, TopologyScenario } from '../lib/types'
import { fmtNum, fmtMs } from '../lib/format'
import { Card, SectionTitle } from './ui'

const AXIS = { fontSize: 11, fill: '#94a3b8' }
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(148,163,184,0.35)',
  borderRadius: 10,
  fontSize: 12,
}

export function CapacityPanel({ cap, topology }: { cap: CapacityResult; topology: TopologyScenario }) {
  const resources = [
    { name: 'WiSUN RF', nodes: cap.maxNodesRf, perNodeMs: cap.perNodeRfMs },
    { name: 'Assoc TO', nodes: cap.maxNodesAssoc, perNodeMs: cap.maxStepChannelMs },
    { name: 'BR UART', nodes: cap.maxNodesUart, perNodeMs: cap.perNodeUartMs },
    { name: 'Pi CPU', nodes: cap.maxNodesPi, perNodeMs: cap.perNodePiMs },
    { name: 'BR MCU', nodes: cap.maxNodesBr, perNodeMs: cap.perNodeBrMs },
    { name: '4G/MQTT', nodes: cap.maxNodesCellular, perNodeMs: cap.perNodeCellularMs },
  ].map((r) => ({ ...r, capped: Math.min(r.nodes, Math.max(cap.maxNodes * 6, cap.targetNodes * 2)) }))

  // Utilisation curve up to ~1.6x the binding limit.
  const upper = Math.max(10, Math.ceil(cap.maxNodes * 1.6))
  const steps = 40
  const curve = Array.from({ length: steps + 1 }, (_, i) => {
    const nodes = Math.round((upper / steps) * i)
    return { nodes, util: cap.channelUtilPercentAt(nodes) }
  })

  return (
    <div className="space-y-3">
      <Card className="card-pad">
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Fleet topology scenario" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{topology.label}</span>
          <span className="text-xs text-slate-500">{topology.description}</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex h-5 w-full">
            {topology.buckets.map((b, i) => (
              <div
                key={`${b.label}-${b.airHops}`}
                className={i % 2 === 0 ? 'bg-brand-400/85' : 'bg-cyan-400/85'}
                style={{ width: `${b.percent}%` }}
                title={`${b.label} · ${b.airHops} air hop(s) · ${b.percent}%`}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {topology.buckets.map((b) => (
            <div key={`${b.label}-${b.airHops}-meta`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div className="font-medium text-slate-800">{b.label}</div>
              <div className="text-slate-500">{b.airHops} air hop(s)</div>
              <div className="stat-value mt-0.5 font-semibold text-brand-600">{b.percent}%</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Weighted air hops: <span className="stat-value font-semibold text-slate-700">{cap.topologyWeightedAirHops.toFixed(2)}</span>
          {' '}· Worst bucket: <span className="stat-value font-semibold text-slate-700">{cap.topologyWorstAirHops}</span>
        </p>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="card-pad">
          <SectionTitle icon={<Users className="h-4 w-4" />} title="Max nodes per shared resource" />
          <div className="h-[210px]">
            <ResponsiveContainer>
              <BarChart data={resources} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  formatter={(v: number, _n, p) => [
                    `${fmtNum(v)} nodes · ${fmtMs((p.payload as { perNodeMs: number }).perNodeMs)}/node`,
                    'Capacity',
                  ]}
                />
                <Bar dataKey="capped" radius={[6, 6, 0, 0]}>
                  {resources.map((r) => (
                    <Cell key={r.name} fill={r.nodes === cap.maxNodes ? '#fb7185' : '#1f78ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
            <TriangleAlert className="h-3.5 w-3.5" />
            Binding constraint: <span className="font-semibold">{cap.bottleneck}</span>
          </p>
        </Card>

        <Card className="card-pad">
          <SectionTitle icon={<Users className="h-4 w-4" />} title="RF channel utilisation vs fleet size" />
          <div className="h-[210px]">
            <ResponsiveContainer>
              <AreaChart data={curve} margin={{ top: 6, right: 10, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f78ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1f78ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="nodes"
                  tick={AXIS}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'nodes', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="%" domain={[0, 'dataMax']} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Channel util']}
                  labelFormatter={(l) => `${l} nodes`}
                />
                <ReferenceLine y={100} stroke="#fb7185" strokeDasharray="4 4" />
                <ReferenceLine
                  x={cap.targetNodes}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: `target ${fmtNum(cap.targetNodes)}`, fill: '#ef4444', fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  x={cap.maxNodes}
                  stroke="#2dd4bf"
                  strokeDasharray="4 4"
                  label={{ value: `${fmtNum(cap.maxNodes)}`, fill: '#2dd4bf', fontSize: 10, position: 'insideTopRight' }}
                />
                <Area type="monotone" dataKey="util" stroke="#489dff" strokeWidth={2} fill="url(#utilFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Red vertical line = requested fleet size · Teal line = supported fleet size · Red horizontal line = 100% RF saturation.
          </p>
        </Card>
      </div>
    </div>
  )
}
