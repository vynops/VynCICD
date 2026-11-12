'use client'

import useSWR from 'swr'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { fetchAnalytics, type DoraData } from '@/lib/analytics-client'

const PERF_LEVEL = (val: number, elite: number, high: number): { label: string; color: string } => {
  if (val <= elite) return { label: 'On target', color: 'text-emerald-400' }
  if (val <= high) return { label: 'Above target', color: 'text-blue-400' }
  return { label: 'Above target', color: 'text-yellow-400' }
}

const TooltipStyle = { backgroundColor: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }

export default function AnalyticsPage() {
  const { data: d, error, mutate } = useSWR<DoraData>('/api/analytics', fetchAnalytics, { refreshInterval: 60000 })

  if (error && !d) return <div role="alert" className="text-sm text-red-400">
    Unable to load analytics. <button onClick={() => mutate()} className="underline">Retry</button>
  </div>

  if (!d) return (
    <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading analytics…</div>
  )

  const freq  = d.deployFrequency >= d.targets.deploymentFrequency ? { label: 'On target', color: 'text-emerald-400' } : { label: 'Below target', color: 'text-orange-400' }
  const lead  = d.sampleCounts.successfulRuns ? PERF_LEVEL(d.leadTimeHours, d.targets.leadTimeHours, d.targets.leadTimeHours * 7) : { label: 'No data', color: 'text-slate-500' }
  const mttr  = d.mttrMinutes != null ? PERF_LEVEL(d.mttrMinutes, d.targets.mttrMinutes, d.targets.mttrMinutes * 24) : { label: 'No data', color: 'text-slate-500' }
  const cfr   = d.sampleCounts.completedRuns ? PERF_LEVEL(d.changeFailureRate, d.targets.changeFailureRate, d.targets.changeFailureRate * 3) : { label: 'No data', color: 'text-slate-500' }
  const runScope = `/runs?from=${encodeURIComponent(d.from)}`
  const weekScope = `/runs?from=${encodeURIComponent(`${d.dailyRuns[0]?.date ?? d.from.slice(0, 10)}T00:00:00Z`)}`

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {error && <p role="alert" className="text-sm text-red-400">Analytics could not be refreshed; displayed data may be stale.</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span>Last 30 days of retained history. Select a metric to inspect its source records.</span>
        <Link href="/settings?tab=dora" className="text-emerald-400 hover:underline">Configure targets</Link>
        <button onClick={() => mutate()} className="ml-auto hover:text-white">Refresh analytics</button>
      </div>
      <p className="text-xs text-slate-500">Deployment frequency counts tracked deployment records. Build duration is a lead-time proxy, not commit-to-production time; run failure rate is a change-failure proxy, not production change failures. MTTR uses resolved incidents.</p>
      {/* DORA metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tracked Deployment Frequency', value: `${d.deployFrequency}/wk`, perf: freq, desc: `Target ≥ ${d.targets.deploymentFrequency}/wk`, href: `/deployments?from=${encodeURIComponent(d.from)}` },
          { label: 'Build Duration (lead-time proxy)', value: d.sampleCounts.successfulRuns ? `${d.leadTimeHours}h` : '-', perf: lead, desc: `Target ≤ ${d.targets.leadTimeHours}h`, href: `${runScope}&status=success` },
          { label: 'MTTR', value: d.mttrMinutes != null ? `${d.mttrMinutes} min` : '—', perf: mttr, desc: `Target ≤ ${d.targets.mttrMinutes}min`, href: `/incidents?status=resolved&from=${encodeURIComponent(d.from)}` },
          { label: 'Run Failure Rate (change-failure proxy)', value: d.sampleCounts.completedRuns ? `${d.changeFailureRate}%` : '-', perf: cfr, desc: `Target ≤ ${d.targets.changeFailureRate}%`, href: `${runScope}&status=failed` },
        ].map(m => (
          <Link href={m.href} key={m.label} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4 hover:border-slate-500">
            <div className="text-xs text-slate-500 mb-2">{m.label}</div>
            <div className={cn('text-2xl font-black mb-1', m.perf.color)}>{m.value}</div>
            <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', m.perf.color)}>{m.perf.label}</div>
            <div className="text-[10px] text-slate-600">{m.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily run history */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Daily Build Activity (7d)</span>
            <Link href={weekScope} className="ml-auto text-xs text-emerald-400 hover:underline">View 7-day runs</Link>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={d.dailyRuns} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={TooltipStyle} />
              <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="failed"  stackId="a" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Success</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> Failed</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-slate-400">
            Inspect a day (UTC):
            {d.dailyRuns.map(day => <Link key={day.date} href={`/runs?date=${encodeURIComponent(day.date)}`} className="text-emerald-400 hover:underline">{day.date.slice(5)}</Link>)}
          </div>
        </div>

        {/* Build time trend */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Avg Build Time Trend (7d)</span>
            <Link href={`${weekScope}&status=success`} className="ml-auto text-xs text-emerald-400 hover:underline">View successful runs</Link>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={d.buildTimeTrend}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${Math.round(v / 60000)}m`} />
              <Tooltip contentStyle={TooltipStyle} formatter={(v: number) => [`${Math.round(v / 60000)}m`, 'Avg']} />
              <Line type="monotone" dataKey="avgMs" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top failing pipelines */}
      {d.topFailingPipelines.length > 0 && (
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-white">Top Failing Pipelines</span>
          </div>
          <div className="space-y-3">
            {d.topFailingPipelines.map(p => (
              <Link href={`${runScope}&status=failed&pipelineId=${encodeURIComponent(p.pipelineId)}`} key={p.pipelineId} className="flex items-center gap-4 hover:bg-slate-800/30 rounded-lg">
                <div className="w-44 text-xs text-white truncate">{p.name}</div>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.failRate}%` }} />
                </div>
                <div className="text-xs text-red-400 font-bold w-12 text-right">{p.failRate.toFixed(0)}%</div>
                <div className="text-[10px] text-slate-600 w-16 text-right">{p.runs} runs</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
