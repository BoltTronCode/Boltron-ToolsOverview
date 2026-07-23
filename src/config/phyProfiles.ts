/**
 * WiSUN FAN PHY operating modes (Sub-GHz, 2-FSK).
 *
 * These are editable presets. Add a new object to extend the calculator with
 * another PHY mode; the UI picks them up automatically.
 *
 * Preamble/PHY-header byte-equivalents are expressed at the channel rate so the
 * airtime engine can treat them uniformly with the payload.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { PhyProfile } from '../lib/types'

export const PHY_PROFILES: PhyProfile[] = [
  {
    id: 'fsk-50',
    label: '50 kbps · 2-FSK (FAN Mode 1a)',
    modulation: '2-FSK, mod index 1.0',
    dataRateKbps: 50,
    preambleBytes: 8,
    phyHeaderBytes: 2,
    channelSpacingKHz: 100,
    notes: 'Most common WiSUN FAN Sub-GHz mode. Robust, long range. Default for India 865-867 MHz.',
  },
  {
    id: 'fsk-100',
    label: '100 kbps · 2-FSK (FAN Mode 2a)',
    modulation: '2-FSK, mod index 1.0',
    dataRateKbps: 100,
    preambleBytes: 8,
    phyHeaderBytes: 2,
    channelSpacingKHz: 200,
    notes: 'Balanced throughput/range. Wider channel spacing.',
  },
  {
    id: 'fsk-150',
    label: '150 kbps · 2-FSK (FAN Mode 3)',
    modulation: '2-FSK, mod index 0.5',
    dataRateKbps: 150,
    preambleBytes: 8,
    phyHeaderBytes: 2,
    channelSpacingKHz: 200,
    notes: 'Higher throughput, shorter range / higher SNR requirement.',
  },
  {
    id: 'fsk-200',
    label: '200 kbps · 2-FSK (FAN Mode 4a)',
    modulation: '2-FSK, mod index 1.0',
    dataRateKbps: 200,
    preambleBytes: 8,
    phyHeaderBytes: 2,
    channelSpacingKHz: 400,
    notes: 'High throughput mode for dense/short links.',
  },
  {
    id: 'fsk-300',
    label: '300 kbps · 2-FSK (FAN Mode 5)',
    modulation: '2-FSK, mod index 0.5',
    dataRateKbps: 300,
    preambleBytes: 8,
    phyHeaderBytes: 2,
    channelSpacingKHz: 400,
    notes: 'Maximum FSK throughput. Best case airtime, most demanding link budget.',
  },
]

export const DEFAULT_PHY_ID = 'fsk-50'
