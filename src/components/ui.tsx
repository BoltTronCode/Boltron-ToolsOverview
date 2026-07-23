/**
 * Reusable presentational primitives.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { type ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>
}

export function SectionTitle({
  icon,
  title,
  right,
}: {
  icon?: ReactNode
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-brand-400">{icon}</span>}
        <h3 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h3>
      </div>
      {right}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
  icon?: ReactNode
}) {
  return (
    <Card className="card-pad">
      <div className="flex items-start justify-between">
        <div className="label">{label}</div>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div
        className={clsx('mt-1.5 stat-value text-2xl font-bold', accent ?? 'text-slate-50')}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </Card>
  )
}

export function Chip({
  children,
  color = 'slate',
}: {
  children: ReactNode
  color?: 'slate' | 'brand' | 'cyan' | 'amber' | 'rose' | 'teal' | 'violet'
}) {
  const map: Record<string, string> = {
    slate: 'text-slate-300',
    brand: 'text-brand-300 border-brand-500/30 bg-brand-500/10',
    cyan: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
    amber: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    rose: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    teal: 'text-teal-300 border-teal-500/30 bg-teal-500/10',
    violet: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
  }
  return <span className={clsx('chip', map[color])}>{children}</span>
}

export function Bar({
  value,
  max,
  color = 'bg-brand-500',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-base-700">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}
