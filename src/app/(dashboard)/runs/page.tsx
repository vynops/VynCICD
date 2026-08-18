'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronRight, Download, Search, Filter } from 'lucide-react'
import { timeAgo, duration, cn, exportCsv } from '@/lib/utils'
import type { PipelineRun, StageRun } from '@/lib/data-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLOR: Record<string, string> = {
  success:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:    'text-red-400 bg-red-500/10 border-red-500/20',
  running:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pending:   'text-slate-400 bg-slate-500/10 border-slate-700/30',
  cancelled: 'text-slate-500 bg-slate-800/40 border-slate-700/30',
  skipped:   'text-slate-600 bg-slate-800/30 border-slate-800/30',
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  success:   <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  failed:    <XCircle className="w-3.5 h-3.5 text-red-400" />,
  running:   <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  pending:   <Clock className="w-3.5 h-3.5 text-slate-500" />,
  skipped:   <Clock className="w-3.5 h-3.5 text-slate-700" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-slate-600" />,
}

function StageDetail({ stage }: { stage: StageRun }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-800/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800/20 transition-colors text-left"
      >
        {STATUS_ICON[stage.status] ?? STATUS_ICON.pending}
        <span className="text-xs font-medium text-white flex-1">{stage.name}</span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', STATUS_COLOR[stage.status])}>{stage.status}</span>
        {stage.durationMs ? <span className="text-[10px] text-slate-500 w-12 text-right">{duration(stage.durationMs)}</span> : null}
        {stage.retries > 0 && <span className="text-[10px] text-yellow-400">↺{stage.retries}</span>}
        {open ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
      </button>
      {open && stage.logs.length > 0 && (
        <div className="bg-slate-950/80 border-t border-slate-800/40 p-3">
          {stage.logs.map((log, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-400 leading-relaxed">{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function RunDetail({ run }: { run: PipelineRun }) {
  return (
    <div className="bg-[#0d1117] border border-emerald-500/30 rounded-xl p-5 mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Repository', value: run.repoFullName },
          { label: 'Branch', value: run.branch },
          { label: 'Commit', value: run.commit.slice(0, 8) },
          { label: 'Author', value: run.author },
          { label: 'Trigger', value: run.trigger },
          { label: 'Duration', value: run.durationMs ? duration(run.durationMs) : 'In progress' },
        ].map(item => (
          <div key={item.label} className="bg-slate-900/40 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
            <div className="text-xs text-white font-mono truncate">{item.value}</div>
          </div>
        ))}
      </div>
      {run.commitMessage && (
        <div className="text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2 mb-4 font-mono">{run.commitMessage}</div>
      )}
      {run.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{run.error}</div>
      )}
      {run.executionMode === 'jenkinsfile' && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
          Jenkinsfile pipeline{run.jenkinsBuildNumber != null ? ` · build #${run.jenkinsBuildNumber}` : ''}
          {run.jenkinsBuildUrl && <a href={run.jenkinsBuildUrl} target="_blank" rel="noreferrer" className="ml-2 underline hover:text-white">Open Jenkins</a>}
        </div>
      )}
      {run.aiTriage && (
        <div className="mb-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">🤖 AI Triage</div>
          <div className="text-xs text-slate-300">{run.aiTriage}</div>
        </div>
      )}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Stages</div>
        {run.stages.map(stage => <StageDetail key={stage.name} stage={stage} />)}
      </div>
    </div>
  )
}

export default function RunsPage() {
  const { data: runs = [], mutate } = useSWR<PipelineRun[]>('/api/runs?limit=100', fetcher, { refreshInterval: 15000 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const run = runs.find(item => item.id === expandedId)
    if (!run || run.executionMode !== 'jenkinsfile' || run.status === 'success' || run.status === 'failed' || run.status === 'cancelled') return
    const poll = () => fetch(`/api/runs/${run.id}/jenkins`).then(() => mutate()).catch(() => {})
    poll()
    const timer = window.setInterval(poll, 5000)
    return () => window.clearInterval(timer)
  }, [expandedId, runs, mutate])

  const filtered = runs.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || r.repoFullName.toLowerCase().includes(q) || r.pipelineName.toLowerCase().includes(q) || r.branch.toLowerCase().includes(q) || r.commit.startsWith(q) || r.author.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-4 max-w-screen-2xl">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search repo, pipeline, branch, commit, author…"
            className="w-full pl-8 pr-4 py-2 text-xs rounded-lg bg-[#0d1117] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {['all', 'success', 'failed', 'running', 'pending'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-[10px] font-bold px-2 py-1 rounded-lg capitalize transition-colors',
                statusFilter === s ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-white border border-slate-800'
              )}
            >{s}</button>
          ))}
        </div>
        <button
          onClick={() => exportCsv(filtered.map(r => ({ repo: r.repoFullName, pipeline: r.pipelineName, branch: r.branch, commit: r.commit, status: r.status, duration: r.durationMs, started: r.startedAt })), 'runs.csv')}
          className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline / Repo</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Branch / Commit</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Author</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map(run => (
                <>
                  <tr
                    key={run.id}
                    onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                    className="hover:bg-slate-800/20 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[run.status] ?? STATUS_ICON.pending}
                        <span className={cn('font-bold px-1.5 py-0.5 rounded border capitalize text-[10px]', STATUS_COLOR[run.status])}>{run.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{run.pipelineName}</div>
                      <div className="text-slate-500 text-[10px]">{run.repoFullName}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-white font-mono">{run.branch}</div>
                      <div className="text-slate-500 font-mono text-[10px]">{run.commit.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-400">{run.author}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-400">{run.durationMs ? duration(run.durationMs) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{timeAgo(run.startedAt)}</td>
                  </tr>
                  {expandedId === run.id && (
                    <tr key={`${run.id}-detail`}>
                      <td colSpan={6} className="px-4 pb-4">
                        <RunDetail run={run} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-600">No runs match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
