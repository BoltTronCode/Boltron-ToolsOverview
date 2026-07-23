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
import { Activity, Boxes, Clock, Radio, Github, ShieldAlert } from 'lucide-react'
import { PHY_PROFILES, DEFAULT_PHY_ID } from './config/phyProfiles'
import { DLMS_PROFILES, DEFAULT_DLMS_ID } from './config/dlmsProfiles'
import { USE_CASES, DEFAULT_USE_CASE_ID } from './config/useCases'
import { DEFAULT_NETWORK } from './config/networkConfig'
import type { NetworkParams } from './lib/types'
import { parseProfile } from './lib/logParser'
import {
  computeBatch,
  computeCapacity,
  computeSessionBudget,
  computeStageBudget,
  evaluateProfiles,
} from './lib/engine'
import { fmtMs, fmtNum, fmtRate, fmtBytes } from './lib/format'
import { ControlPanel } from './components/ControlPanel'
import { PipelineDiagram } from './components/PipelineDiagram'
import { CapacityPanel } from './components/CapacityPanel'
import { LatencyPanel } from './components/LatencyPanel'
import { ProfileExplorer } from './components/ProfileExplorer'
import { SupportMatrix } from './components/SupportMatrix'
import { StageTimingMatrix } from './components/StageTimingMatrix'
import { Stat, Card } from './components/ui'

export default function App() {
  const [phyId, setPhyId] = useState(DEFAULT_PHY_ID)
  const [dlmsId, setDlmsId] = useState(DEFAULT_DLMS_ID)
  const [useCaseId, setUseCaseId] = useState(DEFAULT_USE_CASE_ID)
  const [net, setNet] = useState<NetworkParams>(DEFAULT_NETWORK)
  const [targetNodes, setTargetNodes] = useState(100)

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
    () => computeCapacity(stats, phy, net, useCase, targetNodes),
    [stats, phy, net, useCase, targetNodes],
  )
  const batch = useMemo(
    () => computeBatch(stats, phy, net, useCase, targetNodes),
    [stats, phy, net, useCase, targetNodes],
  )
  const support = useMemo(
    () =>
      evaluateProfiles(
        DLMS_PROFILES.map((p) => ({
          id: p.id,
          label: p.label,
          category: p.category,
          stats: allStats[p.id],
        })),
        phy,
        net,
        useCase,
        targetNodes,
      ),
    [allStats, phy, net, useCase, targetNodes],
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

  const verdict =
    capacity.statusAtTarget === 'ok'
      ? { label: 'Supported', accent: 'text-teal-300' }
      : capacity.statusAtTarget === 'warn'
        ? { label: 'Marginal', accent: 'text-amber-300' }
        : { label: 'At risk', accent: 'text-rose-300' }

  const patchNet = (patch: Partial<NetworkParams>) => setNet((n) => ({ ...n, ...patch }))
  const idealRf = () => {
    patchNet({ hopCount: 1, packetErrorRate: 0 })
    setTargetNodes(100)
  }
  const reset = () => {
    setNet(DEFAULT_NETWORK)
    setPhyId(DEFAULT_PHY_ID)
    setDlmsId(DEFAULT_DLMS_ID)
    setUseCaseId(DEFAULT_USE_CASE_ID)
    setTargetNodes(100)
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
            targetNodes={targetNodes}
            onPhy={setPhyId}
            onDlms={setDlmsId}
            onUseCase={setUseCaseId}
            onNet={patchNet}
            onTargetNodes={setTargetNodes}
            onIdealRf={idealRf}
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
              label={`Verdict @ ${fmtNum(targetNodes)} nodes`}
              value={verdict.label}
              sub={`Assoc gap ${fmtMs(capacity.gapAtTargetMs)} vs ${fmtMs(net.assocTimeoutMs)} timeout`}
              accent={verdict.accent}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <Stat
              label="RF channel time / meter"
              value={fmtMs(capacity.perNodeRfMs)}
              sub={`${fmtRate(phy.dataRateKbps)} · ${fmtBytes(stats.appBytesTotal)} app · ${stats.frames} frames`}
              accent="text-cyan-300"
              icon={<Activity className="h-4 w-4" />}
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
          </div>

          <PipelineDiagram budget={repBudget} />

          <SupportMatrix rows={support} targetNodes={targetNodes} assocTimeoutMs={net.assocTimeoutMs} />

          <StageTimingMatrix batch={batch} />

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

          <Card className="card-pad text-[11px] leading-relaxed text-slate-400">
            <p className="mb-2 text-xs font-semibold text-slate-200">
              Solution-architecture notes &amp; caveats (CTO view)
            </p>
            <ul className="grid list-disc gap-1 pl-4 sm:grid-cols-2">
              <li>
                <span className="text-slate-300">Frequency hopping:</span> all nodes hop across every
                channel on time-scheduled patterns — they are <em>not</em> statically split across the
                20 channels. FH matters at TX time (the sender must hit the receiver's current unicast
                slot ≈ dwell/2 wait). One BR = one radio, so FH spreads interference but does not
                multiply BR throughput; the modelled per-frame FH margin is included in airtime.
              </li>
              <li>
                <span className="text-slate-300">UART is the quiet killer:</span> at 115200 baud a
                ~800 B frame ≈ 70 ms; both directions are strict serial queues. Raise the baud or
                enable full-duplex if UART becomes the bottleneck.
              </li>
              <li>
                <span className="text-slate-300">Pi Zero 2 W reality:</span> CPython is GIL-bound, so
                the bridge is effectively a single consumer; other Debian services, TLS and logging
                add the load factor. Non-RT scheduling adds per-op jitter.
              </li>
              <li>
                <span className="text-slate-300">Throttling helps associations:</span> admitting the
                fleet in waves keeps each meter's inter-message gap under the timeout and bounds BR
                backlog — at the cost of a longer total cycle.
              </li>
              <li>
                <span className="text-slate-300">Not yet modelled (future):</span> WiSUN join/EAPOL
                authentication &amp; PAN formation time, RPL route repair, node keep-alives, downlink
                broadcast-schedule latency, TCP slow-start / MQTT keepalive, meter NVM-write stalls,
                and Pi thermal throttling.
              </li>
              <li>
                <span className="text-slate-300">Security:</span> DLMS GCM authentication/encryption
                is already inside the captured frame sizes; WiSUN adds its own MAC-layer AES-CCM
                (counted in the MAC/security header bytes).
              </li>
            </ul>
          </Card>

          <Card className="card-pad text-[11px] leading-relaxed text-slate-500">
            <p>
              <span className="font-semibold text-slate-400">How it works — </span>
              Real NMS captures are parsed to derive per-transaction frame sizes and measured
              timings. The engine adds 6LoWPAN/IPv6/UDP + 802.15.4 MAC + PHY overhead, CSMA/CA,
              mesh hops and PER-driven retransmissions to compute WiSUN airtime, then layers the
              Pi↔RF-NIC QoS2 (exactly-once) engine, UART, gateway, meter and 4G/MQTT (QoS
              {net.mqttQos}) latency. Fleet capacity uses a <span className="text-slate-400">parallel
              poll model</span>: every meter advances step-by-step over the single BR radio, and the
              worst-case inter-message gap must stay under the meter's association inactivity timeout
              ({fmtMs(net.assocTimeoutMs)}) or the association is dropped. The supported node count is
              the minimum across the RF channel, association timeout, UART, 4G/MQTT and gateway CPU.
              All parameters on the left are live — tune them to match your deployment.
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
