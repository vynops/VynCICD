'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { GitBranch, Play, ToggleLeft, ToggleRight, Plus, ChevronRight, X, Trash2, Pencil } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import type { Pipeline, Repository, PipelineStage } from '@/lib/data-store'
import type { Environment } from '@/lib/data-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

export default function PipelinesPage() {
  const { data: pipelines = [], mutate } = useSWR<Pipeline[]>('/api/pipelines', fetcher, { refreshInterval: 15000 })
  const { data: repos = [] } = useSWR<Repository[]>('/api/repositories', fetcher)
  const { data: environments = [] } = useSWR<Environment[]>('/api/environments', fetcher)

  // Unique cluster names from environment records
  const clusterNames = Array.from(new Set(
    environments
      .map(e => e.clusterName || (e.variables as Record<string, string> | undefined)?.['CLUSTER'])
      .filter(Boolean) as string[]
  ))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = pipelines.find(p => p.id === selectedId)

  // New pipeline modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', repoId: '', branch: 'main' })
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
    setForm({ name: '', repoId: repos[0]?.id ?? '', branch: 'main' })
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
    if (stages.length === 0) { setError('Add at least one stage.'); return }
    for (const s of stages) {
      if (!s.name.trim()) { setError('All stages must have a name.'); return }
    }
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
          stages,
          environments: stages.filter(s => s.environment).map(s => s.environment!),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to create pipeline'); return }
      setShowModal(false)
      mutate()
    } finally {
      setSaving(false)
    }
  }

  function openEditModal(p: Pipeline) {
    setEditingId(p.id)
    setForm({ name: p.name, repoId: p.repoId, branch: p.branch })
    setStages(p.stages.map(s => ({ ...s })))
    setError('')
    setShowModal(true)
  }

  async function savePipeline() {
    if (!form.name.trim() || !form.repoId || !form.branch.trim()) {
      setError('Name, repository and branch are required.')
      return
    }
    if (stages.length === 0) { setError('Add at least one stage.'); return }
    for (const s of stages) {
      if (!s.name.trim()) { setError('All stages must have a name.'); return }
    }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/pipelines/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          repoId: form.repoId,
          branch: form.branch.trim(),
          stages,
          environments: stages.filter(s => s.environment).map(s => s.environment!),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to save'); return }
      setShowModal(false)
      setEditingId(null)
      mutate()
    } finally {
      setSaving(false)
    }
  }

  async function deletePipeline(id: string, name: string) {
    if (!confirm(`Delete pipeline "${name}"? This cannot be undone.`)) return
    await fetch(`/api/pipelines/${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    mutate()
  }

  async function toggleEnabled(id: string, current: boolean) {
    await fetch(`/api/pipelines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !current }),
    })
    mutate()
  }

  async function triggerManual(id: string) {
    await fetch(`/api/pipelines/${id}/trigger`, { method: 'POST' })
    mutate()
  }

  return (
    <div className="space-y-4 max-w-screen-2xl">
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
          {pipelines.map(p => (
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
                    className="text-slate-500 hover:text-emerald-400 transition-colors" title="Trigger manual run">
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
          {pipelines.length === 0 && (
            <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-8 text-center text-sm text-slate-600">
              No pipelines yet. Add a repository to auto-detect pipelines.
            </div>
          )}
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
              <div className="mb-5">
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
              </div>

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

              {/* Stages */}
              <div>
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
              </div>

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
