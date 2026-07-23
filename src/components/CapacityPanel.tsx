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
import type { CapacityResult } from '../lib/types'
import { fmtNum, fmtMs } from '../lib/format'
import { Card, SectionTitle } from './ui'

const AXIS = { fontSize: 11, fill: '#94a3b8' }
const TOOLTIP_STYLE = {
  background: '#0f1729',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize: 12,
}

export function CapacityPanel({ cap }: { cap: CapacityResult }) {
  const resources = [
    { name: 'WiSUN RF', nodes: cap.maxNodesRf, perNodeMs: cap.perNodeRfMs },
    { name: 'BR UART', nodes: cap.maxNodesUart, perNodeMs: cap.perNodeUartMs },
    { name: '4G/MQTT', nodes: cap.maxNodesCellular, perNodeMs: cap.perNodeCellularMs },
    { name: 'GW CPU', nodes: cap.maxNodesGw, perNodeMs: cap.perNodeGwMs },
  ].map((r) => ({ ...r, capped: Math.min(r.nodes, cap.maxNodes * 6) }))

  // Utilisation curve up to ~1.6x the binding limit.
  const upper = Math.max(10, Math.ceil(cap.maxNodes * 1.6))
  const steps = 40
  const curve = Array.from({ length: steps + 1 }, (_, i) => {
    const nodes = Math.round((upper / steps) * i)
    return { nodes, util: cap.channelUtilPercentAt(nodes) }
  })

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="card-pad">
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Max nodes per shared resource" />
        <div className="h-[210px]">
          <ResponsiveContainer>
            <BarChart data={resources} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(v: number, _n, p) => [
                  `${fmtNum(v)} nodes · ${fmtMs((p.payload as { perNodeMs: number }).perNodeMs)}/node`,
                  'Capacity',
                ]}
              />
              <Bar dataKey="capped" radius={[6, 6, 0, 0]}>
                {resources.map((r) => (
                  <Cell
                    key={r.name}
                    fill={r.nodes === cap.maxNodes ? '#fb7185' : '#1f78ff'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-300">
          <TriangleAlert className="h-3.5 w-3.5" />
          Binding constraint: <span className="font-semibold">{cap.bottleneck}</span>
        </p>
      </Card>

      <Card className="card-pad">
        <SectionTitle
          icon={<Users className="h-4 w-4" />}
          title="RF channel utilisation vs fleet size"
        />
        <div className="h-[210px]">
          <ResponsiveContainer>
            <AreaChart data={curve} margin={{ top: 6, right: 10, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f78ff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#1f78ff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="nodes"
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                label={{ value: 'nodes', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 'dataMax']}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Channel util']}
                labelFormatter={(l) => `${l} nodes`}
              />
              <ReferenceLine y={100} stroke="#fb7185" strokeDasharray="4 4" />
              <ReferenceLine
                x={cap.maxNodes}
                stroke="#2dd4bf"
                strokeDasharray="4 4"
                label={{ value: `${fmtNum(cap.maxNodes)}`, fill: '#2dd4bf', fontSize: 10, position: 'top' }}
              />
              <Area type="monotone" dataKey="util" stroke="#489dff" strokeWidth={2} fill="url(#utilFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Red = 100% saturation · Teal = supported fleet size at the configured cycle.
        </p>
      </Card>
    </div>
  )
}
