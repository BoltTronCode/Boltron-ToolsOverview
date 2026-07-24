/**
 * Transaction-level explorer for the selected DLMS profile: decoded APDU,
 * frame sizes, measured RTT (from the NMS log) and modelled RF airtime.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { ListTree } from 'lucide-react'
import type { NetworkParams, PhyProfile, ProfileStats } from '../lib/types'
import { computeAirtime } from '../lib/engine'
import { fmtBytes, fmtMs } from '../lib/format'
import { Card, SectionTitle, Chip } from './ui'

export function ProfileExplorer({
  stats,
  phy,
  net,
}: {
  stats: ProfileStats
  phy: PhyProfile
  net: NetworkParams
}) {
  return (
    <Card className="card-pad">
      <SectionTitle
        icon={<ListTree className="h-4 w-4" />}
        title="Transaction explorer"
        right={
          <div className="flex flex-wrap gap-1.5">
            <Chip color="brand">{stats.txnCount} txns</Chip>
            {stats.pushCount > 0 && <Chip color="violet">{stats.pushCount} push</Chip>}
            <Chip color="cyan">{fmtBytes(stats.appBytesTotal)} app</Chip>
          </div>
        }
      />

      <div className="max-h-[720px] space-y-2 overflow-auto pr-1">
        {stats.transactions.map((t) => {
          const reqAir = computeAirtime(t.reqBytes, phy, net, false)
          const respAir = computeAirtime(t.respBytes, phy, net, true)
          return (
            <div key={t.seq} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                      TXN {t.seq + 1}
                    </span>
                    {t.isPush && <Chip color="violet">push</Chip>}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Request APDU</div>
                  <div className="mt-1 text-sm text-slate-800">{t.isPush ? '— (PUSH) —' : t.reqApdu ?? '—'}</div>
                  <div className="mt-2 text-xs text-slate-500">Response APDU</div>
                  <div className="mt-1 text-sm text-slate-800">{t.respApdu ?? '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                  <div className="label">Measured RTT</div>
                  <div className="stat-value mt-1 text-sm font-semibold text-cyan-600">
                    {t.rttMs != null ? fmtMs(t.rttMs) : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="Req bytes" value={t.reqBytes ? `${t.reqBytes}` : '—'} accent="text-slate-900" />
                <Metric label="Req WiSUN air" value={t.reqBytes ? fmtMs(reqAir.totalAirtimeMs) : '—'} accent="text-brand-600" />
                <Metric label="Resp bytes" value={t.respBytes ? `${t.respBytes}` : '—'} accent="text-slate-900" />
                <Metric
                  label="Resp UDP packets"
                  value={t.respBytes ? (respAir.oversize ? '⚠ oversize' : `${respAir.fragments}`) : '—'}
                  accent={respAir.oversize ? 'text-rose-600' : 'text-slate-900'}
                />
                <Metric label="Resp WiSUN air" value={t.respBytes ? fmtMs(respAir.totalAirtimeMs) : '—'} accent="text-teal-600" />
                <Metric label="Total app bytes" value={`${t.reqBytes + t.respBytes}`} accent="text-violet-600" />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Each card shows one transaction from the selected profile. WiSUN airtime includes hops,
        retransmissions, MAC ACK, CSMA, minimum TX-off time, and frequency-hopping rendezvous.
        "Resp UDP packets" shows application-layer packetization behavior for the response path.
      </p>
    </Card>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="label">{label}</div>
      <div className={`stat-value mt-1 text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  )
}
