/**
 * Small formatting helpers.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */

export function fmtMs(ms: number): string {
  if (!isFinite(ms)) return '—'
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 2 : 1)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

export function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function fmtRate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbps`
  return `${kbps.toFixed(kbps < 10 ? 1 : 0)} kbps`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
