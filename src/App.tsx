/**
 * WiSUN Throughput & Capacity Calculator — application shell.
 *
 * Models the full Boltron AMI data path (HES/NMS ⇄ 4G/MQTT ⇄ RPi gateway ⇄
 * UART ⇄ WiSUN Border Router ⇄ RF mesh ⇄ meter) to answer:
 *   1) End-to-end latency budget for each DLMS profile.
 *   2) How many meter nodes a single Border Router / gateway can serve.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
import { useMemo, useState } from 'react'
import { Activity, Boxes, Clock, Gauge, Radio, Github } from 'lucide-react'
import { PHY_PROFILES, DEFAULT_PHY_ID } from './config/phyProfiles'
import { DLMS_PROFILES, DEFAULT_DLMS_ID } from './config/dlmsProfiles'
import { USE_CASES, DEFAULT_USE_CASE_ID } from './config/useCases'
import { DEFAULT_NETWORK } from './config/networkConfig'
import type { NetworkParams } from './lib/types'
import { parseProfile } from './lib/logParser'
import { computeCapacity, computeSessionBudget, computeStageBudget } from './lib/engine'
import { fmtMs, fmtNum, fmtRate, fmtBytes } from './lib/format'
import { ControlPanel } from './components/ControlPanel'
import { PipelineDiagram } from './components/PipelineDiagram'
import { CapacityPanel } from './components/CapacityPanel'
import { LatencyPanel } from './components/LatencyPanel'
import { ProfileExplorer } from './components/ProfileExplorer'
import { Stat, Card } from './components/ui'

export default function App() {
  const [phyId, setPhyId] = useState(DEFAULT_PHY_ID)
  const [dlmsId, setDlmsId] = useState(DEFAULT_DLMS_ID)
  const [useCaseId, setUseCaseId] = useState(DEFAULT_USE_CASE_ID)
  const [net, setNet] = useState<NetworkParams>(DEFAULT_NETWORK)

  // Parse every built-in capture once.
  const allStats = useMemo(
    () => Object.fromEntries(DLMS_PROFILES.map((p) => [p.id, parseProfile(p.raw)])),
    [],
  )

  const phy = PHY_PROFILES.find((p) => p.id === phyId) ?? PHY_PROFILES[0]
  const useCase = USE_CASES.find((u) => u.id === useCaseId) ?? USE_CASES[0]
  const dlms = DLMS_PROFILES.find((p) => p.id === dlmsId) ?? DLMS_PROFILES[0]
  const stats = allStats[dlmsId]

  const sessionBudget = useMemo(
    () => computeSessionBudget(stats, phy, net),
    [stats, phy, net],
  )
  const capacity = useMemo(
    () => computeCapacity(stats, phy, net, useCase),
    [stats, phy, net, useCase],
  )

  // Representative transaction (largest response) for the pipeline diagram.
  const repBudget = useMemo(() => {
    const rep = [...stats.transactions].sort((a, b) => b.respBytes - a.respBytes)[0]
    if (!rep) return sessionBudget
    return computeStageBudget(rep.reqBytes, rep.respBytes, phy, net, {
      isPush: rep.isPush,
      measuredRttMs: rep.rttMs,
    })
  }, [stats, phy, net, sessionBudget])

  const patchNet = (patch: Partial<NetworkParams>) => setNet((n) => ({ ...n, ...patch }))
  const reset = () => {
    setNet(DEFAULT_NETWORK)
    setPhyId(DEFAULT_PHY_ID)
    setDlmsId(DEFAULT_DLMS_ID)
    setUseCaseId(DEFAULT_USE_CASE_ID)
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-glow">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                WiSUN Throughput &amp; Capacity Calculator
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                DLMS-over-WiSUN AMI modelling · Boltron Device Lifecycle Assurance Platform
              </p>
            </div>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-xs"
          >
            <Github className="h-4 w-4" /> Host on GitHub
          </a>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Controls */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <ControlPanel
            phyId={phyId}
            dlmsId={dlmsId}
            useCaseId={useCaseId}
            net={net}
            onPhy={setPhyId}
            onDlms={setDlmsId}
            onUseCase={setUseCaseId}
            onNet={patchNet}
            onReset={reset}
          />
        </aside>

        {/* Results */}
        <main className="space-y-4">
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Max nodes / gateway"
              value={fmtNum(capacity.maxNodes)}
              sub={`Limited by ${capacity.bottleneck} · ${useCase.label}`}
              accent="text-brand-300"
              icon={<Boxes className="h-4 w-4" />}
            />
            <Stat
              label="Profile read time (1 meter)"
              value={fmtMs(sessionBudget.totalMs)}
              sub={
                sessionBudget.measuredRttMs
                  ? `Measured core: ${fmtMs(sessionBudget.measuredRttMs)}`
                  : dlms.label
              }
              accent="text-teal-300"
              icon={<Clock className="h-4 w-4" />}
            />
            <Stat
              label="RF channel time / meter"
              value={fmtMs(capacity.perNodeRfMs)}
              sub={`${fmtBytes(stats.appBytesTotal)} app · ${stats.frames} frames`}
              accent="text-cyan-300"
              icon={<Activity className="h-4 w-4" />}
            />
            <Stat
              label="PHY line rate"
              value={fmtRate(phy.dataRateKbps)}
              sub={phy.modulation}
              accent="text-violet-300"
              icon={<Gauge className="h-4 w-4" />}
            />
          </div>

          <PipelineDiagram budget={repBudget} />

          <CapacityPanel cap={capacity} />

          <div className="grid gap-4 xl:grid-cols-2">
            <LatencyPanel
              budget={sessionBudget}
              title="Full profile session (all transactions)"
              subtitle={`${dlms.label} — ${dlms.description}`}
            />
            <LatencyPanel
              budget={repBudget}
              title="Largest single transaction"
              subtitle="Representative worst-case round trip (biggest response block)."
            />
          </div>

          <ProfileExplorer stats={stats} phy={phy} net={net} />

          <Card className="card-pad text-[11px] leading-relaxed text-slate-500">
            <p>
              <span className="font-semibold text-slate-400">How it works — </span>
              Real NMS captures are parsed to derive per-transaction frame sizes and measured
              timings. The engine adds 6LoWPAN/IPv6/UDP + 802.15.4 MAC + PHY overhead, CSMA/CA,
              mesh hops and PER-driven retransmissions to compute WiSUN airtime, then layers UART,
              gateway, and 4G/MQTT (QoS{net.mqttQos}) latency. Capacity is the minimum node count
              across every shared resource for the selected cycle. All parameters on the left are
              live — tune them to match your deployment.
            </p>
          </Card>

          <footer className="pt-2 text-center text-[11px] text-slate-600">
            Built by <span className="text-slate-400">Bhautik Ramoliya</span> ·{' '}
            <span className="text-slate-400">Boltron Telesystems Private Limited</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
