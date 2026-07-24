/**
 * Universe-level end-to-end data-flow block diagram.
 *
 * Renders the full round-trip path (HES ⇄ NMS ⇄ 4G/EC200U ⇄ Pi ⇄ QoS2 ⇄ UART ⇄
 * BR ⇄ RF ⇄ Meter) as a U-shaped visual: downlink stages flow down the left
 * column, the meter sits at the bottom centre, and uplink stages flow up the
 * right column.  Every block shows its modelled timing, the exact formula that
 * produces it, the parameter values that feed that formula, and a sub-component
 * breakdown — so every number is fully auditable down to the micro level.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { useState } from 'react'
import {
  Server,
  Cloud,
  Cpu,
  ShieldCheck,
  Cable,
  Router,
  RadioTower,
  Gauge,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Network,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import type { FlowBlockDetail, FlowDetail } from '../lib/types'
import { fmtMs } from '../lib/format'
import { Card, SectionTitle } from './ui'

/* ── Icon + colour mapping per stage key ──────────────────────────────── */

const BLOCK_STYLE: Record<
  string,
  { icon: typeof Server; color: string; ring: string; bg: string }
> = {
  'hes-nms-down': { icon: Server, color: 'text-slate-300', ring: 'border-slate-500/30', bg: 'bg-slate-500/5' },
  'cell-down': { icon: Cloud, color: 'text-brand-300', ring: 'border-brand-500/30', bg: 'bg-brand-500/5' },
  'gw-down': { icon: Cpu, color: 'text-violet-300', ring: 'border-violet-500/30', bg: 'bg-violet-500/5' },
  'qos2-down': { icon: ShieldCheck, color: 'text-amber-300', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'uart-down': { icon: Cable, color: 'text-amber-300', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'rn-down': { icon: Router, color: 'text-cyan-300', ring: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  'rf-down': { icon: RadioTower, color: 'text-cyan-300', ring: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  meter: { icon: Gauge, color: 'text-teal-300', ring: 'border-teal-500/30', bg: 'bg-teal-500/5' },
  'resp-delay': { icon: Zap, color: 'text-amber-300', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'rf-up': { icon: RadioTower, color: 'text-cyan-300', ring: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  'rn-up': { icon: Router, color: 'text-cyan-300', ring: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  reassembly: { icon: Network, color: 'text-cyan-300', ring: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  'qos2-up': { icon: ShieldCheck, color: 'text-amber-300', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'uart-up': { icon: Cable, color: 'text-amber-300', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  'gw-up': { icon: Cpu, color: 'text-violet-300', ring: 'border-violet-500/30', bg: 'bg-violet-500/5' },
  'cell-up': { icon: Cloud, color: 'text-brand-300', ring: 'border-brand-500/30', bg: 'bg-brand-500/5' },
  'nms-hes-up': { icon: Server, color: 'text-slate-300', ring: 'border-slate-500/30', bg: 'bg-slate-500/5' },
}

const GROUP_LABEL: Record<string, string> = {
  downlink: 'DOWNLINK (Request: HES → Meter)',
  meter: 'METER',
  uplink: 'UPLINK (Response: Meter → HES)',
}

/* ── Single block card ────────────────────────────────────────────────── */

function FlowBlock({ block, index }: { block: FlowBlockDetail; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const style = BLOCK_STYLE[block.key] ?? BLOCK_STYLE['meter']
  const Icon = style.icon
  const hasSub = block.subBreakdown.length > 0

  return (
    <div
      className={clsx(
        'rounded-xl border p-3 transition-all',
        style.ring,
        style.bg,
        expanded ? 'shadow-glow' : 'hover:border-slate-300',
      )}
    >
      {/* Header row: icon + label + timing */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm', style.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-600">#{String(index + 1).padStart(2, '0')}</span>
              <span className="truncate text-xs font-semibold text-slate-800">{block.label}</span>
            </div>
            <span className="text-[10px] text-slate-500">{block.pctOfTotal.toFixed(1)}% of RTT</span>
          </div>
        </div>
        <div className="text-right">
          <div className={clsx('stat-value text-sm font-bold', style.color)}>{fmtMs(block.ms)}</div>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5">
        <code className="block break-all text-[10px] leading-relaxed text-slate-400">{block.formula}</code>
      </div>

      {/* Parameter chips */}
      <div className="mt-2 flex flex-wrap gap-1">
        {block.params.map((param) => (
          <span
            key={param.label}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px]"
          >
            <span className="text-slate-500">{param.label}</span>
            <span className="font-medium text-slate-700">{param.value}</span>
          </span>
        ))}
      </div>

      {/* Expandable sub-breakdown */}
      {hasSub && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex w-full items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500 transition-colors hover:text-slate-700"
        >
          <span>Sub-component breakdown ({block.subBreakdown.length})</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
      {expanded && hasSub && (
        <div className="mt-1.5 space-y-1">
          {block.subBreakdown.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">{s.label}</span>
              <span className="font-mono text-slate-400">{fmtMs(s.ms)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1 text-[10px]">
            <span className="font-medium text-slate-400">Stage total</span>
            <span className={clsx('font-mono font-semibold', style.color)}>{fmtMs(block.ms)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Arrow connector ──────────────────────────────────────────────────── */

function Arrow({ direction }: { direction: 'down' | 'up' | 'right' }) {
  const Icon = direction === 'down' ? ArrowDown : direction === 'up' ? ArrowUp : ArrowRight
  return (
    <div className="flex items-center justify-center py-0.5">
      <Icon className="h-4 w-4 text-slate-600" />
    </div>
  )
}

/* ── Summary header ───────────────────────────────────────────────────── */

function SummaryPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={clsx('stat-value text-sm font-bold', color)}>{value}</span>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────────── */

export function DataFlowDiagram({ detail }: { detail: FlowDetail }) {
  const downlink = detail.blocks.filter((b) => b.group === 'downlink')
  const meter = detail.blocks.filter((b) => b.group === 'meter')
  const uplink = detail.blocks.filter((b) => b.group === 'uplink')
  const uplinkReversed = [...uplink].reverse() // visual: flows upward

  let downIdx = 0
  let upIdx = 0

  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<Network className="h-4 w-4" />}
        title="End-to-end data-flow block diagram"
        right={
          <div className="flex flex-wrap gap-1.5">
            <SummaryPill label="Downlink" value={fmtMs(detail.downlinkMs)} color="text-brand-300" />
            <SummaryPill label="Meter" value={fmtMs(detail.meterMs)} color="text-teal-300" />
            <SummaryPill label="Uplink" value={fmtMs(detail.uplinkMs)} color="text-cyan-300" />
            <SummaryPill label="Total RTT" value={fmtMs(detail.totalMs)} color="text-slate-900" />
          </div>
        }
      />

      <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
        Full round-trip path from HES to meter and back. Every block shows the modelled timing, the exact formula,
        and the parameter values that produce it. Click a block to expand its sub-component breakdown.{' '}
        {detail.isPush && '(Push transaction — downlink request path skipped.)'}
      </p>

      <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
        <div className="flex min-w-max items-center gap-1.5 text-[10px]">
          {detail.blocks.map((block, i) => (
            <div key={block.key} className="flex items-center gap-1.5">
              <span className="rounded-full border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700">
                {block.label}
              </span>
              {i < detail.blocks.length - 1 && <ArrowRight className="h-3 w-3 text-slate-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* U-shaped layout: downlink left column ↓, meter centre, uplink right column ↑ */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* Downlink column (top → bottom) */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-brand-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
              {GROUP_LABEL.downlink}
            </span>
          </div>
          {downlink.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-[11px] text-slate-600">
              Skipped (push transaction)
            </div>
          ) : (
            <div className="space-y-0.5">
              {downlink.map((block) => (
                <div key={block.key}>
                  <FlowBlock block={block} index={downIdx++} />
                  <Arrow direction="down" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meter (centre, bottom-aligned) */}
        <div className="flex flex-col justify-end lg:w-[200px]">
          <div className="lg:mt-auto">
            <div className="mb-2 flex items-center gap-2 lg:justify-center">
              <Gauge className="h-3 w-3 text-teal-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                {GROUP_LABEL.meter}
              </span>
            </div>
            <div className="space-y-0.5">
              {meter.map((block) => (
                <FlowBlock key={block.key} block={block} index={downlink.length} />
              ))}
            </div>
          </div>
        </div>

        {/* Uplink column (bottom → top, visually reversed) */}
        <div>
          <div className="mb-2 flex items-center gap-2 lg:justify-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              {GROUP_LABEL.uplink}
            </span>
            <ArrowUp className="h-3 w-3 text-cyan-400" />
          </div>
          <div className="space-y-0.5">
            {uplinkReversed.map((block) => (
              <div key={block.key}>
                <FlowBlock
                  block={block}
                  index={downlink.length + meter.length + (uplink.length - 1 - upIdx++)}
                />
                <Arrow direction="up" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
        <LegendItem color="bg-brand-500" label="4G / MQTT backhaul" />
        <LegendItem color="bg-violet-500" label="Pi CPU (Python)" />
        <LegendItem color="bg-amber-500" label="QoS2 / UART" />
        <LegendItem color="bg-cyan-500" label="BR / RF" />
        <LegendItem color="bg-teal-500" label="Meter" />
        <span className="ml-auto text-slate-600">
          req {detail.reqBytes} B · resp {detail.respBytes} B
        </span>
      </div>
    </Card>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={clsx('h-2 w-2 rounded-full', color)} />
      <span>{label}</span>
    </div>
  )
}
