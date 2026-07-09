'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { GitMerge, Plus, X, Trash2, Loader2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoutingRule, EscalationPolicy } from '@/lib/oncall-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SEV_OPTIONS = ['*', 'critical', 'high', 'medium', 'low']
const CAT_OPTIONS = ['*', 'build-failure', 'deploy-failure', 'test-failure', 'security', 'performance', 'other']

function RuleModal({ rule, policies, onClose, onSave }: {
  rule?: RoutingRule; policies: EscalationPolicy[]
  onClose: () => void; onSave: () => void
}) {
  const [name, setName]               = useState(rule?.name ?? '')
  const [severity, setSeverity]       = useState(rule?.severity ?? '*')
  const [category, setCategory]       = useState(rule?.category ?? '*')
  const [emails, setEmails]           = useState(rule?.notifyEmails?.join(', ') ?? '')
  const [slack, setSlack]             = useState(rule?.notifySlack ?? true)
  const [oncall, setOncall]           = useState(rule?.notifyOncall ?? true)
  const [policyId, setPolicyId]       = useState(rule?.escalationPolicyId ?? '')
  const [saving, setSaving]           = useState(false)

  async function submit() {
    if (!name.trim()) return
    setSaving(true)
    const body = {
      name, severity, category,
      notifyEmails: emails.split(',').map(s => s.trim()).filter(Boolean),
      notifySlack: slack, notifyOncall: oncall, escalationPolicyId: policyId,
    }
    if (rule) {
      await fetch(`/api/routing/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/routing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">{rule ? 'Edit Routing Rule' : 'New Routing Rule'}</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Rule Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Critical deploy failures"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                {SEV_OPTIONS.map(s => <option key={s} value={s}>{s === '*' ? 'Any severity' : s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                {CAT_OPTIONS.map(c => <option key={c} value={c}>{c === '*' ? 'Any category' : c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Notify emails (comma-separated)</label>
            <input value={emails} onChange={e => setEmails(e.target.value)} placeholder="lead@example.com, ops@example.com"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={slack} onChange={e => setSlack(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700" />
              <span className="text-xs text-slate-300">Notify Slack</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={oncall} onChange={e => setOncall(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700" />
              <span className="text-xs text-slate-300">Notify on-call</span>
            </label>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Escalation Policy</label>
            <select value={policyId} onChange={e => setPolicyId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">None</option>
              {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PolicyModal({ policy, onClose, onSave }: {
  policy?: EscalationPolicy; onClose: () => void; onSave: () => void
}) {
  const [name, setName] = useState(policy?.name ?? '')
  const [steps, setSteps] = useState<{ delayMin: number; notifySlack: boolean; notifyOncall: boolean; notifyEmails: string }[]>(
    policy?.steps.map(s => ({ ...s, notifyEmails: s.notifyEmails.join(', ') })) ?? []
  )
  const [saving, setSaving] = useState(false)

  function addStep() { setSteps(p => [...p, { delayMin: 15, notifySlack: true, notifyOncall: true, notifyEmails: '' }]) }
  function removeStep(i: number) { setSteps(p => p.filter((_, j) => j !== i)) }
  function updateStep<K extends keyof typeof steps[0]>(i: number, key: K, val: typeof steps[0][K]) {
    setSteps(p => p.map((s, j) => j === i ? { ...s, [key]: val } : s))
  }

  async function submit() {
    if (!name.trim()) return
    setSaving(true)
    const body = {
      name: name.trim(),
      steps: steps.map(s => ({ ...s, notifyEmails: s.notifyEmails.split(',').map(e => e.trim()).filter(Boolean) })),
    }
    if (policy) {
      await fetch(`/api/routing/policies/${policy.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/routing/policies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    onSave()
    onClose()
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{policy ? 'Edit Escalation Policy' : 'New Escalation Policy'}</h2>
            <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Policy Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="On-Call Escalation"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-slate-400 font-medium">Escalation Steps</label>
              <button onClick={addStep} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 border border-emerald-500/30 px-2 py-1 rounded-lg">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
            {steps.length === 0 && <div className="text-[11px] text-slate-600 py-3 text-center">No steps — click Add Step</div>}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[11px] text-slate-500 w-8">+</span>
                      <input type="number" value={step.delayMin} onChange={e => updateStep(i, 'delayMin', Number(e.target.value))}
                        className={cn(inputCls, 'w-16 text-center')} min={1} />
                      <span className="text-[11px] text-slate-500">min</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={step.notifySlack} onChange={e => updateStep(i, 'notifySlack', e.target.checked)} className="accent-emerald-500" />
                      Slack
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={step.notifyOncall} onChange={e => updateStep(i, 'notifyOncall', e.target.checked)} className="accent-emerald-500" />
                      On-Call
                    </label>
                    <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-300 ml-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={step.notifyEmails} onChange={e => updateStep(i, 'notifyEmails', e.target.value)}
                    placeholder="Additional emails (comma-separated, optional)"
                    className={cn(inputCls, 'w-full')} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Policy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RoutingPage() {
  const { data: rules = [], mutate: muteRules } = useSWR<RoutingRule[]>('/api/routing', fetcher)
  const { data: policies = [], mutate: mutePolicies } = useSWR<EscalationPolicy[]>('/api/routing/policies', fetcher)
  const [editRule, setEditRule] = useState<RoutingRule | null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [editPolicy, setEditPolicy] = useState<EscalationPolicy | null>(null)
  const [showNewPolicy, setShowNewPolicy] = useState(false)

  async function deleteRule(id: string) {
    if (id === 'default') { alert('Cannot delete the default rule.'); return }
    if (!confirm('Delete this routing rule?')) return
    await fetch(`/api/routing/${id}`, { method: 'DELETE' })
    muteRules()
  }

  async function deletePolicy(id: string) {
    if (!confirm('Delete this escalation policy?')) return
    const res = await fetch(`/api/routing/policies/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json() as { error?: string }; alert(d.error ?? 'Failed'); return }
    mutePolicies()
  }

  return (
    <div className="space-y-6 max-w-screen-xl">
      {(showNew || editRule) && (
        <RuleModal rule={editRule ?? undefined} policies={policies}
          onClose={() => { setShowNew(false); setEditRule(null) }} onSave={() => muteRules()} />
      )}
      {(showNewPolicy || editPolicy) && (
        <PolicyModal policy={editPolicy ?? undefined}
          onClose={() => { setShowNewPolicy(false); setEditPolicy(null) }}
          onSave={() => mutePolicies()} />
      )}

      {/* Routing rules */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Routing Rules</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Match incidents by severity/category and route notifications to the right people.</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Rule
          </button>
        </div>
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={cn('bg-[#0d1117] border rounded-xl p-4', rule.id === 'default' ? 'border-slate-700/40' : 'border-slate-800/60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <GitMerge className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{rule.name}</div>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        severity: <span className="font-bold text-white">{rule.severity}</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        category: <span className="font-bold text-white">{rule.category}</span>
                      </span>
                      {rule.notifySlack  && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Slack</span>}
                      {rule.notifyOncall && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">On-Call</span>}
                      {rule.notifyEmails.length > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{rule.notifyEmails.length} email{rule.notifyEmails.length > 1 ? 's' : ''}</span>}
                      {rule.escalationPolicyId && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">
                          Escalation: {policies.find(p => p.id === rule.escalationPolicyId)?.name ?? rule.escalationPolicyId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditRule(rule)} className="text-[10px] text-slate-500 hover:text-white border border-slate-700 px-2.5 py-1 rounded-lg transition-colors">Edit</button>
                  {rule.id !== 'default' && (
                    <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Escalation policies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Escalation Policies</h2>
          <button onClick={() => setShowNewPolicy(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Policy
          </button>
        </div>
        <div className="space-y-3">
          {policies.map(p => (
            <div key={p.id} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-sm font-medium text-white">{p.name}</div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditPolicy(p)} className="text-[10px] text-slate-500 hover:text-white border border-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  {p.id !== 'default' && (
                    <button onClick={() => deletePolicy(p.id)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {p.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-[11px]">
                    <span className="w-16 text-slate-500">+{step.delayMin}min</span>
                    <div className="flex gap-2 flex-wrap">
                      {step.notifySlack  && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Slack</span>}
                      {step.notifyOncall && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">On-Call</span>}
                      {step.notifyEmails.map(e => <span key={e} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{e}</span>)}
                    </div>
                  </div>
                ))}
                {p.steps.length === 0 && <div className="text-[11px] text-slate-600">No escalation steps configured</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
