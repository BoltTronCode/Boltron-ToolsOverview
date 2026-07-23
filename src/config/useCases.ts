/**
 * Deployment scenarios that drive the capacity ("how many nodes") calculation.
 *
 * - poll : HES issues REQT and waits for RESP. Worst case = every meter polled
 *          within one cycle (parallel requests queue at the single BR radio).
 * - push : meters autonomously publish (PUSH) at a defined interval.
 *
 * Add entries to model more scenarios (e.g. on-demand, event storms).
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { UseCase } from '../lib/types'

export const USE_CASES: UseCase[] = [
  {
    id: 'poll-15m',
    label: 'HES Poll · 15 min cycle',
    kind: 'poll',
    description:
      'HES polls the selected profile for every meter once per 15 minutes. All REQT can arrive in parallel; the shared BR radio serialises them.',
    cycleSeconds: 15 * 60,
    parallel: true,
  },
  {
    id: 'poll-30m',
    label: 'HES Poll · 30 min cycle',
    kind: 'poll',
    description: 'Relaxed polling: whole fleet read once every 30 minutes.',
    cycleSeconds: 30 * 60,
    parallel: true,
  },
  {
    id: 'poll-60m',
    label: 'HES Poll · 60 min cycle',
    kind: 'poll',
    description: 'Hourly polling of the selected profile for the whole fleet.',
    cycleSeconds: 60 * 60,
    parallel: true,
  },
  {
    id: 'push-15m',
    label: 'Meter Push · 15 min interval',
    kind: 'push',
    description:
      'Every meter pushes the selected profile every 15 minutes (uplink only, no HES request). Load spreads across the interval.',
    cycleSeconds: 15 * 60,
    parallel: false,
  },
  {
    id: 'push-30m',
    label: 'Meter Push · 30 min interval',
    kind: 'push',
    description: 'Every meter pushes the selected profile every 30 minutes.',
    cycleSeconds: 30 * 60,
    parallel: false,
  },
]

export const DEFAULT_USE_CASE_ID = 'poll-15m'
