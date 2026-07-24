/**
 * Fleet topology scenarios for capacity modelling.
 *
 * In a real deployment not all meters sit at the same depth. These presets model
 * the percentage split across direct links (1 air hop) and relayed paths up to
 * 8 air hops total. Capacity and association-gap calculations use the weighted
 * fleet mix instead of a single fixed hop count for all 100 nodes.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { TopologyScenario } from '../lib/types'

const D = 'Direct'
const R1 = '1 relay'
const R2 = '2 relays'
const R3 = '3 relays'
const R4 = '4 relays'
const R5 = '5 relays'
const R6 = '6 relays'
const R7 = '7 relays'

export const TOPOLOGY_SCENARIOS: TopologyScenario[] = [
  {
    id: 'star-100',
    label: 'Best case · 100% direct',
    description: 'All meters connect directly to the BR (1 air hop). Absolute best-case RF capacity.',
    buckets: [{ airHops: 1, percent: 100, label: D }],
  },
  {
    id: 'light-mesh',
    label: 'Light mesh · mostly direct',
    description: 'Dense deployment with most meters direct and only a small relay tail.',
    buckets: [
      { airHops: 1, percent: 70, label: D },
      { airHops: 2, percent: 20, label: R1 },
      { airHops: 3, percent: 10, label: R2 },
    ],
  },
  {
    id: 'balanced-40-20-20',
    label: 'Balanced mesh · 40/20/20',
    description: 'Representative mixed mesh: 40% direct, 20% one-relay, 20% two-relay, with a realistic long tail.',
    buckets: [
      { airHops: 1, percent: 40, label: D },
      { airHops: 2, percent: 20, label: R1 },
      { airHops: 3, percent: 20, label: R2 },
      { airHops: 4, percent: 10, label: R3 },
      { airHops: 5, percent: 5, label: R4 },
      { airHops: 6, percent: 3, label: R5 },
      { airHops: 7, percent: 1, label: R6 },
      { airHops: 8, percent: 1, label: R7 },
    ],
  },
  {
    id: 'suburban',
    label: 'Suburban mesh',
    description: 'Moderate relay use with a meaningful 3–5 hop tail at the cell edge.',
    buckets: [
      { airHops: 1, percent: 30, label: D },
      { airHops: 2, percent: 25, label: R1 },
      { airHops: 3, percent: 20, label: R2 },
      { airHops: 4, percent: 10, label: R3 },
      { airHops: 5, percent: 7, label: R4 },
      { airHops: 6, percent: 4, label: R5 },
      { airHops: 7, percent: 2, label: R6 },
      { airHops: 8, percent: 2, label: R7 },
    ],
  },
  {
    id: 'rural',
    label: 'Rural mesh · deeper paths',
    description: 'Coverage stretches farther; fewer direct links and more deep relays.',
    buckets: [
      { airHops: 1, percent: 15, label: D },
      { airHops: 2, percent: 20, label: R1 },
      { airHops: 3, percent: 20, label: R2 },
      { airHops: 4, percent: 15, label: R3 },
      { airHops: 5, percent: 10, label: R4 },
      { airHops: 6, percent: 8, label: R5 },
      { airHops: 7, percent: 7, label: R6 },
      { airHops: 8, percent: 5, label: R7 },
    ],
  },
  {
    id: 'edge-heavy',
    label: 'Edge heavy · long-tail congestion',
    description: 'A difficult deployment with many nodes near the coverage edge and substantial relay depth.',
    buckets: [
      { airHops: 1, percent: 10, label: D },
      { airHops: 2, percent: 15, label: R1 },
      { airHops: 3, percent: 20, label: R2 },
      { airHops: 4, percent: 15, label: R3 },
      { airHops: 5, percent: 15, label: R4 },
      { airHops: 6, percent: 10, label: R5 },
      { airHops: 7, percent: 10, label: R6 },
      { airHops: 8, percent: 5, label: R7 },
    ],
  },
  {
    id: 'campus',
    label: 'Campus / apartment block',
    description: 'High density and short range: mostly direct or one-relay paths.',
    buckets: [
      { airHops: 1, percent: 55, label: D },
      { airHops: 2, percent: 30, label: R1 },
      { airHops: 3, percent: 10, label: R2 },
      { airHops: 4, percent: 5, label: R3 },
    ],
  },
  {
    id: 'worst-practical',
    label: 'Worst practical · deep mesh',
    description: 'Stress scenario with a broad deep-mesh population up to 8 air hops.',
    buckets: [
      { airHops: 1, percent: 5, label: D },
      { airHops: 2, percent: 10, label: R1 },
      { airHops: 3, percent: 15, label: R2 },
      { airHops: 4, percent: 20, label: R3 },
      { airHops: 5, percent: 15, label: R4 },
      { airHops: 6, percent: 15, label: R5 },
      { airHops: 7, percent: 10, label: R6 },
      { airHops: 8, percent: 10, label: R7 },
    ],
  },
]

export const DEFAULT_TOPOLOGY_ID = 'balanced-40-20-20'
