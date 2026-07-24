/**
 * RF deployment scenarios for capacity modelling.
 *
 * The percentages describe how the fleet is split by air-hop depth:
 *   1st number = 1 hop, 2nd number = 2 hops, 3rd number = 3 hops, ...
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron telesystems private limited
 */
import type { TopologyScenario } from '../lib/types'

const H1 = '1 hop'
const H2 = '2 hops'
const H3 = '3 hops'
const H4 = '4 hops'
const H5 = '5 hops'
const H6 = '6 hops'
const H7 = '7 hops'

export const TOPOLOGY_SCENARIOS: TopologyScenario[] = [
  {
    id: 'in-room-100',
    label: 'In Room · 100',
    description: 'All meters are connected directly to the Border Router. 100% of the fleet is 1 hop.',
    buckets: [{ airHops: 1, percent: 100, label: H1 }],
  },
  {
    id: 'outside-best-70-30',
    label: 'Outside best case · 70/30',
    description: '70% of meters are 1 hop and 30% are 2 hops.',
    buckets: [
      { airHops: 1, percent: 70, label: H1 },
      { airHops: 2, percent: 30, label: H2 },
    ],
  },
  {
    id: 'rf-50-20-20-10',
    label: '50/20/20/10',
    description: '50% at 1 hop, 20% at 2 hops, 20% at 3 hops, and 10% at 4 hops.',
    buckets: [
      { airHops: 1, percent: 50, label: H1 },
      { airHops: 2, percent: 20, label: H2 },
      { airHops: 3, percent: 20, label: H3 },
      { airHops: 4, percent: 10, label: H4 },
    ],
  },
  {
    id: 'rf-40-20-20-10-10',
    label: '40/20/20/10/10',
    description: '40% at 1 hop, 20% at 2 hops, 20% at 3 hops, 10% at 4 hops, and 10% at 5 hops.',
    buckets: [
      { airHops: 1, percent: 40, label: H1 },
      { airHops: 2, percent: 20, label: H2 },
      { airHops: 3, percent: 20, label: H3 },
      { airHops: 4, percent: 10, label: H4 },
      { airHops: 5, percent: 10, label: H5 },
    ],
  },
  {
    id: 'rf-30-15-15-10-10-10-10',
    label: '30/15/15/10/10/10/10',
    description: '30% at 1 hop, 15% at 2 hops, 15% at 3 hops, and 10% each at 4, 5, 6, and 7 hops.',
    buckets: [
      { airHops: 1, percent: 30, label: H1 },
      { airHops: 2, percent: 15, label: H2 },
      { airHops: 3, percent: 15, label: H3 },
      { airHops: 4, percent: 10, label: H4 },
      { airHops: 5, percent: 10, label: H5 },
      { airHops: 6, percent: 10, label: H6 },
      { airHops: 7, percent: 10, label: H7 },
    ],
  },
]

export const DEFAULT_TOPOLOGY_ID = 'rf-40-20-20-10-10'
