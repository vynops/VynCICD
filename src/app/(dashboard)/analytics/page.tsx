'use client'

import useSWR from 'swr'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface DoraData {
  deployFrequency: number
  leadTimeHours: number
  mttrMinutes: number | null
  changeFailureRate: number
  targets: {
    deploymentFrequency: number
    leadTimeHours: number
    mttrMinutes: number
    changeFailureRate: number
  }
  dailyRuns: { date: string; success: number; failed: number }[]
  buildTimeTrend: { date: string; avgMs: number }[]
  topFailingPipelines: { name: string; failRate: number; runs: number }[]
}

const PERF_LEVEL = (val: number, elite: number, high: number): { label: string; color: string } => {
  if (val <= elite) return { label: 'Elite', color: 'text-emerald-400' }
  if (val <= high) return { label: 'High', color: 'text-blue-400' }
  return { label: 'Medium', color: 'text-yellow-400' }
}

const TooltipStyle = { backgroundColor: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }

export default function AnalyticsPage() {
  const { data: d } = useSWR<DoraData>('/api/analytics', fetcher, { refreshInterval: 60000 })

  if (!d) return (
    <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading analytics…</div>
  )

  const freq  = d.deployFrequency >= d.targets.deploymentFrequency ? { label: 'On target', color: 'text-emerald-400' } : { label: 'Below target', color: 'text-orange-400' }
  const lead  = PERF_LEVEL(d.leadTimeHours, d.targets.leadTimeHours, d.targets.leadTimeHours * 7)
  const mttr  = d.mttrMinutes != null ? PERF_LEVEL(d.mttrMinutes, d.targets.mttrMinutes, d.targets.mttrMinutes * 24) : { label: 'No data', color: 'text-slate-500' }
  const cfr   = PERF_LEVEL(d.changeFailureRate, d.targets.changeFailureRate, d.targets.changeFailureRate * 3)

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* DORA metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Deployment Frequency', value: `${d.deployFrequency}/wk`, perf: freq, desc: `Target ≥ ${d.targets.deploymentFrequency}/wk` },
          { label: 'Lead Time for Changes', value: `${d.leadTimeHours}h`, perf: lead, desc: `Target ≤ ${d.targets.leadTimeHours}h` },
          { label: 'MTTR', value: d.mttrMinutes != null ? `${d.mttrMinutes} min` : '—', perf: mttr, desc: `Target ≤ ${d.targets.mttrMinutes}min` },
          { label: 'Change Failure Rate', value: `${d.changeFailureRate}%`, perf: cfr, desc: `Target ≤ ${d.targets.changeFailureRate}%` },
        ].map(m => (
          <div key={m.label} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-2">{m.label}</div>
            <div className={cn('text-2xl font-black mb-1', m.perf.color)}>{m.value}</div>
            <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', m.perf.color)}>{m.perf.label} performer</div>
            <div className="text-[10px] text-slate-600">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily run history */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Daily Build Activity (7d)</span>
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
        </div>

        {/* Build time trend */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Avg Build Time Trend (7d)</span>
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
              <div key={p.name} className="flex items-center gap-4">
                <div className="w-44 text-xs text-white truncate">{p.name}</div>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.failRate}%` }} />
                </div>
                <div className="text-xs text-red-400 font-bold w-12 text-right">{p.failRate.toFixed(0)}%</div>
                <div className="text-[10px] text-slate-600 w-16 text-right">{p.runs} runs</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
