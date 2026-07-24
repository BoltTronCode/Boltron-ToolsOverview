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
    id: 'poll',
    label: 'Poll (REQT + RESP)',
    kind: 'poll',
    description:
      '1PH meter polling mode. HES sends a request (REQT) and the meter returns a response (RESP). Instant, block load, daily, billing, and FOTA all belong to this mode; only the selected raw payload size changes. 3PH raw sizes will be different.',
    cycleSeconds: 15 * 60,
    parallel: true,
  },
  {
    id: 'push-last-gasp',
    label: 'PUSH / Last Gasp storm',
    kind: 'push',
    description:
      'All meters send a PUSH uplink at the same time during an outage event. This model uses a fixed 115-byte 1PH DLMS PUSH payload and no HES downlink request.',
    cycleSeconds: 15 * 60,
    parallel: true,
  },
]

export const DEFAULT_USE_CASE_ID = 'poll'
