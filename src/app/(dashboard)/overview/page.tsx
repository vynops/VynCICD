'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, GitBranch, Rocket, Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, RefreshCw, ArrowUpRight } from 'lucide-react'
import { timeAgo, duration, cn } from '@/lib/utils'
import Link from 'next/link'
import type { PipelineRun, Deployment } from '@/lib/data-store'
import type { Incident } from '@/lib/oncall-store'
import { fetchList } from '@/lib/fetch-json'
import { fetchAnalyticsSummary, type DoraSummary } from '@/lib/analytics-client'


const STATUS_ICON: Record<string, React.ReactNode> = {
  success:   <CheckCircle  className="w-3.5 h-3.5 text-emerald-400" />,
  failed:    <XCircle      className="w-3.5 h-3.5 text-red-400" />,
  running:   <RefreshCw    className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  pending:   <Clock        className="w-3.5 h-3.5 text-slate-400" />,
  cancelled: <XCircle      className="w-3.5 h-3.5 text-slate-500" />,
}
const STATUS_COLOR: Record<string, string> = {
  success:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:    'text-red-400 bg-red-500/10 border-red-500/20',
  running:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pending:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
  cancelled: 'text-slate-500 bg-slate-800/40 border-slate-700/30',
}

function StatCard({ label, value, sub, trend, color, href }: { label: string; value: string | number; sub?: string; trend?: 'up' | 'down' | 'neutral'; color?: string; href?: string }) {
  const inner = (
    <div className={cn('bg-[#0d1117] border border-slate-800/60 rounded-xl p-4 transition-all', href && 'hover:border-slate-600 hover:bg-slate-800/40 cursor-pointer group')}>
      <div className="flex items-start justify-between">
        <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
        {href && <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors mt-0.5 flex-shrink-0" />}
      </div>
      <div className={cn('text-2xl font-black', color ?? 'text-white')}>{value}</div>
      {sub && (
        <div className={cn('text-xs mt-1 flex items-center gap-1', trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500')}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {sub}
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function OverviewPage() {
  const runState = useSWR<PipelineRun[]>('/api/runs?limit=500', fetchList, { refreshInterval: 30000 })
  const deploymentState = useSWR<Deployment[]>('/api/deployments?limit=500', fetchList, { refreshInterval: 30000 })
  const incidentState = useSWR<Incident[]>('/api/incidents', fetchList, { refreshInterval: 30000 })
  const analyticsState = useSWR<DoraSummary>('/api/analytics/summary', fetchAnalyticsSummary, { refreshInterval: 60000 })
  const runs = runState.data ?? []
  const deployments = deploymentState.data ?? []
  const incidents = incidentState.data ?? []
  const analytics = analyticsState.data
  const [from, setFrom] = useState<string | null>(null)
  useEffect(() => {
    const refreshWindow = () => setFrom(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    refreshWindow()
    const timer = window.setInterval(refreshWindow, 30000)
    return () => window.clearInterval(timer)
  }, [])
  const runScope = from ? `/runs?from=${encodeURIComponent(from)}` : '/runs'
  const recentRuns = from ? runs.filter(run => Date.parse(run.startedAt) >= Date.parse(from)) : []
  const completedRuns = recentRuns.filter(run => run.status === 'success' || run.status === 'failed')

  const total   = recentRuns.length
  const passed  = completedRuns.filter(r => r.status === 'success').length
  const failed  = recentRuns.filter(r => r.status === 'failed').length
  const running = recentRuns.filter(r => r.status === 'running').length
  const successRate = completedRuns.length > 0 ? Math.round((passed / completedRuns.length) * 100) : null

  const openIncidents = incidents.filter(i => i.status !== 'resolved')
  const targets = analytics?.targets ?? {
    deploymentFrequency: 5,
    leadTimeHours: 24,
    mttrMinutes: 60,
    changeFailureRate: 5,
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {[{ label: 'runs', error: runState.error }, { label: 'deployments', error: deploymentState.error }, { label: 'incidents', error: incidentState.error }, { label: 'analytics', error: analyticsState.error }].map(state =>
        state.error ? <p key={state.label} role="alert" className="text-sm text-red-400">Unable to load {state.label}. Refresh to retry; displayed data may be stale.</p> : null
      )}
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Runs (24h)" value={runState.data && from ? total : '-'} sub={`${running} running · retained history`} color="text-white" href={runScope} />
        <StatCard label="Success Rate" value={runState.data && from && successRate !== null ? `${successRate}%` : '-'} sub="completed runs · 24h" color={successRate === null ? 'text-slate-500' : successRate >= 80 ? 'text-emerald-400' : 'text-red-400'} href={`${runScope}${from ? '&' : '?'}status=completed`} />
        <StatCard label="Failed Runs" value={runState.data && from ? failed : '-'} sub="last 24h" color={failed > 0 ? 'text-red-400' : 'text-white'} href={`${runScope}${from ? '&' : '?'}status=failed`} />
        <StatCard label="Deployments" value={deploymentState.data ? deployments.length : '-'} sub="up to 500 retained" color="text-white" href="/deployments" />
        <StatCard label="Open Incidents" value={incidentState.data ? openIncidents.length : '-'} sub={openIncidents.filter(i => i.severity === 'critical').length + ' critical'} color={openIncidents.length > 0 ? 'text-orange-400' : 'text-white'} href="/incidents?status=open" />
        <StatCard label="Dep. Freq." value={analytics?.deployFrequency ?? '—'} sub="tracked records/week" color={analytics && analytics.deployFrequency >= targets.deploymentFrequency ? 'text-emerald-400' : 'text-slate-400'} href="/analytics" />
      </div>

      {/* DORA snapshot */}
      {analytics && (
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">DORA Metrics</span>
            <span className="text-xs text-slate-500 ml-1">Last 30 days</span>
            <Link href="/analytics" className="ml-auto text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              Full analytics <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tracked Deployment Frequency', value: `${analytics.deployFrequency}/wk`, status: analytics.deployFrequency >= targets.deploymentFrequency ? 'On target' : 'Below target', color: analytics.deployFrequency >= targets.deploymentFrequency ? 'text-emerald-400' : 'text-orange-400' },
              { label: 'Build Duration (lead-time proxy)', value: analytics.sampleCounts.successfulRuns ? `${analytics.leadTimeHours}h` : '-', status: !analytics.sampleCounts.successfulRuns ? 'No data' : analytics.leadTimeHours <= targets.leadTimeHours ? 'On target' : 'Above target', color: !analytics.sampleCounts.successfulRuns ? 'text-slate-500' : analytics.leadTimeHours <= targets.leadTimeHours ? 'text-emerald-400' : 'text-orange-400' },
              { label: 'MTTR', value: analytics.mttrMinutes != null ? `${analytics.mttrMinutes}min` : '—', status: analytics.mttrMinutes == null ? 'No data' : analytics.mttrMinutes <= targets.mttrMinutes ? 'On target' : 'Above target', color: analytics.mttrMinutes == null ? 'text-slate-500' : analytics.mttrMinutes <= targets.mttrMinutes ? 'text-emerald-400' : 'text-orange-400' },
              { label: 'Run Failure Rate (change-failure proxy)', value: analytics.sampleCounts.completedRuns ? `${analytics.changeFailureRate}%` : '-', status: !analytics.sampleCounts.completedRuns ? 'No data' : analytics.changeFailureRate <= targets.changeFailureRate ? 'On target' : 'Above target', color: !analytics.sampleCounts.completedRuns ? 'text-slate-500' : analytics.changeFailureRate <= targets.changeFailureRate ? 'text-emerald-400' : 'text-orange-400' },
            ].map(m => (
              <Link href="/analytics" key={m.label} className="space-y-1 block hover:bg-slate-800/30 rounded-lg">
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className={cn('text-xl font-black', m.color)}>{m.value}</div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-block', m.color, 'bg-current/10 opacity-80')}>{m.status}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent runs */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Recent Runs</span>
            </div>
            <Link href="/runs" className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              All runs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800/40">
            {runs.slice(0, 7).map(run => (
              <Link href={`/runs?runId=${encodeURIComponent(run.id)}`} key={run.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                <div className="flex-shrink-0">{STATUS_ICON[run.status] ?? STATUS_ICON.pending}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{run.repoFullName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{run.pipelineName} · {run.branch} · {run.commit.slice(0, 7)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', STATUS_COLOR[run.status])}>{run.status}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{run.durationMs ? duration(run.durationMs) : ''}</div>
                </div>
                <div className="text-[10px] text-slate-600 flex-shrink-0 w-14 text-right">{timeAgo(run.startedAt)}</div>
              </Link>
            ))}
            {!runState.error && runs.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-600">{runState.isLoading ? 'Loading runs...' : <Link href="/repositories">No runs yet. Connect a repository to get started.</Link>}</div>
            )}
          </div>
        </div>

        {/* Recent deployments */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Recent Deployments</span>
            </div>
            <Link href="/deployments" className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800/40">
            {deployments.slice(0, 6).map(d => (
              <Link href={`/deployments?deploymentId=${encodeURIComponent(d.id)}`} key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', d.status === 'healthy' ? 'bg-emerald-400' : d.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400')} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{d.repoFullName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{d.environment} · {d.version} · by {d.author}</div>
                </div>
                <div className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(d.deployedAt)}</div>
              </Link>
            ))}
            {!deploymentState.error && deployments.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-600">{deploymentState.isLoading ? 'Loading deployments...' : <Link href="/pipelines">No deployments yet. Configure a deployment pipeline.</Link>}</div>
            )}
          </div>
        </div>
      </div>

      {/* Open incidents banner */}
      {openIncidents.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{openIncidents.length} Open Incident{openIncidents.length > 1 ? 's' : ''}</span>
            <Link href="/incidents" className="ml-auto text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {openIncidents.slice(0, 3).map(inc => (
              <Link href={`/incidents?incidentId=${encodeURIComponent(inc.id)}`} key={inc.id} className="flex items-center gap-3 text-xs hover:text-white">
                <span className={cn('font-bold uppercase px-1.5 py-0.5 rounded text-[10px]', inc.severity === 'critical' ? 'bg-red-500/20 text-red-400' : inc.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400')}>{inc.severity}</span>
                <span className="text-slate-300 truncate">{inc.title}</span>
                <span className="text-slate-600 ml-auto flex-shrink-0">{timeAgo(inc.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
