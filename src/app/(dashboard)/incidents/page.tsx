'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, CheckCircle, Clock, Download, Search, X, User, FileText, UserPlus, Plus, Timer } from 'lucide-react'
import { timeAgo, cn, exportCsv } from '@/lib/utils'
import type { Incident, Shift } from '@/lib/oncall-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SlaTier { ackMinutes: number; resolveMinutes: number }
type SlaStore = Record<string, SlaTier>

function SlaBadge({ incident, sla }: { incident: Incident; sla: SlaStore }) {
  if (incident.status === 'resolved') return null
  const tier = sla[incident.severity]
  if (!tier) return null
  const now = Date.now()
  const created = new Date(incident.createdAt).getTime()
  const isAcked = incident.status === 'acknowledged'
  const ackDeadline = created + tier.ackMinutes * 60000
  const resolveDeadline = created + tier.resolveMinutes * 60000
  const deadline = isAcked ? resolveDeadline : ackDeadline
  const label = isAcked ? 'resolve' : 'ack'
  const remaining = deadline - now
  const breached = remaining < 0
  const imminent = !breached && remaining < 10 * 60000 // <10min
  const mins = Math.abs(Math.round(remaining / 60000))
  const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
  return (
    <span className={cn('flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border',
      breached ? 'bg-red-500/20 text-red-400 border-red-500/30' :
      imminent ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
      'bg-slate-800 text-slate-500 border-slate-700')}>
      <Timer className="w-2.5 h-2.5" />
      {breached ? `${label} breached ${display} ago` : `${label} in ${display}`}
    </span>
  )
}

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20',
  low:      'bg-blue-500/20 text-blue-400 border border-blue-500/20',
}
const STATUS_BADGE: Record<string, string> = {
  open:         'bg-red-500/10 text-red-400',
  acknowledged: 'bg-yellow-500/10 text-yellow-400',
  resolved:     'bg-emerald-500/10 text-emerald-400',
}

function ActionModal({ incident, nextStatus, onClose, onConfirm }: {
  incident: Incident; nextStatus: 'acknowledged' | 'resolved'
  onClose: () => void; onConfirm: (notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(incident.notes ?? '')
  const [saving, setSaving] = useState(false)
  async function submit() {
    setSaving(true)
    await onConfirm(notes)
    setSaving(false)
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white capitalize">{nextStatus === 'acknowledged' ? 'Acknowledge Incident' : 'Resolve Incident'}</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4 bg-slate-900/40 rounded-lg p-3 font-medium">{incident.title}</p>
        <label className="text-[11px] text-slate-400 block mb-1.5">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Add resolution notes, root cause, actions taken…"
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none" />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className={cn('flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center transition-colors disabled:opacity-50',
              nextStatus === 'resolved' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-yellow-500 hover:bg-yellow-400')}>
            {saving ? 'Saving…' : nextStatus === 'resolved' ? 'Mark Resolved' : 'Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({ incident, allShifts, me, onClose, onConfirm }: {
  incident: Incident; allShifts: Shift[]; me: { email: string; name: string } | null
  onClose: () => void; onConfirm: (assignTo: string) => Promise<void>
}) {
  const [custom, setCustom] = useState('')
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const roster = allShifts
    .filter((s, i, arr) => arr.findIndex(x => x.userEmail === s.userEmail) === i)
    .map(s => ({ shift: s, active: new Date(s.startTime) <= now && new Date(s.endTime) > now }))
    .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
  async function submit() {
    const target = selected || custom.trim()
    if (!target) return
    setSaving(true)
    await onConfirm(target)
    setSaving(false)
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><UserPlus size={14} className="text-emerald-400" /> Assign Incident</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        {me && (
          <button onClick={() => { setSelected(me.email); setCustom('') }}
            className={cn('w-full text-left px-3 py-2 rounded-lg text-xs mb-3 border transition-colors', selected === me.email ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600')}>
            Assign to me — {me.name}
          </button>
        )}
        {roster.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {roster.map(({ shift: s, active }) => (
              <button key={s.userEmail} onClick={() => { setSelected(s.userEmail); setCustom('') }}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors flex items-center justify-between', selected === s.userEmail ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600')}>
                <span>{s.userName} ({s.userEmail})</span>
                {active && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ON-CALL</span>}
              </button>
            ))}
          </div>
        )}
        <input value={custom} onChange={e => { setCustom(e.target.value); setSelected('') }}
          placeholder="Or type email manually…"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || (!selected && !custom.trim())}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center disabled:opacity-50 transition-colors">
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high')
  const [category, setCategory] = useState('build-failure')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/incidents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, severity, category, source, status: 'open' }),
    })
    setSaving(false)
    onSave()
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">Create Incident</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe the issue…"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="build-failure">Build Failure</option>
                <option value="deploy-failure">Deploy Failure</option>
                <option value="test-failure">Test Failure</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Source Pipeline (optional)</label>
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. api-service CI/CD"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Incident'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IncidentsPage() {
  const { data: incidents = [], mutate } = useSWR<Incident[]>('/api/incidents', fetcher, { refreshInterval: 30000 })
  const { data: shifts = [] } = useSWR<Shift[]>('/api/oncall', fetcher)
  const { data: me } = useSWR<{ email: string; name: string } | null>('/api/auth/me', fetcher)
  const { data: sla = {} } = useSWR<SlaStore>('/api/routing/sla', fetcher)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [actionModal, setActionModal] = useState<{ incident: Incident; next: 'acknowledged' | 'resolved' } | null>(null)
  const [assignModal, setAssignModal] = useState<Incident | null>(null)
  const [createModal, setCreateModal] = useState(false)

  const filtered = incidents.filter(i => {
    const matchStatus   = statusFilter === 'all' || i.status === statusFilter
    const matchSeverity = severityFilter === 'all' || i.severity === severityFilter
    const q = search.toLowerCase()
    const matchSearch   = !q || i.title.toLowerCase().includes(q) || (i.source ?? '').toLowerCase().includes(q) || (i.repo ?? '').toLowerCase().includes(q) || (i.author ?? '').toLowerCase().includes(q)
    return matchStatus && matchSeverity && matchSearch
  })

  async function updateStatus(incident: Incident, newStatus: 'acknowledged' | 'resolved', notes: string) {
    await fetch(`/api/incidents/${incident.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, notes, ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}) }),
    })
    setActionModal(null)
    mutate()
  }

  async function assignIncident(incident: Incident, assignTo: string) {
    await fetch(`/api/incidents/${incident.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: assignTo }),
    })
    setAssignModal(null)
    mutate()
  }

  const open = incidents.filter(i => i.status === 'open').length
  const ackd = incidents.filter(i => i.status === 'acknowledged').length

  return (
    <div className="space-y-4 max-w-screen-2xl">
      {actionModal && (
        <ActionModal incident={actionModal.incident} nextStatus={actionModal.next}
          onClose={() => setActionModal(null)}
          onConfirm={notes => updateStatus(actionModal.incident, actionModal.next, notes)} />
      )}
      {assignModal && (
        <AssignModal incident={assignModal} allShifts={shifts} me={me ?? null}
          onClose={() => setAssignModal(null)}
          onConfirm={email => assignIncident(assignModal, email)} />
      )}
      {createModal && <CreateModal onClose={() => setCreateModal(false)} onSave={() => mutate()} />}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open', value: open, color: open > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Acknowledged', value: ackd, color: ackd > 0 ? 'text-yellow-400' : 'text-slate-400' },
          { label: 'Total', value: incidents.length, color: 'text-slate-300' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-3 text-center">
            <div className={cn('text-xl font-black', s.color)}>{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, source, repo, author…"
            className="w-full pl-8 pr-4 py-2 text-xs rounded-lg bg-[#0d1117] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'open', 'acknowledged', 'resolved'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('text-[10px] font-bold px-2 py-1.5 rounded-lg capitalize transition-colors border',
                statusFilter === s ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-800 hover:text-white')}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', 'critical', 'high', 'medium', 'low'].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={cn('text-[10px] font-bold px-2 py-1.5 rounded-lg capitalize transition-colors border',
                severityFilter === s ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-800 hover:text-white')}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => exportCsv(filtered.map(i => ({ title: i.title, severity: i.severity, status: i.status, category: i.category, source: i.source, created: i.createdAt })), 'incidents.csv')}
            className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-white px-3 py-2 rounded-lg border border-slate-800 transition-colors">
            <Download className="w-3 h-3" /> Export
          </button>
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors">
            <Plus className="w-3 h-3" /> New
          </button>
        </div>
      </div>

      {/* Incident list */}
      <div className="space-y-2">
        {filtered.map(inc => (
          <div key={inc.id} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/50 transition-colors">
            <div className="flex flex-wrap items-start gap-3">
              <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', inc.severity === 'critical' ? 'text-red-400' : inc.severity === 'high' ? 'text-orange-400' : 'text-yellow-400')} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{inc.title}</span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded capitalize', SEV_BADGE[inc.severity])}>{inc.severity}</span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded capitalize', STATUS_BADGE[inc.status])}>{inc.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {inc.source && <span>Source: <span className="text-slate-400">{inc.source}</span></span>}
                  {inc.repo && <span>Repo: <span className="text-slate-400">{inc.repo}</span></span>}
                  {inc.branch && <span>Branch: <span className="font-mono text-slate-400">{inc.branch}</span></span>}
                  {inc.author && <span>Author: <span className="text-slate-400">{inc.author}</span></span>}
                  {inc.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" /><span className="text-slate-400">{inc.assignedTo}</span></span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(inc.createdAt)}</span>
                  <SlaBadge incident={inc} sla={sla} />
                </div>
                {inc.notes && (
                  <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2 flex items-start gap-2">
                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" /> {inc.notes}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setAssignModal(inc)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Assign
                </button>
                {inc.status === 'open' && (
                  <button onClick={() => setActionModal({ incident: inc, next: 'acknowledged' })}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                    Acknowledge
                  </button>
                )}
                {inc.status !== 'resolved' && (
                  <button onClick={() => setActionModal({ incident: inc, next: 'resolved' })}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600">
            {statusFilter === 'open' ? '🎉 No open incidents!' : 'No incidents match the current filters.'}
          </div>
        )}
      </div>
    </div>
  )
}
