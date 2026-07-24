/**
 * BOLT CRF WiSUN Scenarios — application shell.
 *
 * Models the full Boltron AMI data path (HES/NMS ⇄ 4G/MQTT ⇄ RPi gateway ⇄
 * UART ⇄ WiSUN Border Router ⇄ RF mesh ⇄ meter) to answer:
 *   1) End-to-end latency budget for each 1PH DLMS polling profile.
 *   2) How many meter nodes a single Border Router / gateway can serve.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron telesystems private limited
 */
import { useMemo, useState } from 'react'
import {
  Activity,
  BookOpenText,
  Boxes,
  Clock,
  Github,
  ListTree,
  Radio,
  Route,
  ShieldAlert,
  TableProperties,
} from 'lucide-react'
import { PHY_PROFILES, DEFAULT_PHY_ID } from './config/phyProfiles'
import { DLMS_PROFILES, DEFAULT_DLMS_ID } from './config/dlmsProfiles'
import { USE_CASES, DEFAULT_USE_CASE_ID } from './config/useCases'
import { TOPOLOGY_SCENARIOS, DEFAULT_TOPOLOGY_ID } from './config/topologyScenarios'
import { DEFAULT_NETWORK } from './config/networkConfig'
import type { NetworkParams, ProfileStats } from './lib/types'
import { parseProfile } from './lib/logParser'
import {
  computeBatch,
  computeCapacity,
  computeFlowDetail,
  computeSessionBudget,
  computeStageBudget,
  evaluateProfiles,
} from './lib/engine'
import { fmtBytes, fmtMs, fmtNum, fmtRate } from './lib/format'
import { ControlPanel } from './components/ControlPanel'
import { DataFlowDiagram } from './components/DataFlowDiagram'
import { StageWalkthrough } from './components/StageWalkthrough'
import { ScenarioGuidePanel } from './components/ScenarioGuidePanel'
import { CapacityPanel } from './components/CapacityPanel'
import { LatencyPanel } from './components/LatencyPanel'
import { ProfileExplorer } from './components/ProfileExplorer'
import { SupportMatrix } from './components/SupportMatrix'
import { StageTimingMatrix } from './components/StageTimingMatrix'
import { Stat } from './components/ui'

const PUSH_BYTES_1PH = 115

type MainTab = 'overview' | 'walkthrough' | 'matrices' | 'transactions'

function buildPushStormStats(): ProfileStats {
  return {
    transactions: [
      {
        seq: 0,
        reqBytes: 0,
        respBytes: PUSH_BYTES_1PH,
        reqEpoch: null,
        respEpoch: null,
        rttMs: null,
        reqApdu: undefined,
        respApdu: 'Last Gasp PUSH',
        isPush: true,
      },
    ],
    txnCount: 0,
    pushCount: 1,
    reqBytesTotal: 0,
    respBytesTotal: PUSH_BYTES_1PH,
    appBytesTotal: PUSH_BYTES_1PH,
    measuredDurationMs: 0,
    measuredRttMsTotal: 0,
    frames: 1,
    records: [],
  }
}

export default function App() {
  const [phyId, setPhyId] = useState(DEFAULT_PHY_ID)
  const [dlmsId, setDlmsId] = useState(DEFAULT_DLMS_ID)
  const [useCaseId, setUseCaseId] = useState(DEFAULT_USE_CASE_ID)
  const [topologyId, setTopologyId] = useState(DEFAULT_TOPOLOGY_ID)
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [net, setNet] = useState<NetworkParams>(DEFAULT_NETWORK)
  const [targetNodes, setTargetNodes] = useState(100)

  const allStats = useMemo(
    () => Object.fromEntries(DLMS_PROFILES.map((p) => [p.id, parseProfile(p.raw)])),
    [],
  )
  const pushStats = useMemo(() => buildPushStormStats(), [])

  const phy = PHY_PROFILES.find((p) => p.id === phyId) ?? PHY_PROFILES[0]
  const useCase = USE_CASES.find((u) => u.id === useCaseId) ?? USE_CASES[0]
  const topology = TOPOLOGY_SCENARIOS.find((t) => t.id === topologyId) ?? TOPOLOGY_SCENARIOS[0]
  const dlms = DLMS_PROFILES.find((p) => p.id === dlmsId) ?? DLMS_PROFILES[0]
  const isPushMode = useCase.kind === 'push'
  const stats = isPushMode ? pushStats : allStats[dlmsId]

  const workload = isPushMode
    ? {
        label: 'Last Gasp PUSH',
        category: '1PH PUSH storm',
        description:
          'Synthetic 1PH PUSH model using a fixed 115-byte raw DLMS payload from all meters at the same time. 3PH raw payload sizes will be different.',
      }
    : {
        label: dlms.label,
        category: dlms.category,
        description: `${dlms.description} This dashboard is showing the 1PH raw-size reference; 3PH raw payload sizes will differ.`,
      }

  const sessionBudget = useMemo(() => computeSessionBudget(stats, phy, net), [stats, phy, net])
  const capacity = useMemo(
    () => computeCapacity(stats, phy, net, useCase, targetNodes, topology),
    [stats, phy, net, useCase, targetNodes, topology],
  )
  const batch = useMemo(
    () => computeBatch(stats, phy, net, useCase, targetNodes, topology),
    [stats, phy, net, useCase, targetNodes, topology],
  )
  const support = useMemo(
    () =>
      isPushMode
        ? []
        : evaluateProfiles(
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
            topology,
          ),
    [allStats, isPushMode, phy, net, useCase, targetNodes, topology],
  )

  const representativeTxn = useMemo(() => {
    let best: (typeof stats.transactions)[number] | null = null
    let bestMs = -1
    for (const txn of stats.transactions) {
      const budget = computeStageBudget(txn.reqBytes, txn.respBytes, phy, net, {
        isPush: txn.isPush,
        measuredRttMs: txn.rttMs,
      })
      if (budget.totalMs > bestMs) {
        best = txn
        bestMs = budget.totalMs
      }
    }
    return best
  }, [stats, phy, net])

  const repBudget = useMemo(() => {
    if (!representativeTxn) return sessionBudget
    return computeStageBudget(representativeTxn.reqBytes, representativeTxn.respBytes, phy, net, {
      isPush: representativeTxn.isPush,
      measuredRttMs: representativeTxn.rttMs,
    })
  }, [representativeTxn, phy, net, sessionBudget])

  const flowDetail = useMemo(() => {
    if (!representativeTxn) return computeFlowDetail(0, 0, phy, net)
    return computeFlowDetail(representativeTxn.reqBytes, representativeTxn.respBytes, phy, net, {
      isPush: representativeTxn.isPush,
    })
  }, [representativeTxn, phy, net])

  const supportSummary = useMemo(() => {
    if (isPushMode || support.length === 0) return null
    const failCount = support.filter((r) => r.status === 'fail').length
    const warnCount = support.filter((r) => r.status === 'warn').length
    const okCount = support.filter((r) => r.status === 'ok').length
    return { failCount, warnCount, okCount, total: support.length }
  }, [isPushMode, support])

  const verdict = isPushMode
    ? capacity.statusAtTarget === 'ok'
      ? { label: 'Supported', accent: 'text-teal-600' }
      : capacity.statusAtTarget === 'warn'
        ? { label: 'Marginal', accent: 'text-amber-600' }
        : { label: 'At risk', accent: 'text-rose-600' }
    : supportSummary && supportSummary.failCount > 0
      ? { label: 'At risk', accent: 'text-rose-600' }
      : supportSummary && supportSummary.warnCount > 0
        ? { label: 'Marginal', accent: 'text-amber-600' }
        : { label: 'Supported', accent: 'text-teal-600' }

  const patchNet = (patch: Partial<NetworkParams>) => setNet((n) => ({ ...n, ...patch }))
  const idealRf = () => {
    patchNet({ hopCount: 1, packetErrorRate: 0 })
    setTopologyId('in-room-100')
    setTargetNodes(100)
  }
  const reset = () => {
    setNet(DEFAULT_NETWORK)
    setPhyId(DEFAULT_PHY_ID)
    setDlmsId(DEFAULT_DLMS_ID)
    setUseCaseId(DEFAULT_USE_CASE_ID)
    setTopologyId(DEFAULT_TOPOLOGY_ID)
    setTargetNodes(100)
  }

  const tabs: Array<{ id: MainTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BookOpenText className="h-4 w-4" /> },
    { id: 'walkthrough', label: 'Stage walkthrough', icon: <Route className="h-4 w-4" /> },
    { id: 'matrices', label: 'IS15959 usecases', icon: <TableProperties className="h-4 w-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <ListTree className="h-4 w-4" /> },
  ]

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-glow">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                BOLT CRF WiSUN Scenarios
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                1PH meter polling reference · Poll = REQT + RESP · PUSH = uplink only · RF scenarios + weak-link overlay · 3PH raw sizes will differ
              </p>
            </div>
          </div>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="btn-ghost text-xs">
            <Github className="h-4 w-4" /> Host on GitHub
          </a>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <ControlPanel
            phyId={phyId}
            dlmsId={dlmsId}
            useCaseId={useCaseId}
            topologyId={topologyId}
            pushMode={isPushMode}
            net={net}
            targetNodes={targetNodes}
            onPhy={setPhyId}
            onDlms={setDlmsId}
            onUseCase={setUseCaseId}
            onTopology={setTopologyId}
            onNet={patchNet}
            onTargetNodes={setTargetNodes}
            onIdealRf={idealRf}
            onReset={reset}
          />
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={isPushMode ? `PUSH storm drain @ ${fmtNum(targetNodes)}` : 'Max nodes / gateway'}
              value={isPushMode ? fmtMs(batch.batchCompletionMs) : fmtNum(capacity.maxNodes)}
              sub={
                isPushMode
                  ? `${fmtNum(targetNodes)} simultaneous 115 B PUSH messages · ${topology.label} · limited by ${batch.bottleneck.label}`
                  : `Limited by ${capacity.bottleneck} · ${useCase.label} · ${topology.label}`
              }
              accent="text-brand-600"
              icon={<Boxes className="h-4 w-4" />}
            />
            <Stat
              label={`Verdict @ ${fmtNum(targetNodes)} nodes`}
              value={verdict.label}
              sub={
                isPushMode
                  ? `BR backlog ${fmtNum(batch.brBacklogFrames)} / ${fmtNum(batch.brBufferFrames)} · no association timeout in PUSH mode`
                  : supportSummary && supportSummary.failCount > 0
                    ? `${supportSummary.failCount} of ${supportSummary.total} IS15959 usecases are at risk · worst assoc gap ${fmtMs(capacity.gapAtTargetMs)}`
                    : supportSummary && supportSummary.warnCount > 0
                      ? `${supportSummary.warnCount} of ${supportSummary.total} IS15959 usecases are marginal · resp spread ${fmtMs(capacity.responseSpreadMsAtTarget)}`
                      : `All ${supportSummary?.okCount ?? 0} IS15959 usecases are supported · assoc gap ${fmtMs(capacity.gapAtTargetMs)}`
              }
              accent={verdict.accent}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <Stat
              label="RF channel time / meter"
              value={fmtMs(capacity.perNodeRfMs)}
              sub={`${fmtRate(phy.dataRateKbps)} · ${fmtBytes(stats.appBytesTotal)} app · ${stats.frames} frame${stats.frames > 1 ? 's' : ''}`}
              accent="text-cyan-600"
              icon={<Activity className="h-4 w-4" />}
            />
            <Stat
              label={isPushMode ? 'PUSH latency (1 meter)' : 'Profile read time (1 meter)'}
              value={fmtMs(sessionBudget.totalMs)}
              sub={sessionBudget.measuredRttMs ? `Measured core: ${fmtMs(sessionBudget.measuredRttMs)}` : workload.label}
              accent="text-teal-600"
              icon={<Clock className="h-4 w-4" />}
            />
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <ScenarioGuidePanel
                workload={workload.label}
                workloadCategory={workload.category}
                workloadDescription={workload.description}
                selectedUseCaseId={useCaseId}
                selectedTopologyId={topologyId}
                net={net}
                pushBytes={PUSH_BYTES_1PH}
              />
              <CapacityPanel cap={capacity} topology={topology} />
              <div className="grid gap-4 2xl:grid-cols-2">
                <LatencyPanel
                  budget={sessionBudget}
                  title={isPushMode ? 'Synthetic PUSH session (1 meter)' : 'Full poll session (all transactions)'}
                  subtitle={
                    isPushMode
                      ? 'Fixed 115-byte 1PH PUSH uplink. No REQT downlink is sent by HES in this mode.'
                      : `${workload.label} — ${workload.description}`
                  }
                />
                <LatencyPanel
                  budget={repBudget}
                  title={isPushMode ? 'Representative PUSH transaction' : 'Representative worst-case poll transaction'}
                  subtitle={
                    isPushMode
                      ? 'Simple uplink-only path used for outage / last-gasp explanation.'
                      : 'Worst modelled round trip from the selected 1PH profile, including downlink-heavy FOTA chunks when applicable.'
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'walkthrough' && (
            <div className="space-y-4">
              <StageWalkthrough detail={flowDetail} />
              <DataFlowDiagram detail={flowDetail} />
            </div>
          )}

          {activeTab === 'matrices' && (
            <div className="space-y-4">
              {!isPushMode && (
                <SupportMatrix
                  rows={support}
                  targetNodes={targetNodes}
                  assocTimeoutMs={net.assocTimeoutMs}
                  useCaseLabel={useCase.label}
                  parallel={useCase.parallel}
                />
              )}
              <StageTimingMatrix batch={batch} useCaseLabel={useCase.label} assocApplies={!isPushMode && useCase.parallel} />
            </div>
          )}

          {activeTab === 'transactions' && <ProfileExplorer stats={stats} phy={phy} net={net} />}

          <footer className="pt-2 text-center text-[11px] text-slate-600">
            Boltron Telesystems Private Limited
          </footer>
        </main>
      </div>
    </div>
  )
}
