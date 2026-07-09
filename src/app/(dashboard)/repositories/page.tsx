'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, X, Loader2, Webhook, CheckCircle2, XCircle, Eye, EyeOff, Save, Pencil } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import type { Repository } from '@/lib/data-store'
import type { AppSettings } from '@/lib/settings-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PROVIDER_COLOR: Record<string, string> = {
  gitea:     'text-emerald-300 bg-emerald-900/30',
  github:    'text-slate-300 bg-slate-700',
  gitlab:    'text-orange-300 bg-orange-900/30',
  bitbucket: 'text-blue-300 bg-blue-900/30',
}
const STATUS_COLOR: Record<string, string> = {
  success:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  failed:    'text-red-400 bg-red-500/10 border-red-500/20',
  running:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

type Provider = 'gitea' | 'github' | 'gitlab' | 'bitbucket'

function CredInput({ label, value, onChange, masked = true, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; masked?: boolean; placeholder?: string
}) {
  const [shown, setShown] = useState(false)
  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 font-mono'
  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-800/60 last:border-0">
      <span className="text-[10px] text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <input
          type={masked && !shown ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? (masked ? '••••••••' : 'https://…')}
          className={inputCls}
        />
        {masked && (
          <button type="button" onClick={() => setShown(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
            {shown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  )
}

function AddRepoModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { data: settings, mutate: mutateSettings } = useSWR<AppSettings>('/api/settings', fetcher)
  const [owner, setOwner] = useState('')
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<Provider>('gitea')
  const [saving, setSaving] = useState(false)
  const [savingCreds, setSavingCreds] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)
  const [error, setError] = useState('')
  const [testState, setTestState] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null)

  // Editable credential state per provider
  const [creds, setCreds] = useState({
    gitea:     { url: '', token: '', webhookSecret: '' },
    github:    { token: '', webhookSecret: '' },
    gitlab:    { url: '', token: '', webhookSecret: '' },
    bitbucket: { username: '', appPassword: '', webhookSecret: '' },
  })

  // Hydrate from settings when loaded
  useEffect(() => {
    if (!settings) return
    setCreds({
      gitea:     { url: settings.giteaUrl ?? '', token: settings.giteaToken ?? '', webhookSecret: settings.giteaWebhookSecret ?? '' },
      github:    { token: settings.githubToken ?? '', webhookSecret: settings.githubWebhookSecret ?? '' },
      gitlab:    { url: settings.gitlabUrl ?? '', token: settings.gitlabToken ?? '', webhookSecret: settings.gitlabWebhookSecret ?? '' },
      bitbucket: { username: settings.bitbucketUsername ?? '', appPassword: settings.bitbucketAppPassword ?? '', webhookSecret: settings.bitbucketWebhookSecret ?? '' },
    })
  }, [settings])

  useEffect(() => { setTestState(null); setCredsSaved(false) }, [provider])

  function setProviderCred<K extends string>(p: Provider, key: K, val: string) {
    setCreds(prev => ({ ...prev, [p]: { ...prev[p], [key]: val } }))
    setCredsSaved(false)
  }

  async function saveCredentials() {
    setSavingCreds(true)
    const patch: Partial<AppSettings> = provider === 'gitea'
      ? { giteaUrl: creds.gitea.url, giteaToken: creds.gitea.token, giteaWebhookSecret: creds.gitea.webhookSecret }
      : provider === 'github'
      ? { githubToken: creds.github.token, githubWebhookSecret: creds.github.webhookSecret }
      : provider === 'gitlab'
      ? { gitlabUrl: creds.gitlab.url, gitlabToken: creds.gitlab.token, gitlabWebhookSecret: creds.gitlab.webhookSecret }
      : { bitbucketUsername: creds.bitbucket.username, bitbucketAppPassword: creds.bitbucket.appPassword, bitbucketWebhookSecret: creds.bitbucket.webhookSecret }
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    mutateSettings()
    setCredsSaved(true)
    setSavingCreds(false)
  }

  const WEBHOOK_PATHS: Record<Provider, string> = {
    gitea:     '/api/webhooks/gitea',
    github:    '/api/webhooks/github',
    gitlab:    '/api/webhooks/gitlab',
    bitbucket: '/api/webhooks/bitbucket',
  }

  const credRows: Record<Provider, React.ReactNode> = {
    gitea: <>
      <CredInput label="URL"             masked={false} value={creds.gitea.url}           onChange={v => setProviderCred('gitea', 'url', v)}           placeholder="https://gitea.example.com" />
      <CredInput label="Token"                          value={creds.gitea.token}         onChange={v => setProviderCred('gitea', 'token', v)} />
      <CredInput label="Webhook Secret"                 value={creds.gitea.webhookSecret} onChange={v => setProviderCred('gitea', 'webhookSecret', v)} />
    </>,
    github: <>
      <CredInput label="PAT"             value={creds.github.token}         onChange={v => setProviderCred('github', 'token', v)}         placeholder="ghp_…" />
      <CredInput label="Webhook Secret"  value={creds.github.webhookSecret} onChange={v => setProviderCred('github', 'webhookSecret', v)} />
    </>,
    gitlab: <>
      <CredInput label="URL"             masked={false} value={creds.gitlab.url}           onChange={v => setProviderCred('gitlab', 'url', v)}           placeholder="https://gitlab.com" />
      <CredInput label="Token"                          value={creds.gitlab.token}         onChange={v => setProviderCred('gitlab', 'token', v)} />
      <CredInput label="Webhook Secret"                 value={creds.gitlab.webhookSecret} onChange={v => setProviderCred('gitlab', 'webhookSecret', v)} />
    </>,
    bitbucket: <>
      <CredInput label="Username"        masked={false} value={creds.bitbucket.username}       onChange={v => setProviderCred('bitbucket', 'username', v)}       placeholder="atlassian-username" />
      <CredInput label="App Password"                   value={creds.bitbucket.appPassword}    onChange={v => setProviderCred('bitbucket', 'appPassword', v)} />
      <CredInput label="Webhook Secret"                 value={creds.bitbucket.webhookSecret}  onChange={v => setProviderCred('bitbucket', 'webhookSecret', v)} />
    </>,
  }

  const isConfigured = provider === 'gitea'     ? !!(creds.gitea.url && creds.gitea.token)
    : provider === 'github'    ? !!creds.github.token
    : provider === 'gitlab'    ? !!creds.gitlab.token
    : !!(creds.bitbucket.username && creds.bitbucket.appPassword)

  async function testConnection() {
    setTestState({ loading: true })
    // Pass current UI creds directly so test works before saving
    const body: Record<string, string> = { provider }
    if (provider === 'gitea')     { body.url = creds.gitea.url; body.token = creds.gitea.token }
    if (provider === 'github')    { body.token = creds.github.token }
    if (provider === 'gitlab')    { body.url = creds.gitlab.url; body.token = creds.gitlab.token }
    if (provider === 'bitbucket') { body.username = creds.bitbucket.username; body.appPassword = creds.bitbucket.appPassword }
    try {
      const res = await fetch('/api/settings/test-git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { success: boolean; message: string }
      setTestState({ loading: false, success: data.success, message: data.message })
    } catch {
      setTestState({ loading: false, success: false, message: 'Network error' })
    }
  }

  async function submit() {
    if (!owner.trim() || !name.trim()) { setError('Owner and repository name are required.'); return }
    setSaving(true)
    const res = await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: owner.trim(), name: name.trim(), provider }),
    })
    setSaving(false)
    if (res.ok) { onSave(); onClose() }
    else { const d = await res.json() as { error?: string }; setError(d.error ?? 'Failed') }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Connect Repository</h2>
            <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          {/* Provider selector */}
          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Provider</label>
            <div className="flex gap-2 flex-wrap">
              {(['gitea', 'github', 'gitlab', 'bitbucket'] as const).map(p => (
                <button key={p} onClick={() => setProvider(p)}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-medium capitalize border transition-colors',
                    provider === p ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600')}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Credentials panel — editable */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-300 capitalize">{provider} credentials</span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded border',
                  isConfigured ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                  {isConfigured ? 'configured' : 'not configured'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveCredentials} disabled={savingCreds}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors disabled:opacity-50',
                    credsSaved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700')}>
                  {savingCreds ? <Loader2 className="w-3 h-3 animate-spin" /> : credsSaved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  {credsSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={testConnection} disabled={testState?.loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700 transition-colors disabled:opacity-50">
                  {testState?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Webhook className="w-3 h-3" />}
                  Test
                </button>
              </div>
            </div>

            {credRows[provider]}

            {testState && !testState.loading && (
              <div className={cn('mt-3 flex items-start gap-2 text-[10px] rounded-lg p-2.5', testState.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                {testState.success ? <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
                {testState.message}
              </div>
            )}
          </div>

          {/* Webhook URL */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] text-slate-500 mb-1.5 font-medium">Set this webhook URL in your {provider} repo settings:</p>
            <p className="text-xs font-mono text-emerald-400/80 break-all">{'<your-domain>'}{WEBHOOK_PATHS[provider]}</p>
            <p className="text-[10px] text-slate-600 mt-1">Content-Type: application/json · Use the webhook secret shown above</p>
          </div>

          {/* Owner + name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Owner / Organisation</label>
              <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="acme"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Repository Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="my-service"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditRepoModal({ repo, onClose, onSave }: { repo: Repository; onClose: () => void; onSave: () => void }) {
  const [description, setDescription] = useState(repo.description ?? '')
  const [defaultBranch, setDefaultBranch] = useState(repo.defaultBranch ?? 'main')
  const [cloneUrl, setCloneUrl] = useState(repo.cloneUrl ?? '')
  const [language, setLanguage] = useState(repo.language ?? '')
  const [isPrivate, setIsPrivate] = useState(repo.private ?? false)
  const [webhookActive, setWebhookActive] = useState(repo.webhookActive ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60'

  const WEBHOOK_PATHS: Record<string, string> = {
    gitea: '/api/webhooks/gitea', github: '/api/webhooks/github',
    gitlab: '/api/webhooks/gitlab', bitbucket: '/api/webhooks/bitbucket',
  }
  const webhookPath = WEBHOOK_PATHS[repo.provider] ?? `/api/webhooks/${repo.provider}`
  const origin = typeof window !== 'undefined' ? window.location.origin : '<your-domain>'

  async function submit() {
    setSaving(true)
    const res = await fetch(`/api/repositories/${repo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, defaultBranch, cloneUrl: cloneUrl || undefined, language, private: isPrivate, webhookActive }),
    })
    setSaving(false)
    if (res.ok) { onSave(); onClose() }
    else { const d = await res.json() as { error?: string }; setError(d.error ?? 'Failed') }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Edit Repository</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-500">{repo.fullName}</span>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded capitalize', PROVIDER_COLOR[repo.provider])}>{repo.provider}</span>
              </div>
            </div>
            <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Default Branch</label>
              <input value={defaultBranch} onChange={e => setDefaultBranch(e.target.value)} placeholder="main" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Language</label>
              <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="TypeScript" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Clone URL</label>
            <input value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} placeholder="http://gitea.example.com/owner/repo.git" className={inputCls} />
          </div>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded border-slate-600 bg-slate-900 accent-emerald-500" />
              <span className="text-xs text-slate-300">Private</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={webhookActive} onChange={e => setWebhookActive(e.target.checked)} className="rounded border-slate-600 bg-slate-900 accent-emerald-500" />
              <span className="text-xs text-slate-300">Webhook active</span>
            </label>
          </div>

          {/* Webhook URL reminder */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1 font-medium flex items-center gap-1">
              <Webhook className="w-3 h-3" /> Webhook URL for this repo&apos;s {repo.provider} settings:
            </p>
            <p className="text-xs font-mono text-emerald-400/80 break-all select-all">{origin}{webhookPath}</p>
            <p className="text-[10px] text-slate-600 mt-1">Content-Type: application/json · Use your {repo.provider} webhook secret</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RepositoriesPage() {
  const { data: repos = [], mutate } = useSWR<Repository[]>('/api/repositories', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editRepo, setEditRepo] = useState<Repository | null>(null)

  async function deleteRepo(id: string) {
    if (!confirm('Remove this repository and all its pipelines?')) return
    await fetch(`/api/repositories/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="space-y-4 max-w-screen-xl">
      {showAdd && <AddRepoModal onClose={() => setShowAdd(false)} onSave={() => mutate()} />}
      {editRepo && <EditRepoModal repo={editRepo} onClose={() => setEditRepo(null)} onSave={() => mutate()} />}

      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" /> Connect Repository
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map(repo => (
          <div key={repo.id} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/60 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{repo.name}</div>
                  <div className="text-[10px] text-slate-500">{repo.owner}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={() => setEditRepo(repo)} className="text-slate-600 hover:text-emerald-400 transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteRepo(repo.id)} className="text-slate-600 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {repo.description && <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{repo.description}</p>}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded capitalize', PROVIDER_COLOR[repo.provider])}>{repo.provider}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{repo.language}</span>
              {repo.private && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Private</span>}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <div className="flex items-center gap-1">
                <Webhook className="w-3 h-3" />
                {repo.webhookActive
                  ? <span className="text-emerald-400">Webhook active</span>
                  : <span className="text-amber-400/80">Push to activate <span className="text-slate-600">→</span></span>}
              </div>
              {repo.lastRunStatus && (
                <span className={cn('ml-auto font-bold px-1.5 py-0.5 rounded border capitalize', STATUS_COLOR[repo.lastRunStatus] ?? 'text-slate-500 bg-slate-800 border-slate-700')}>{repo.lastRunStatus}</span>
              )}
            </div>
            {repo.lastRunAt && (
              <div className="text-[10px] text-slate-600 mt-2">Last run {timeAgo(repo.lastRunAt)}</div>
            )}
          </div>
        ))}
        {repos.length === 0 && (
          <div className="col-span-full bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600">
            No repositories connected. Click <strong className="text-slate-400">Connect Repository</strong> to add one.
          </div>
        )}
      </div>
    </div>
  )
}
