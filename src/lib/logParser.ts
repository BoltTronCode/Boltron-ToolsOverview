/**
 * NMS MQTT capture parser.
 *
 * Input : CSV lines of the form
 *   "iso","epoch","topic","vendor","phase","dir","meterId","f","f","len","hex"
 * Output: decoded LogRecords, request/response Transactions and ProfileStats.
 *
 * The DLMS "wrapper" (WPDU) header is 8 bytes:
 *   version(2) | source wPort(2) | dest wPort(2) | length(2)
 * The APDU tag is the first byte after the wrapper; we decode a friendly name.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import type { Direction, LogRecord, ProfileStats, Transaction } from './types'

const APDU_NAMES: Record<number, string> = {
  0x60: 'AARQ (assoc-request)',
  0x61: 'AARE (assoc-response)',
  0x62: 'RLRQ (release-request)',
  0x63: 'RLRE (release-response)',
  0xc0: 'GET-Request',
  0xc1: 'SET-Request',
  0xc3: 'ACTION-Request',
  0xc4: 'GET-Response',
  0xc5: 'SET-Response',
  0xc7: 'ACTION-Response',
  0xc8: 'glo-GET-Request',
  0xc9: 'glo-SET-Request',
  0xcb: 'glo-ACTION-Request',
  0xcc: 'glo-GET-Response',
  0xcd: 'glo-SET-Response',
  0xcf: 'glo-ACTION-Response',
  0xdb: 'general-glo-ciphering',
  0xdd: 'general-ded-ciphering',
}

function splitCsv(line: string): string[] {
  // Handles simple double-quoted CSV (no escaped quotes needed for this feed).
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
    } else if (ch === ',' && !inQ) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function decodeApdu(hex: string): { tag?: number; name?: string } {
  // wrapper = 8 bytes = 16 hex chars; APDU tag is the next byte.
  if (hex.length < 18) return {}
  const tag = parseInt(hex.slice(16, 18), 16)
  if (Number.isNaN(tag)) return {}
  return { tag, name: APDU_NAMES[tag] ?? `APDU 0x${tag.toString(16)}` }
}

export function parseLog(raw: string): LogRecord[] {
  const records: LogRecord[] = []
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (!t || !t.startsWith('"')) continue
    const cols = splitCsv(t)
    if (cols.length < 11) continue
    const direction = cols[5] as Direction
    if (direction !== 'REQT' && direction !== 'RESP' && direction !== 'PUSH') continue
    const hex = cols[10].toLowerCase().replace(/[^0-9a-f]/g, '')
    const frameBytes = parseInt(cols[9], 10)
    const { tag, name } = decodeApdu(hex)
    records.push({
      isoTime: cols[0],
      epoch: parseFloat(cols[1]),
      topic: cols[2],
      vendor: cols[3],
      phase: cols[4],
      direction,
      meterId: cols[6],
      frameBytes: Number.isFinite(frameBytes) ? frameBytes : Math.floor(hex.length / 2),
      hex,
      apduTag: tag,
      apduName: name,
    })
  }
  return records
}

export function buildStats(records: LogRecord[]): ProfileStats {
  const transactions: Transaction[] = []
  let seq = 0
  let pending: LogRecord | null = null

  for (const rec of records) {
    if (rec.direction === 'PUSH') {
      transactions.push({
        seq: seq++,
        reqBytes: 0,
        respBytes: rec.frameBytes,
        reqEpoch: null,
        respEpoch: rec.epoch,
        rttMs: null,
        respApdu: rec.apduName,
        isPush: true,
      })
      continue
    }
    if (rec.direction === 'REQT') {
      // If a request had no response yet, flush it as an unmatched txn.
      if (pending) {
        transactions.push({
          seq: seq++,
          reqBytes: pending.frameBytes,
          respBytes: 0,
          reqEpoch: pending.epoch,
          respEpoch: null,
          rttMs: null,
          reqApdu: pending.apduName,
          isPush: false,
        })
      }
      pending = rec
      continue
    }
    // RESP
    if (pending) {
      transactions.push({
        seq: seq++,
        reqBytes: pending.frameBytes,
        respBytes: rec.frameBytes,
        reqEpoch: pending.epoch,
        respEpoch: rec.epoch,
        rttMs: (rec.epoch - pending.epoch) * 1000,
        reqApdu: pending.apduName,
        respApdu: rec.apduName,
        isPush: false,
      })
      pending = null
    } else {
      // Orphan response
      transactions.push({
        seq: seq++,
        reqBytes: 0,
        respBytes: rec.frameBytes,
        reqEpoch: null,
        respEpoch: rec.epoch,
        rttMs: null,
        respApdu: rec.apduName,
        isPush: false,
      })
    }
  }
  if (pending) {
    transactions.push({
      seq: seq++,
      reqBytes: pending.frameBytes,
      respBytes: 0,
      reqEpoch: pending.epoch,
      respEpoch: null,
      rttMs: null,
      reqApdu: pending.apduName,
      isPush: false,
    })
  }

  const reqBytesTotal = records
    .filter((r) => r.direction === 'REQT')
    .reduce((a, r) => a + r.frameBytes, 0)
  const respBytesTotal = records
    .filter((r) => r.direction === 'RESP' || r.direction === 'PUSH')
    .reduce((a, r) => a + r.frameBytes, 0)
  const pushCount = records.filter((r) => r.direction === 'PUSH').length
  const txnCount = transactions.filter((t) => !t.isPush).length
  const epochs = records.map((r) => r.epoch).filter((e) => Number.isFinite(e))
  const measuredDurationMs =
    epochs.length > 1 ? (Math.max(...epochs) - Math.min(...epochs)) * 1000 : 0
  const measuredRttMsTotal = transactions.reduce((a, t) => a + (t.rttMs ?? 0), 0)

  return {
    transactions,
    txnCount,
    pushCount,
    reqBytesTotal,
    respBytesTotal,
    appBytesTotal: reqBytesTotal + respBytesTotal,
    measuredDurationMs,
    measuredRttMsTotal,
    frames: records.length,
    records,
  }
}

export function parseProfile(raw: string): ProfileStats {
  return buildStats(parseLog(raw))
}
