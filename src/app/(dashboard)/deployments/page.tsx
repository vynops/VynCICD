'use client'

import useSWR from 'swr'
import { Fragment, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Rocket, RotateCcw, CheckCircle, XCircle, AlertTriangle, Filter, Download } from 'lucide-react'
import { timeAgo, duration, cn, exportCsv } from '@/lib/utils'
import { fetchList } from '@/lib/fetch-json'
import type { Deployment } from '@/lib/data-store'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  healthy:     { label: 'Healthy',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  running:     { label: 'Running',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  pending:     { label: 'Pending',     color: 'text-slate-400 bg-slate-500/10 border-slate-700' },
  degraded:    { label: 'Degraded',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  failed:      { label: 'Failed',      color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  rolled_back: { label: 'Rolled Back', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
}

const ENV_COLOR: Record<string, string> = {
  production: 'text-red-400',
  staging: 'text-yellow-400',
  development: 'text-blue-400',
  preview: 'text-violet-400',
}

export function deploymentRunHref(deployment: Deployment) {
  return `/runs?${new URLSearchParams({ runId: deployment.runId }).toString()}`
}

export function deploymentListApiUrl(focusedId: string | null, fromFilter: string | null) {
  return `/api/deployments?limit=500${focusedId ? `&deploymentId=${encodeURIComponent(focusedId)}` : ''}${fromFilter ? `&from=${encodeURIComponent(fromFilter)}` : ''}`
}

export function deploymentPageFilters(search: { get(name: string): string | null }) {
  return {
    deploymentId: search.get('deploymentId'),
    from: search.get('from'),
    environment: search.get('environment'),
  }
}

function DeploymentsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { deploymentId: queryDeploymentId, from: queryFrom, environment: queryEnvironment } = deploymentPageFilters(searchParams)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [envFilter, setEnvFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fromFilter, setFromFilter] = useState<string | null>(null)
  const { data: deployments, error: deploymentsError, mutate } = useSWR<Deployment[]>(
    deploymentListApiUrl(focusedId, fromFilter),
    fetchList,
    { refreshInterval: 15000 }
  )

  useEffect(() => {
    setFocusedId(queryDeploymentId)
    setExpandedId(queryDeploymentId)
    setEnvFilter(queryEnvironment ?? 'all')
    setFromFilter(queryFrom)
  }, [queryDeploymentId, queryFrom, queryEnvironment])

  const envs = ['all', ...Array.from(new Set((deployments ?? []).map(d => d.environment)))]
  const filtered = (deployments ?? []).filter(d => envFilter === 'all' || d.environment === envFilter)

  return (
    <div className="space-y-4 max-w-screen-2xl">
      {deploymentsError && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{deploymentsError instanceof Error ? deploymentsError.message : 'Deployments could not be loaded. Refresh to try again.'}</div>}
      {(focusedId || fromFilter) && <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
        {focusedId ? `Focused deployment ${focusedId}.` : `Deployments from ${fromFilter}.`}
        <button type="button" onClick={() => router.replace('/deployments')} className="text-emerald-400 hover:text-emerald-300">Show all deployments</button>
      </div>}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {envs.map(e => (
            <button key={e}
              onClick={() => setEnvFilter(e)}
              className={cn(
                'text-[10px] font-bold px-2.5 py-1.5 rounded-lg capitalize transition-colors border',
                envFilter === e ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-800 hover:text-white'
              )}>{e}</button>
          ))}
        </div>
        <button
          onClick={() => exportCsv(filtered.map(d => ({ repo: d.repoFullName, env: d.environment, version: d.version, status: d.status, deployedBy: d.author, deployedAt: d.deployedAt })), 'deployments.csv')}
          className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="text-[10px] text-slate-600">Showing up to 500 retained deployment records.</div>
      <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Repository</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Environment</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Version</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Deployed By</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Health Gate</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">When</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map(dep => {
                const s = STATUS_MAP[dep.status] ?? STATUS_MAP.pending
                return (
                  <Fragment key={dep.id}>
                    <tr key={dep.id} onClick={() => setExpandedId(expandedId === dep.id ? null : dep.id)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', s.color)}>{s.label}</span>
                        {dep.rolledBack && <span className="ml-1.5 text-[10px] text-orange-400 font-bold">↺ Rolled Back</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{dep.repoFullName}</div>
                        <div className="text-[10px] text-slate-500">{dep.pipelineName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('font-bold capitalize', ENV_COLOR[dep.environment] ?? 'text-slate-400')}>{dep.environment}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell font-mono text-white">{dep.version}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400">{dep.author}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {dep.healthGatePassed
                          ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Passed</span>
                          : <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> Failed</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{timeAgo(dep.deployedAt)}</td>
                      <td className="px-4 py-3">
                        {dep.status !== 'rolled_back' && dep.status !== 'running' && (
                          <button
                            type="button"
                            disabled
                            className="flex items-center gap-1 text-[10px] text-slate-600 cursor-not-allowed"
                            title="Rollback execution is not configured"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Rollback unavailable</span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === dep.id && (
                      <tr key={`${dep.id}-detail`}>
                        <td colSpan={8} className="px-4 pb-4">
                          <div className="bg-slate-900/40 rounded-xl p-4 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {[
                              { label: 'Commit', value: dep.commit.slice(0, 8) },
                              { label: 'Image', value: dep.image ?? '—' },
                              { label: 'K8s Namespace', value: dep.k8sNamespace ?? '—' },
                              { label: 'Duration', value: dep.durationMs ? duration(dep.durationMs) : '—' },
                            ].map(item => (
                              <div key={item.label}>
                                <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
                                <div className="font-mono text-white truncate">{item.value}</div>
                              </div>
                            ))}
                            <div>
                              <div className="text-[10px] text-slate-500 mb-0.5">Run</div>
                              <a href={deploymentRunHref(dep)} className="font-mono text-emerald-400 hover:text-emerald-300 underline truncate">{dep.runId}</a>
                            </div>
                            {dep.rollbackReason && (
                              <div className="col-span-full">
                                <div className="text-[10px] text-slate-500 mb-0.5">Rollback Reason</div>
                                <div className="text-orange-400">{dep.rollbackReason}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && deployments && !deploymentsError && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-600">{focusedId ? 'Deployment not found.' : 'No deployments found.'}</td></tr>
              )}
              {!deployments && !deploymentsError && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-600">Loading deployments…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function DeploymentsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-600">Loading deployments…</div>}><DeploymentsPageContent /></Suspense>
}
