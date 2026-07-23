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
      <div className="max-h-[360px] overflow-auto rounded-lg border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-base-850 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Request APDU</th>
              <th className="px-3 py-2 text-right font-medium">Req</th>
              <th className="px-3 py-2 font-medium">Response APDU</th>
              <th className="px-3 py-2 text-right font-medium">Resp</th>
              <th className="px-3 py-2 text-right font-medium">RF air</th>
              <th className="px-3 py-2 text-right font-medium">Measured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {stats.transactions.map((t) => {
              const air =
                computeAirtime(t.reqBytes, phy, net).totalAirtimeMs +
                computeAirtime(t.respBytes, phy, net).totalAirtimeMs
              return (
                <tr key={t.seq} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-1.5 text-slate-500">{t.seq + 1}</td>
                  <td className="px-3 py-1.5 text-slate-300">
                    {t.isPush ? <span className="text-violet-300">— (PUSH) —</span> : t.reqApdu ?? '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right stat-value text-slate-400">
                    {t.reqBytes || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-slate-300">{t.respApdu ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right stat-value text-slate-400">
                    {t.respBytes || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right stat-value text-brand-300">{fmtMs(air)}</td>
                  <td className="px-3 py-1.5 text-right stat-value text-cyan-300">
                    {t.rttMs != null ? fmtMs(t.rttMs) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        "RF air" is the modelled WiSUN airtime (both directions, incl. hops &amp; retransmissions).
        "Measured" is the request→response gap captured at the NMS.
      </p>
    </Card>
  )
}
