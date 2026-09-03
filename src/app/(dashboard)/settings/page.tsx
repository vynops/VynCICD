'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Save, Loader2, Server, Shield, Bell, Bot, BarChart2, Settings2, Activity, Eye, EyeOff, CheckCircle2, XCircle, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppSettings } from '@/lib/settings-store'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const CONFIGURED_MASK = '***configured***'

const TABS = [
  { id: 'k8s',        label: 'Kubernetes',      icon: Server },
  { id: 'pipeline',   label: 'Pipeline',        icon: Settings2 },
  { id: 'security',   label: 'Security Scans',  icon: Shield },
  { id: 'alerts',     label: 'Notifications',   icon: Bell },
  { id: 'ai',         label: 'AI Copilot',      icon: Bot },
  { id: 'dora',       label: 'DORA Targets',    icon: BarChart2 },
  { id: 'usage',      label: 'Token Usage',     icon: Activity },
]

const AI_PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq (Recommended)',
    keyLabel: 'Groq API Key',
    keyPlaceholder: 'gsk_...',
    defaultModel: 'openai/gpt-oss-120b',
    models: [
      { value: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
      { value: 'openai/gpt-oss-20b', label: 'GPT OSS 20B (Fast)' },
      { value: 'groq/compound', label: 'Groq Compound' },
      { value: 'groq/compound-mini', label: 'Groq Compound Mini' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-...',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyLabel: 'Claude API Key',
    keyPlaceholder: 'sk-ant-...',
    defaultModel: 'claude-3-5-sonnet-latest',
    models: [
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    keyLabel: 'Gemini API Key',
    keyPlaceholder: 'AIza...',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom / Self-Hosted',
    keyLabel: 'API Key',
    keyPlaceholder: 'your-api-key',
    defaultModel: 'your-model-id',
    models: [] as Array<{ value: string; label: string }>,
  },
] as const

function SourceBadge({ source }: { source: string }) {
  const isEnv = source.startsWith('env')
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0',
      isEnv ? 'bg-amber-950/40 text-amber-500/80 border-amber-800/40' : 'bg-slate-800/80 text-slate-500 border-slate-700/60')}>
      {source}
    </span>
  )
}

function Field({ label, desc, source, children }: { label: string; desc?: string; source?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        {source && <SourceBadge source={source} />}
      </div>
      {desc && <p className="text-[10px] text-slate-600 mb-1.5">{desc}</p>}
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, readOnly }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; readOnly?: boolean }) {
  return (
    <input type={type} value={value} onChange={e => !readOnly && onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
      className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-sm placeholder-slate-600 focus:outline-none',
        readOnly ? 'border-slate-800 text-slate-500 cursor-default' : 'border-slate-700 text-white focus:border-emerald-500/50')} />
  )
}

function RevealInput({ value, onChange, placeholder, readOnly }: { value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={e => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn('w-full px-3 py-2 pr-9 rounded-lg bg-slate-900 border text-sm placeholder-slate-600 focus:outline-none',
          readOnly ? 'border-slate-800 text-slate-500 cursor-default' : 'border-slate-700 text-white focus:border-emerald-500/50')}
      />
      <button type="button" onClick={() => setShown(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
        {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" value={value} min={min} max={max} onChange={e => onChange(Number(e.target.value))}
      className="w-32 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={cn('w-10 h-5 rounded-full transition-colors flex items-center px-0.5', checked ? 'bg-emerald-500' : 'bg-slate-700')}>
        <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  )
}

const TooltipStyle = { backgroundColor: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }

export default function SettingsPage() {
  const { data: rawSettings } = useSWR<AppSettings>('/api/settings', fetcher)
  const { data: usageData }   = useSWR('/api/copilot/usage', fetcher, { refreshInterval: 30000 })
  const [tab, setTab] = useState('k8s')
  const [form, setForm] = useState<Partial<AppSettings>>({})
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; message?: string; suggestedUrl?: string }>>({})

  useEffect(() => {
    if (!rawSettings) return
    const hasStoredAiKey = Boolean((rawSettings.aiApiKey ?? '').trim()) || Boolean((rawSettings.groqApiKey ?? '').trim())
    setForm({
      ...rawSettings,
      aiApiKey: hasStoredAiKey ? CONFIGURED_MASK : '',
      k8sToken: rawSettings.k8sToken ? CONFIGURED_MASK : '',
      registryPassword: rawSettings.registryPassword ? CONFIGURED_MASK : '',
      jenkinsApiToken: rawSettings.jenkinsApiToken ? CONFIGURED_MASK : '',
    })
  }, [rawSettings])

  const update = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => setForm(f => ({ ...f, [key]: val }))

  async function testConnection(key: string, endpoint: string, body: Record<string, unknown>) {
    setTestResults(prev => ({ ...prev, [key]: { loading: true } }))
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { success?: boolean; ok?: boolean; message?: string; suggestedUrl?: string }
      setTestResults(prev => ({
        ...prev,
        [key]: {
          loading: false,
          success: data.success ?? data.ok ?? res.ok,
          message: data.message ?? (res.ok ? 'Connection successful' : 'Connection failed'),
          suggestedUrl: data.suggestedUrl,
        },
      }))
    } catch {
      setTestResults(prev => ({ ...prev, [key]: { loading: false, success: false, message: 'Network error' } }))
    }
  }

  function TestConnBtn({ id, endpoint, body, label = 'Test connection' }: { id: string; endpoint: string; body: Record<string, unknown>; label?: string }) {
    const r = testResults[id]
    return (
      <div className="flex items-center gap-2">
        {r && !r.loading && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('flex items-center gap-1 text-[10px]', r.success ? 'text-emerald-400' : 'text-red-400')}>
              {r.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {r.message}
            </span>
            {id === 'k8s' && r.suggestedUrl && (
              <button
                type="button"
                onClick={() => update('k8sApiUrl', r.suggestedUrl as AppSettings['k8sApiUrl'])}
                className="px-2 py-0.5 rounded border border-emerald-700/60 text-emerald-400 text-[10px] hover:bg-emerald-500/10"
              >
                Use suggested URL
              </button>
            )}
          </div>
        )}
        <button onClick={() => testConnection(id, endpoint, body)} disabled={r?.loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 transition-colors">
          {r?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
          {label}
        </button>
      </div>
    )
  }

  async function save() {
    setSaving(true)
    const payload: Partial<AppSettings> = { ...form }
    if ((payload.aiApiKey ?? '') === CONFIGURED_MASK) delete payload.aiApiKey
    if ((payload.k8sToken ?? '') === CONFIGURED_MASK) delete payload.k8sToken
    if ((payload.registryPassword ?? '') === CONFIGURED_MASK) delete payload.registryPassword
    if ((payload.jenkinsApiToken ?? '') === CONFIGURED_MASK) delete payload.jenkinsApiToken
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    setSaved(true)
    setForm(prev => ({
      ...prev,
      aiApiKey: (prev.aiApiKey ?? '') ? CONFIGURED_MASK : '',
      k8sToken: (prev.k8sToken ?? '') ? CONFIGURED_MASK : '',
      registryPassword: (prev.registryPassword ?? '') ? CONFIGURED_MASK : '',
      jenkinsApiToken: (prev.jenkinsApiToken ?? '') ? CONFIGURED_MASK : '',
    }))
    setTimeout(() => setSaved(false), 3000)
  }

  const providerId = form.aiProvider ?? 'groq'
  const currentProvider = AI_PROVIDERS.find(p => p.id === providerId) ?? AI_PROVIDERS[0]
  const availableModels = currentProvider.models.length > 0
    ? currentProvider.models
    : [{ value: form.aiModel ?? currentProvider.defaultModel, label: `${form.aiModel ?? currentProvider.defaultModel} (custom)` }]

  if (!rawSettings) return <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading settings…</div>

  return (
    <div className="max-w-screen-xl space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-[#0d1117] border border-slate-800/60 rounded-xl p-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === t.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-white'
              )}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-5 space-y-5">

        {/* ── Kubernetes ── */}
        {tab === 'k8s' && (
          <>
            <h3 className="text-sm font-semibold text-white">Kubernetes API <span className="text-emerald-400">· k3d-cicd</span></h3>
            <p className="text-[11px] text-slate-500 -mt-1">Cluster: <span className="font-mono text-slate-400">k3d-cicd</span> (1 server + 2 agents). API URL and kubeconfig path seeded from <span className="font-mono text-amber-500/70">.env.local</span>.</p>
            <p className="text-[10px] text-slate-600 -mt-2 italic">Tests run server-side — the configured URLs must be reachable from the host running VynCICD.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="API Server URL" source="settings.json · defaults from env K8S_API_URL" desc="Editable. If connection is refused, test can suggest a live URL from kubeconfig.">
                <Input value={form.k8sApiUrl ?? ''} onChange={v => update('k8sApiUrl', v)} placeholder="https://127.0.0.1:41815" />
                <div className="mt-1.5"><TestConnBtn id="k8s" endpoint="/api/settings/test-k8s" body={{ target: 'k8s', url: form.k8sApiUrl ?? '' }} /></div>
              </Field>
              <Field label="Kubeconfig Path" source="env · K8S_KUBECONFIG">
                <Input value={form.k8sKubeconfig ?? ''} onChange={v => update('k8sKubeconfig', v)} placeholder="/home/labcicd/kubeconfig/cicd.yaml" readOnly />
                <div className="mt-1.5"><TestConnBtn id="kubeconfig" endpoint="/api/settings/test-k8s" body={{ target: 'kubeconfig' }} /></div>
              </Field>
              <Field label="Service Account Token" source="settings.json"><RevealInput value={form.k8sToken ?? ''} onChange={v => update('k8sToken', v)} placeholder="eyJhbGciO…" /></Field>
            </div>
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Container Registry</h3>
                <TestConnBtn id="registry" endpoint="/api/settings/test-k8s" body={{ target: 'registry' }} />
              </div>
              <p className="text-[10px] text-slate-600 -mt-2 mb-3 italic">Test runs server-side — the registry URL must be reachable from the host running VynCICD.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Registry URL" source="env · REGISTRY_URL"><Input value={form.registryUrl ?? ''} onChange={v => update('registryUrl', v)} placeholder="http://localhost:5050" /></Field>
                <Field label="Username" source="settings.json"><Input value={form.registryUsername ?? ''} onChange={v => update('registryUsername', v)} placeholder="username" /></Field>
                <Field label="Password / Token" source="settings.json"><RevealInput value={form.registryPassword ?? ''} onChange={v => update('registryPassword', v)} placeholder="••••••••" /></Field>
              </div>
            </div>
          </>
        )}

        {/* ── Pipeline ── */}
        {tab === 'pipeline' && (
          <>
            <h3 className="text-sm font-semibold text-white">Build Defaults</h3>
            <div className="border-b border-slate-800 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Jenkins</h3>
                <TestConnBtn id="jenkins" endpoint="/api/settings/test-jenkins" body={{}} label="Test connection" />
              </div>
              <div className="border-t border-slate-800 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Argo CD</h3>
                  <TestConnBtn id="argocd" endpoint="/api/settings/test-argocd" body={{}} label="Test connection" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Argo CD URL" source="settings.json"><Input value={form.argoCdUrl ?? ''} onChange={v => update('argoCdUrl', v)} placeholder="https://argocd.example.internal" /></Field>
                  <Field label="Argo CD API Token" source="settings.json"><RevealInput value={form.argoCdToken ?? ''} onChange={v => update('argoCdToken', v)} placeholder="••••••••" /></Field>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Jenkins URL" source="settings.json"><Input value={form.jenkinsUrl ?? ''} onChange={v => update('jenkinsUrl', v)} placeholder="https://jenkins.example.com" /></Field>
                <Field label="Jenkins Username" source="settings.json"><Input value={form.jenkinsUsername ?? ''} onChange={v => update('jenkinsUsername', v)} placeholder="ci-bot" /></Field>
                <Field label="Jenkins API Token" source="settings.json"><RevealInput value={form.jenkinsApiToken ?? ''} onChange={v => update('jenkinsApiToken', v)} placeholder="••••••••" /></Field>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Default Retry Count">
                <NumberInput value={form.defaultRetryCount ?? 2} onChange={v => update('defaultRetryCount', v)} min={0} max={5} />
              </Field>
              <Field label="Default Timeout (minutes)">
                <NumberInput value={form.defaultTimeoutMinutes ?? 30} onChange={v => update('defaultTimeoutMinutes', v)} min={1} max={360} />
              </Field>
              <Field label="Max Concurrent Builds">
                <NumberInput value={form.buildConcurrency ?? 4} onChange={v => update('buildConcurrency', v)} min={1} max={20} />
              </Field>
            </div>
          </>
        )}

        {/* ── Security ── */}
        {tab === 'security' && (
          <>
            <h3 className="text-sm font-semibold text-white">Scanning</h3>
            <div className="space-y-4">
              <Toggle checked={form.trivyEnabled ?? true} onChange={v => update('trivyEnabled', v)} label="Enable Trivy container image scanning" />
              <Toggle checked={form.secretScanEnabled ?? true} onChange={v => update('secretScanEnabled', v)} label="Enable secret detection in source code" />
              <Toggle checked={form.sbomEnabled ?? true} onChange={v => update('sbomEnabled', v)} label="Generate SBOM per build" />
              <Toggle checked={form.blockOnCriticalCves ?? true} onChange={v => update('blockOnCriticalCves', v)} label="Block build on CRITICAL CVEs" />
            </div>
          </>
        )}

        {/* ── Notifications ── */}
        {tab === 'alerts' && (
          <>
            <h3 className="text-sm font-semibold text-white">Notification Triggers</h3>
            <div className="space-y-4 mb-6">
              <Toggle checked={form.notifyOnFailure ?? true} onChange={v => update('notifyOnFailure', v)} label="Notify on build failure" />
              <Toggle checked={form.notifyOnSuccess ?? false} onChange={v => update('notifyOnSuccess', v)} label="Notify on build success" />
              <Toggle checked={form.notifyOnSlowBuild ?? true} onChange={v => update('notifyOnSlowBuild', v)} label="Notify on slow builds" />
              {form.notifyOnSlowBuild && (
                <Field label="Slow build threshold (minutes)">
                  <NumberInput value={form.slowBuildThresholdMinutes ?? 20} onChange={v => update('slowBuildThresholdMinutes', v)} min={1} max={120} />
                </Field>
              )}
            </div>
            <div className="border-t border-slate-800 pt-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Delivery Channels</h3>
              <div className="space-y-3">
                <Toggle checked={form.alertSlackEnabled ?? true} onChange={v => update('alertSlackEnabled', v)} label="Enable Slack notifications" />
                <Toggle checked={form.alertTeamEnabled ?? false} onChange={v => update('alertTeamEnabled', v)} label="Enable Team (Microsoft Teams) notifications" />
                <Toggle checked={form.alertWebhookEnabled ?? false} onChange={v => update('alertWebhookEnabled', v)} label="Enable custom webhook notifications" />
                <Toggle checked={form.alertEmailEnabled ?? false} onChange={v => update('alertEmailEnabled', v)} label="Enable email notifications" />
              </div>
            </div>
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Slack</h3>
                <TestConnBtn id="slack" endpoint="/api/settings/test-notification" body={{ target: 'slack' }} label="Send test message" />
              </div>
              <Field label="Incoming Webhook URL" source="env · SLACK_WEBHOOK_URL"><Input value={form.slackWebhookUrl ?? ''} onChange={v => update('slackWebhookUrl', v)} placeholder="https://hooks.slack.com/services/…" /></Field>
            </div>
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Team (Microsoft Teams)</h3>
                <TestConnBtn id="team" endpoint="/api/settings/test-notification" body={{ target: 'team' }} label="Send test message" />
              </div>
              <Field label="Incoming Webhook URL" source="env · TEAMS_WEBHOOK_URL"><Input value={form.teamsWebhookUrl ?? ''} onChange={v => update('teamsWebhookUrl', v)} placeholder="https://outlook.office.com/webhook/..." /></Field>
            </div>
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Custom Webhook</h3>
                <TestConnBtn id="webhook" endpoint="/api/settings/test-notification" body={{ target: 'webhook' }} label="Send test event" />
              </div>
              <Field label="Webhook URL" source="env · CUSTOM_WEBHOOK_URL" desc="Sends a JSON POST payload for pipeline and incident notifications.">
                <Input value={form.customWebhookUrl ?? ''} onChange={v => update('customWebhookUrl', v)} placeholder="https://example.com/hooks/vyncicd" />
              </Field>
            </div>
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Email (SMTP)</h3>
                {form.alertEmailEnabled && <TestConnBtn id="smtp" endpoint="/api/settings/test-notification" body={{ target: 'smtp' }} label="Test connection" />}
              </div>
              {form.alertEmailEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Field label="SMTP Host" source="env · SMTP_HOST"><Input value={form.smtpHost ?? ''} onChange={v => update('smtpHost', v)} placeholder="smtp.gmail.com" /></Field>
                  <Field label="SMTP Port" source="env · SMTP_PORT"><NumberInput value={form.smtpPort ?? 587} onChange={v => update('smtpPort', v)} min={1} max={65535} /></Field>
                  <Field label="SMTP Username" source="env · SMTP_USER"><Input value={form.smtpUser ?? ''} onChange={v => update('smtpUser', v)} placeholder="no-reply@example.com" /></Field>
                  <Field label="SMTP Password" source="env · SMTP_PASSWORD"><RevealInput value={form.smtpPassword ?? ''} onChange={v => update('smtpPassword', v)} placeholder="••••••••" /></Field>
                  <Field label="From address" source="env · SMTP_FROM"><Input value={form.smtpFrom ?? ''} onChange={v => update('smtpFrom', v)} placeholder="VynCICD <noreply@example.com>" /></Field>
                  <Field label="Default recipients" desc="Comma-separated fallback emails">
                    <Input value={form.alertRecipients ?? ''} onChange={v => update('alertRecipients', v)} placeholder="ops@example.com, dev@example.com" />
                  </Field>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── AI Copilot ── */}
        {tab === 'ai' && (
          <>
            <h3 className="text-sm font-semibold text-white">AI Copilot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="AI Provider" source="settings.json">
                <select
                  value={providerId}
                  onChange={e => {
                    const selected = AI_PROVIDERS.find(p => p.id === e.target.value) ?? AI_PROVIDERS[0]
                    update('aiProvider', selected.id)
                    update('aiModel', selected.defaultModel)
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>
              <Field label={currentProvider.keyLabel} desc="Stored in settings.json unless provided by environment." source="settings.json">
                <RevealInput value={form.aiApiKey ?? ''} onChange={v => update('aiApiKey', v)} placeholder={currentProvider.keyPlaceholder} />
              </Field>
              <Field label="Model" source="settings.json">
                <select value={form.aiModel ?? currentProvider.defaultModel} onChange={e => update('aiModel', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  {availableModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              {providerId === 'custom' && (
                <Field label="OpenAI-Compatible Base URL" desc="Example: https://api.example.com/v1" source="settings.json">
                  <Input value={form.aiBaseUrl ?? ''} onChange={v => update('aiBaseUrl', v)} placeholder="https://api.example.com/v1" />
                </Field>
              )}
              <Field label="AI Connection Test">
                <div className="flex items-center gap-2">
                  <TestConnBtn
                    id="ai"
                    endpoint="/api/copilot/test"
                    body={{
                      provider: providerId,
                      apiKey: form.aiApiKey ?? '',
                      model: form.aiModel ?? currentProvider.defaultModel,
                      baseUrl: form.aiBaseUrl ?? '',
                    }}
                    label="Test AI provider"
                  />
                </div>
              </Field>
              <Field label="Refresh Interval (seconds)">
                <NumberInput value={form.defaultRefreshInterval ?? 30} onChange={v => update('defaultRefreshInterval', v)} min={10} max={300} />
              </Field>
            </div>
          </>
        )}

        {/* ── DORA Targets ── */}
        {tab === 'dora' && (
          <>
            <h3 className="text-sm font-semibold text-white">DORA Performance Targets</h3>
            <p className="text-[11px] text-slate-500 mb-4">Set your team&apos;s targets. These are used to colour-code your metrics dashboard.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Deployment Frequency Target (per week)">
                <NumberInput value={form.deploymentFrequencyTarget ?? 5} onChange={v => update('deploymentFrequencyTarget', v)} min={1} />
              </Field>
              <Field label="Lead Time Target (hours)">
                <NumberInput value={form.leadTimeTargetHours ?? 24} onChange={v => update('leadTimeTargetHours', v)} min={1} />
              </Field>
              <Field label="MTTR Target (minutes)">
                <NumberInput value={form.mttrTargetMinutes ?? 60} onChange={v => update('mttrTargetMinutes', v)} min={1} />
              </Field>
              <Field label="Change Failure Rate Target (%)">
                <NumberInput value={form.changeFailureRateTarget ?? 5} onChange={v => update('changeFailureRateTarget', v)} min={1} max={100} />
              </Field>
            </div>
          </>
        )}

        {/* ── Token Usage ── */}
        {tab === 'usage' && usageData && (
          <>
            <h3 className="text-sm font-semibold text-white">AI Token Utilisation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Requests Today', value: usageData.today?.requests ?? 0 },
                { label: 'Tokens Today', value: (usageData.today?.totalTokens ?? 0).toLocaleString() },
                { label: 'Total Requests', value: usageData.total?.requests ?? 0 },
                { label: 'Total Tokens', value: (usageData.total?.totalTokens ?? 0).toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/50 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-emerald-400">{s.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {usageData.last7Days && usageData.last7Days.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-3">Tokens per day (7 days)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={usageData.last7Days} barCategoryGap="30%">
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Bar dataKey="totalTokens" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save button */}
      {tab !== 'usage' && (
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : saved ? '✓ Saved!' : <><Save className="w-3.5 h-3.5" /> Save Settings</>}
          </button>
        </div>
      )}
    </div>
  )
}
