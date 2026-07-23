/**
 * Left-hand control panel: scenario selectors + every editable parameter.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { useState } from 'react'
import {
  RadioTower,
  Cable,
  Cpu,
  Signal,
  Gauge,
  ChevronDown,
  RotateCcw,
  Wifi,
  FileStack,
  Repeat,
  ShieldCheck,
  Users,
  Zap,
  Split,
  Router,
  Timer,
} from 'lucide-react'
import clsx from 'clsx'
import { PARAM_GROUPS, type ParamField } from '../config/paramSchema'
import type { NetworkParams, PhyProfile, UseCase } from '../lib/types'
import { PHY_PROFILES } from '../config/phyProfiles'
import { USE_CASES } from '../config/useCases'
import { DLMS_PROFILES } from '../config/dlmsProfiles'
import { Card } from './ui'

const ICONS: Record<string, typeof RadioTower> = {
  RadioTower,
  Cable,
  Cpu,
  Signal,
  Gauge,
  ShieldCheck,
  Split,
  Router,
  Timer,
}

interface Props {
  phyId: string
  dlmsId: string
  useCaseId: string
  net: NetworkParams
  targetNodes: number
  onPhy: (id: string) => void
  onDlms: (id: string) => void
  onUseCase: (id: string) => void
  onNet: (patch: Partial<NetworkParams>) => void
  onTargetNodes: (n: number) => void
  onIdealRf: () => void
  onReset: () => void
}

function Selector<T extends { id: string }>({
  label,
  icon,
  items,
  value,
  render,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  items: T[]
  value: string
  render: (item: T) => string
  onChange: (id: string) => void
}) {
  return (
    <div>
      <div className="label mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="relative">
        <select
          className="input appearance-none pr-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {items.map((it) => (
            <option key={it.id} value={it.id} className="bg-base-850">
              {render(it)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

function ParamControl({
  field,
  value,
  onChange,
}: {
  field: ParamField
  value: number | boolean
  onChange: (v: number | boolean) => void
}) {
  if (field.kind === 'toggle') {
    const on = Boolean(value)
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-slate-300">{field.label}</span>
        <button
          type="button"
          onClick={() => onChange(!on)}
          className={clsx(
            'relative h-6 w-11 rounded-full transition',
            on ? 'bg-brand-500' : 'bg-base-700',
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
              on ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </div>
    )
  }

  if (field.kind === 'select') {
    return (
      <label className="block py-1">
        <span className="mb-1 block text-xs text-slate-400">{field.label}</span>
        <select
          className="input"
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-base-850">
              {o.label}
              {field.unit ? ` ${field.unit}` : ''}
            </option>
          ))}
        </select>
      </label>
    )
  }

  const num = Number(value)
  const display =
    field.step && field.step < 1 ? num.toFixed(2) : num.toString()

  if (field.kind === 'slider') {
    return (
      <div className="py-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">{field.label}</span>
          <span className="stat-value text-xs font-semibold text-brand-300">
            {display}
            {field.unit ? ` ${field.unit}` : ''}
          </span>
        </div>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {field.hint && <p className="mt-1 text-[10px] leading-tight text-slate-500">{field.hint}</p>}
      </div>
    )
  }

  return (
    <label className="block py-1">
      <span className="mb-1 block text-xs text-slate-400">
        {field.label}
        {field.unit ? ` (${field.unit})` : ''}
      </span>
      <input
        type="number"
        className="input"
        min={field.min}
        max={field.max}
        step={field.step}
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {field.hint && <p className="mt-1 text-[10px] leading-tight text-slate-500">{field.hint}</p>}
    </label>
  )
}

function CollapsibleGroup({
  icon,
  title,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span className="text-brand-400">{icon}</span>
          {title}
        </span>
        <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-white/5 px-4 py-3">{children}</div>}
    </Card>
  )
}

export function ControlPanel({
  phyId,
  dlmsId,
  useCaseId,
  net,
  targetNodes,
  onPhy,
  onDlms,
  onUseCase,
  onNet,
  onTargetNodes,
  onIdealRf,
  onReset,
}: Props) {
  return (
    <div className="space-y-3">
      <Card className="card-pad space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Scenario</h2>
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        <Selector<PhyProfile>
          label="WiSUN PHY mode"
          icon={<Wifi className="h-3.5 w-3.5" />}
          items={PHY_PROFILES}
          value={phyId}
          render={(p) => p.label}
          onChange={onPhy}
        />
        <Selector
          label="DLMS profile / workload"
          icon={<FileStack className="h-3.5 w-3.5" />}
          items={DLMS_PROFILES}
          value={dlmsId}
          render={(p) => `${p.label} · ${p.category}`}
          onChange={onDlms}
        />
        <Selector<UseCase>
          label="Deployment use-case"
          icon={<Repeat className="h-3.5 w-3.5" />}
          items={USE_CASES}
          value={useCaseId}
          render={(u) => u.label}
          onChange={onUseCase}
        />

        <div>
          <div className="label mb-1.5 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Target fleet size (per BR)
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={500}
              step={1}
              value={targetNodes}
              onChange={(e) => onTargetNodes(Number(e.target.value))}
            />
            <input
              type="number"
              min={1}
              max={5000}
              value={targetNodes}
              onChange={(e) => onTargetNodes(Math.max(1, Number(e.target.value)))}
              className="input w-20 !py-1.5 text-center"
            />
          </div>
        </div>

        <button className="btn-primary w-full !py-2 text-xs" onClick={onIdealRf}>
          <Zap className="h-3.5 w-3.5" /> Ideal RF · 1:100 star (PER 0, 1 hop)
        </button>
      </Card>

      {PARAM_GROUPS.map((group, i) => {
        const Icon = ICONS[group.icon] ?? Gauge
        return (
          <CollapsibleGroup
            key={group.id}
            icon={<Icon className="h-4 w-4" />}
            title={group.title}
            defaultOpen={i === 0}
          >
            <div className="space-y-1">
              {group.fields.map((f) => (
                <ParamControl
                  key={f.key}
                  field={f}
                  value={net[f.key] as number | boolean}
                  onChange={(v) => onNet({ [f.key]: v } as Partial<NetworkParams>)}
                />
              ))}
            </div>
          </CollapsibleGroup>
        )
      })}
    </div>
  )
}
