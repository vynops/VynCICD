'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Layers, Lock, Plus, Trash2, X, Loader2, ExternalLink } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import type { Environment, EnvType } from '@/lib/data-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TYPE_COLOR: Record<EnvType, string> = {
  production:  'text-red-400 bg-red-500/10 border-red-500/20',
  staging:     'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  development: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  preview:     'text-violet-400 bg-violet-500/10 border-violet-500/20',
  custom:      'text-slate-400 bg-slate-500/10 border-slate-700/30',
}

function EnvModal({ env, onClose, onSave }: { env?: Environment; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(env?.name ?? '')
  const [type, setType] = useState<EnvType>(env?.type ?? 'development')
  const [url, setUrl] = useState(env?.url ?? '')
  const [clusterName, setClusterName] = useState(env?.clusterName ?? '')
  const [requiresApproval, setRequiresApproval] = useState(env?.requiresApproval ?? false)
  const [approvers, setApprovers] = useState(env?.approvers?.join(', ') ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const body = {
      name, type, url: url || undefined,
      clusterName: clusterName || undefined,
      requiresApproval, approvers: approvers.split(',').map(s => s.trim()).filter(Boolean),
      protected: type === 'production' || type === 'staging',
    }
    if (env) {
      await fetch(`/api/environments/${env.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/environments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">{env ? 'Edit Environment' : 'New Environment'}</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="production" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as EnvType)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                {(['development', 'staging', 'production', 'preview', 'custom'] as EnvType[]).map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">URL (optional)</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-app.example.com" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">
              Cluster Name
              <span className="ml-1.5 text-slate-600 font-mono">→ $DEPLOY_CLUSTER</span>
            </label>
            <input value={clusterName} onChange={e => setClusterName(e.target.value)} placeholder="k3d-cicd" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30" />
            <span className="text-xs text-slate-300">Require manual approval before deploy</span>
          </label>
          {requiresApproval && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Approver emails (comma-separated)</label>
              <input value={approvers} onChange={e => setApprovers(e.target.value)} placeholder="lead@example.com, ops@example.com" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EnvironmentsPage() {
  const { data: envs = [], mutate } = useSWR<Environment[]>('/api/environments', fetcher)
  const [editEnv, setEditEnv] = useState<Environment | null>(null)
  const [showNew, setShowNew] = useState(false)

  async function deleteEnv(id: string, name: string) {
    if (!confirm(`Delete environment "${name}"?`)) return
    await fetch(`/api/environments/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="space-y-4 max-w-screen-xl">
      {(showNew || editEnv) && (
        <EnvModal env={editEnv ?? undefined} onClose={() => { setShowNew(false); setEditEnv(null) }} onSave={() => mutate()} />
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Environment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {envs.map(env => (
          <div key={env.id} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/60 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white capitalize">{env.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', TYPE_COLOR[env.type])}>{env.type}</span>
                <button onClick={() => setEditEnv(env)} className="text-slate-500 hover:text-white transition-colors text-[10px]">Edit</button>
                <button onClick={() => deleteEnv(env.id, env.name)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="space-y-2 text-[11px]">
              {env.url && (
                <a href={env.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors">
                  <ExternalLink className="w-3 h-3" /> {env.url}
                </a>
              )}
              {env.clusterName && (
                <div className="text-slate-500">Cluster: <span className="text-white font-mono">{env.clusterName}</span> <span className="text-slate-700">($DEPLOY_CLUSTER)</span></div>
              )}
              {env.requiresApproval && (
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Lock className="w-3 h-3" /> Requires approval
                </div>
              )}
              {env.approvers.length > 0 && (
                <div className="text-slate-500">Approvers: <span className="text-white">{env.approvers.join(', ')}</span></div>
              )}
              <div className="text-slate-600">Created {timeAgo(env.createdAt)}</div>
            </div>
          </div>
        ))}
        {envs.length === 0 && (
          <div className="col-span-full bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600">
            No environments configured.
          </div>
        )}
      </div>
    </div>
  )
}
