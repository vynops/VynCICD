'use client'

import useSWR from 'swr'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitBranch, Play, ToggleLeft, ToggleRight, Plus, ChevronRight, X, Trash2, Pencil } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import { fetchList } from '@/lib/fetch-json'
import type { Pipeline, Repository, PipelineStage } from '@/lib/data-store'
import type { Environment } from '@/lib/data-store'

const STAGE_TYPES = ['run', 'test', 'build', 'scan', 'deploy', 'notify'] as const

const STAGE_DEFAULTS: Record<string, Partial<PipelineStage>> = {
  lint:       { name: 'lint',       type: 'run',    run: 'echo "[lint] go vet..." && docker run --rm -v "$(pwd)":/app -w /app golang:1.22-alpine go vet ./...' },
  test:       { name: 'test',       type: 'test',   run: 'echo "[test] go test..." && docker run --rm -v "$(pwd)":/app -w /app golang:1.22-alpine go test ./... -v' },
  build:      { name: 'build',      type: 'build',  run: 'echo "[build] building ${IMAGE}" && docker build -t "${IMAGE}" . && docker push "${IMAGE}" && echo "Image pushed: ${IMAGE}"' },
  scan:       { name: 'scan',       type: 'scan',   image: '' },
  'deploy-dev': { name: 'deploy-dev', type: 'deploy', environment: 'dev', manifest: '' },
}

const BLANK_STAGE = (): PipelineStage => ({ name: '', type: 'run', run: '' })

const STATUS_COLOR: Record<string, string> = {
  success:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:    'text-red-400 bg-red-500/10 border-red-500/20',
  running:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pending:   'text-slate-400 bg-slate-500/10 border-slate-700/30',
  cancelled: 'text-slate-500 bg-slate-800/40 border-slate-700/30',
}

const TRIGGER_LABEL: Record<string, string> = {
  push: 'Push', pull_request: 'PR', tag: 'Tag', schedule: 'Scheduled', manual: 'Manual',
}

export function pipelineRunHref(pipelineId: string, runId?: string) {
  const params = new URLSearchParams({ pipelineId })
  if (runId) params.set('runId', runId)
  return `/runs?${params.toString()}`
}

export function pipelinePageFilters(search: { get(name: string): string | null }) {
  return { repoId: search.get('repoId'), pipelineId: search.get('pipelineId') }
}

function PipelinesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { repoId: queryRepoId, pipelineId: queryPipelineId } = pipelinePageFilters(searchParams)
  const { data: pipelines, error: pipelinesError, mutate } = useSWR<Pipeline[]>('/api/pipelines', fetchList, { refreshInterval: 15000 })
  const { data: repos = [], error: reposError } = useSWR<Repository[]>('/api/repositories', fetchList)
  const { data: environments = [], error: environmentsError } = useSWR<Environment[]>('/api/environments', fetchList)

  // Unique cluster names from environment records
  const clusterNames = Array.from(new Set(
    environments
      .map(e => e.clusterName || (e.variables as Record<string, string> | undefined)?.['CLUSTER'])
      .filter(Boolean) as string[]
  ))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [repositoryFilter, setRepositoryFilter] = useState<string | null>(null)
  const [pendingRepoSelection, setPendingRepoSelection] = useState<string | null>(null)
  const visiblePipelines = (pipelines ?? []).filter(p => !repositoryFilter || p.repoId === repositoryFilter)
  const selected = visiblePipelines.find(p => p.id === selectedId)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [lastTriggered, setLastTriggered] = useState<{ pipelineId: string; runId: string; status: 'started' | 'failed' } | null>(null)

  useEffect(() => {
    setRepositoryFilter(queryRepoId)
    setSelectedId(queryPipelineId)
    setPendingRepoSelection(queryRepoId && !queryPipelineId ? queryRepoId : null)
  }, [queryRepoId, queryPipelineId])

  useEffect(() => {
    if (!pendingRepoSelection || !pipelines) return
    setSelectedId(pipelines.find(p => p.repoId === pendingRepoSelection)?.id ?? null)
    setPendingRepoSelection(null)
  }, [pipelines, pendingRepoSelection])

  // New pipeline modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', repoId: '', branch: 'main', executionMode: 'native' as 'native' | 'jenkinsfile' | 'argocd', jenkinsJob: '', jenkinsfilePath: 'Jenkinsfile', jenkinsParameters: '', argoCdApplication: '', argoCdProject: 'vyncicd-test' })
  const [stages, setStages] = useState<PipelineStage[]>([
    { ...STAGE_DEFAULTS.lint } as PipelineStage,
    { ...STAGE_DEFAULTS.test } as PipelineStage,
    { ...STAGE_DEFAULTS.build } as PipelineStage,
    { ...STAGE_DEFAULTS.scan } as PipelineStage,
    { ...STAGE_DEFAULTS['deploy-dev'] } as PipelineStage,
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    setEditingId(null)
    setForm({ name: '', repoId: repos[0]?.id ?? '', branch: 'main', executionMode: 'native', jenkinsJob: '', jenkinsfilePath: 'Jenkinsfile', jenkinsParameters: '', argoCdApplication: '', argoCdProject: 'vyncicd-test' })
    setStages([
      { ...STAGE_DEFAULTS.lint } as PipelineStage,
      { ...STAGE_DEFAULTS.test } as PipelineStage,
      { ...STAGE_DEFAULTS.build } as PipelineStage,
      { ...STAGE_DEFAULTS.scan } as PipelineStage,
      { ...STAGE_DEFAULTS['deploy-dev'] } as PipelineStage,
    ])
    setError('')
    setShowModal(true)
  }

  function updateStage(i: number, patch: Partial<PipelineStage>) {
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  function addStage() {
    setStages(prev => [...prev, BLANK_STAGE()])
  }

  function removeStage(i: number) {
    setStages(prev => prev.filter((_, idx) => idx !== i))
  }

  async function createPipeline() {
    if (!form.name.trim() || !form.repoId || !form.branch.trim()) {
      setError('Name, repository and branch are required.')
      return
    }
    if (form.executionMode === 'native' && stages.length === 0) { setError('Add at least one stage.'); return }
    if (form.executionMode === 'native') for (const s of stages) {
      if (!s.name.trim()) { setError('All stages must have a name.'); return }
    }
    if (form.executionMode === 'jenkinsfile' && !form.jenkinsJob.trim()) { setError('Jenkins job is required.'); return }
    if (form.executionMode === 'argocd' && !form.argoCdApplication.trim()) { setError('Argo CD application is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          repoId: form.repoId,
          branch: form.branch.trim(),
          triggerOn: ['push'],
          executionMode: form.executionMode,
          jenkinsJob: form.executionMode === 'jenkinsfile' ? form.jenkinsJob.trim() : undefined,
          jenkinsfilePath: form.executionMode === 'jenkinsfile' ? form.jenkinsfilePath.trim() || 'Jenkinsfile' : undefined,
          jenkinsParameters: form.executionMode === 'jenkinsfile' ? Object.fromEntries(form.jenkinsParameters.split('\n').map(line => line.split('=').map(v => v.trim())).filter(pair => pair.length === 2 && pair[0])) : undefined,
          stages: form.executionMode === 'native' ? stages : [],
          argoCdApplication: form.executionMode === 'argocd' ? form.argoCdApplication.trim() : undefined,
          argoCdProject: form.executionMode === 'argocd' ? form.argoCdProject.trim() : undefined,
          environments: stages.filter(s => s.environment).map(s => s.environment!),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to create pipeline'); return }
      setShowModal(false)
      mutate()
    } catch {
      setError('Network error while creating pipeline.')
    } finally {
      setSaving(false)
    }
  }

  function openEditModal(p: Pipeline) {
    setEditingId(p.id)
    setForm({ name: p.name, repoId: p.repoId, branch: p.branch, executionMode: p.executionMode ?? 'native', jenkinsJob: p.jenkinsJob ?? '', jenkinsfilePath: p.jenkinsfilePath ?? 'Jenkinsfile', jenkinsParameters: Object.entries(p.jenkinsParameters ?? {}).map(([key, value]) => `${key}=${value}`).join('\n'), argoCdApplication: p.argoCdApplication ?? '', argoCdProject: p.argoCdProject ?? 'vyncicd-test' })
    setStages(p.stages.map(s => ({ ...s })))
    setError('')
    setShowModal(true)
  }

  async function savePipeline() {
    if (!form.name.trim() || !form.repoId || !form.branch.trim()) {
      setError('Name, repository and branch are required.')
      return
    }
    if (form.executionMode === 'native' && stages.length === 0) { setError('Add at least one stage.'); return }
    if (form.executionMode === 'native') for (const s of stages) {
      if (!s.name.trim()) { setError('All stages must have a name.'); return }
    }
    if (form.executionMode === 'jenkinsfile' && !form.jenkinsJob.trim()) { setError('Jenkins job is required.'); return }
    if (form.executionMode === 'argocd' && !form.argoCdApplication.trim()) { setError('Argo CD application is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/pipelines/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          repoId: form.repoId,
          branch: form.branch.trim(),
          executionMode: form.executionMode,
          jenkinsJob: form.executionMode === 'jenkinsfile' ? form.jenkinsJob.trim() : undefined,
          jenkinsfilePath: form.executionMode === 'jenkinsfile' ? form.jenkinsfilePath.trim() || 'Jenkinsfile' : undefined,
          jenkinsParameters: form.executionMode === 'jenkinsfile' ? Object.fromEntries(form.jenkinsParameters.split('\n').map(line => line.split('=').map(v => v.trim())).filter(pair => pair.length === 2 && pair[0])) : undefined,
          stages: form.executionMode === 'native' ? stages : [],
          argoCdApplication: form.executionMode === 'argocd' ? form.argoCdApplication.trim() : undefined,
          argoCdProject: form.executionMode === 'argocd' ? form.argoCdProject.trim() : undefined,
          environments: stages.filter(s => s.environment).map(s => s.environment!),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to save'); return }
      setShowModal(false)
      setEditingId(null)
      mutate()
    } catch {
      setError('Network error while saving pipeline.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePipeline(id: string, name: string) {
    if (!confirm(`Delete pipeline "${name}"? This cannot be undone.`)) return
    setActionError('')
    try {
      const response = await fetch(`/api/pipelines/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      if (selectedId === id) setSelectedId(null)
      await mutate().catch(() => undefined)
    } catch {
      setActionError('Pipeline could not be deleted. Refresh and try again.')
    }
  }

  async function toggleEnabled(id: string, current: boolean) {
    setActionError('')
    try {
      const response = await fetch(`/api/pipelines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      await mutate().catch(() => undefined)
    } catch {
      setActionError(`Pipeline could not be ${current ? 'disabled' : 'enabled'}. Refresh and try again.`)
    }
  }

  async function triggerManual(id: string) {
    setTriggeringId(id)
    setActionError('')
    setLastTriggered(null)
    try {
      const response = await fetch(`/api/pipelines/${id}/trigger`, { method: 'POST' })
      const result = await response.json() as { runId?: string; error?: string }
      await mutate().catch(() => undefined)
      if (!response.ok || !result.runId) {
        setActionError(`${result.error ?? 'Pipeline run could not be started.'}${result.runId ? ` Run ${result.runId} was recorded; check its status.` : ''}`)
        if (result.runId) setLastTriggered({ pipelineId: id, runId: result.runId, status: 'failed' })
      } else {
        setLastTriggered({ pipelineId: id, runId: result.runId, status: 'started' })
      }
    } catch {
      setActionError('Network error while starting the pipeline run.')
    } finally {
      setTriggeringId(null)
    }
  }

  return (
    <div className="space-y-4 max-w-screen-2xl">
      {pipelinesError && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">Pipelines could not be loaded. Refresh to try again.</div>}
      {reposError && <div role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">Repositories could not be loaded; pipeline creation may be unavailable.</div>}
      {environmentsError && <div role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">Environments could not be loaded; cluster choices may be incomplete.</div>}
      {actionError && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{actionError}</div>}
      {lastTriggered && <div role="status" className={cn('rounded-lg border p-3 text-xs', lastTriggered.status === 'started' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-300')}>
        {lastTriggered.status === 'started' ? 'Run started.' : 'Run was recorded but failed to start.'} <a className="underline" href={pipelineRunHref(lastTriggered.pipelineId, lastTriggered.runId)}>View run details</a>
      </div>}
      {repositoryFilter && <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
        Showing pipelines for {repos.find(repo => repo.id === repositoryFilter)?.fullName ?? 'the selected repository'}.
        <button type="button" onClick={() => router.replace('/pipelines')} className="text-emerald-400 hover:text-emerald-300">Clear filter</button>
      </div>}
      <div className="flex justify-end">
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* List */}
        <div className="xl:col-span-1 space-y-2">
          {visiblePipelines.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
              className={cn(
                'bg-[#0d1117] border rounded-xl p-4 cursor-pointer transition-all',
                selectedId === p.id ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-800/60 hover:border-slate-700/60'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                </div>
                <div className={cn('flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', p.lastRunStatus ? STATUS_COLOR[p.lastRunStatus] : STATUS_COLOR.pending)}>
                  {p.lastRunStatus ?? 'no runs'}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mb-3">{p.repoFullName} · {p.branch}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {p.triggerOn.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">{TRIGGER_LABEL[t] ?? t}</span>
                ))}
                {p.schedule && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">⏰ {p.schedule}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-slate-600">{p.lastRunAt ? `Last run ${timeAgo(p.lastRunAt)}` : 'Never run'}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); triggerManual(p.id) }}
                    disabled={!p.enabled || triggeringId === p.id}
                    className="text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title={!p.enabled ? 'Enable this pipeline before triggering a run' : triggeringId === p.id ? 'Starting run…' : 'Trigger manual run'}>
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openEditModal(p) }}
                    className="text-slate-500 hover:text-blue-400 transition-colors" title="Edit pipeline">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); toggleEnabled(p.id, p.enabled) }}
                    className={cn('transition-colors', p.enabled ? 'text-emerald-400 hover:text-slate-400' : 'text-slate-600 hover:text-emerald-400')}
                    title={p.enabled ? 'Disable' : 'Enable'}
                  >
                    {p.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deletePipeline(p.id, p.name) }}
                    className="text-slate-600 hover:text-red-400 transition-colors" title="Delete pipeline">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pipelines && visiblePipelines.length === 0 && !pipelinesError && (
            <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-8 text-center text-sm text-slate-600">
              {repositoryFilter ? 'No pipelines are configured for this repository.' : 'No pipelines yet. Add a repository to create one.'}
            </div>
          )}
          {!pipelines && !pipelinesError && <div className="p-8 text-center text-sm text-slate-600">Loading pipelines…</div>}
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2">
          {selected ? (
            <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{selected.name}</div>
                  <div className="text-[11px] text-slate-500">{selected.repoFullName} · {selected.branch}</div>
                </div>
                <div className={cn('ml-auto text-[10px] font-bold px-2 py-1 rounded border capitalize', selected.enabled ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-800 border-slate-700')}>
                  {selected.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              {/* Stages */}
              {selected.executionMode !== 'jenkinsfile' && <div className="mb-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Stages</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {selected.stages.map((stage, i) => (
                    <div key={stage.name} className="flex items-center gap-1">
                      <div className="bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs">
                        <div className="font-medium text-white">{stage.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{stage.type}</div>
                        {stage.environment && <div className="text-[10px] text-emerald-400">→ {stage.environment}</div>}
                        {stage.clusterName && <div className="text-[10px] text-cyan-400">⎈ {stage.clusterName}</div>}
                      </div>
                      {i < selected.stages.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                    </div>
                  ))}
                </div>
              </div>}
              {selected.executionMode === 'jenkinsfile' && (
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3"><div className="text-[10px] text-slate-500 mb-1">Execution</div><div className="text-xs text-white">Jenkinsfile via Jenkins</div></div>
                  <div className="bg-slate-900/50 rounded-lg p-3"><div className="text-[10px] text-slate-500 mb-1">Jenkins job</div><div className="text-xs text-white font-mono truncate">{selected.jenkinsJob}</div></div>
                  <div className="bg-slate-900/50 rounded-lg p-3"><div className="text-[10px] text-slate-500 mb-1">Jenkinsfile</div><div className="text-xs text-white font-mono truncate">{selected.jenkinsfilePath ?? 'Jenkinsfile'}</div></div>
                </div>
              )}

              {/* Config */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Trigger on', value: selected.triggerOn.map(t => TRIGGER_LABEL[t] ?? t).join(', ') },
                  { label: 'Environments', value: selected.environments.join(', ') || 'None' },
                  { label: 'Last run', value: selected.lastRunAt ? timeAgo(selected.lastRunAt) : 'Never' },
                  { label: 'Schedule', value: selected.schedule ?? 'Not scheduled' },
                  { label: 'Created', value: timeAgo(selected.createdAt) },
                  { label: 'Updated', value: timeAgo(selected.updatedAt) },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                    <div className="text-xs text-white font-medium truncate">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <a href={pipelineRunHref(selected.id, selected.lastRunId)} className="text-emerald-400 hover:text-emerald-300 underline">
                  {selected.lastRunId ? 'View latest run' : 'View run history'}
                </a>
                {selected.executionMode === 'argocd' && selected.argoCdApplication && <span className="text-slate-500">Argo CD sync occurs when a run is triggered.</span>}
              </div>
            </div>
          ) : (
            <div className="bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-12 text-center">
              <GitBranch className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Select a pipeline to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* New Pipeline Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0d1117] border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="text-sm font-bold text-white">{editingId ? 'Edit Pipeline' : 'New Pipeline'}</div>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pipeline name *</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    placeholder="bye-service CI"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Repository *</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={form.repoId}
                    onChange={e => setForm(f => ({ ...f, repoId: e.target.value }))}
                  >
                    <option value="">— select —</option>
                    {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Branch *</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    placeholder="main"
                    value={form.branch}
                    onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] text-slate-400">Execution mode *</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={form.executionMode}
                  onChange={e => setForm(f => ({ ...f, executionMode: e.target.value as 'native' | 'jenkinsfile' | 'argocd' }))}
                >
                  <option value="native">Native VynCICD stages</option>
                  <option value="jenkinsfile">Jenkinsfile via Jenkins</option>
                  <option value="argocd">Argo CD GitOps deployment</option>
                </select>
                {form.executionMode === 'jenkinsfile' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" placeholder="Jenkins job, e.g. team/api-build" value={form.jenkinsJob} onChange={e => setForm(f => ({ ...f, jenkinsJob: e.target.value }))} />
                    <input className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" placeholder="Jenkinsfile path" value={form.jenkinsfilePath} onChange={e => setForm(f => ({ ...f, jenkinsfilePath: e.target.value }))} />
                    <textarea className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" rows={3} placeholder="Optional parameters, one KEY=VALUE per line" value={form.jenkinsParameters} onChange={e => setForm(f => ({ ...f, jenkinsParameters: e.target.value }))} />
                  </div>
                )}
                {form.executionMode === 'argocd' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" placeholder="Argo CD application, e.g. argocd-nginx-test" value={form.argoCdApplication} onChange={e => setForm(f => ({ ...f, argoCdApplication: e.target.value }))} />
                    <input className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" placeholder="Argo CD project" value={form.argoCdProject} onChange={e => setForm(f => ({ ...f, argoCdProject: e.target.value }))} />
                  </div>
                )}
              </div>

              {/* Stages */}
              {form.executionMode === 'native' && <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stages</span>
                  <button onClick={addStage} className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add stage
                  </button>
                </div>
                <div className="space-y-2">
                  {stages.map((stage, i) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          placeholder="stage name"
                          value={stage.name}
                          onChange={e => updateStage(i, { name: e.target.value })}
                        />
                        <select
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                          value={stage.type}
                          onChange={e => updateStage(i, { type: e.target.value as PipelineStage['type'] })}
                        >
                          {STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => removeStage(i)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>

                      {(stage.type === 'run' || stage.type === 'test' || stage.type === 'build') && (
                        <textarea
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                          rows={2}
                          placeholder="shell command"
                          value={stage.run ?? ''}
                          onChange={e => updateStage(i, { run: e.target.value })}
                        />
                      )}

                      {stage.type === 'scan' && (
                        <input
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          placeholder="image (leave blank to use ${IMAGE})"
                          value={stage.image ?? ''}
                          onChange={e => updateStage(i, { image: e.target.value })}
                        />
                      )}

                      {stage.type === 'deploy' && (
                        <div className="space-y-2">
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                            placeholder="environment (e.g. staging)"
                            value={stage.environment ?? ''}
                            onChange={e => updateStage(i, { environment: e.target.value })}
                          />
                          <select
                            className="w-full bg-slate-800 border border-emerald-700/50 rounded-lg px-2 py-1 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                            value={stage.clusterName ?? ''}
                            onChange={e => updateStage(i, { clusterName: e.target.value || undefined })}
                          >
                            <option value="">— cluster (uses environment default) —</option>
                            {clusterNames.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                            rows={4}
                            placeholder="Kubernetes manifest YAML"
                            value={stage.manifest ?? ''}
                            onChange={e => updateStage(i, { manifest: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>}

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-800">
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={editingId ? savePipeline : createPipeline}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PipelinesPage() {
  return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-600">Loading pipelines…</div>}><PipelinesPageContent /></Suspense>
}
