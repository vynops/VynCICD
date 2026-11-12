'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Phone, Plus, X, Loader2, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchList } from '@/lib/fetch-json'
import type { Shift } from '@/lib/oncall-store'

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init)
  const contentType = response.headers.get('Content-Type') ?? ''
  const result = contentType.includes('application/json') ? await response.json() : null
  if (response.redirected || !response.ok) throw new Error(result?.error ?? 'Unable to save the on-call shift.')
  return result
}

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney']

function dateTimeParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

export function shiftTimeToInput(value: string, timezone: string) {
  const parts = dateTimeParts(new Date(value), timezone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function shiftInputToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Enter a valid local date and time.')
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const desired = [yearText, monthText, dayText, hourText, minuteText].map(Number)
  let timestamp = Date.UTC(desired[0], desired[1] - 1, desired[2], desired[3], desired[4])
  const validDate = new Date(timestamp)
  if (validDate.getUTCFullYear() !== desired[0] || validDate.getUTCMonth() + 1 !== desired[1]
    || validDate.getUTCDate() !== desired[2] || validDate.getUTCHours() !== desired[3] || validDate.getUTCMinutes() !== desired[4]) {
    throw new RangeError('Enter a valid local date and time.')
  }
  const desiredTimestamp = timestamp
  for (let i = 0; i < 4; i++) {
    const parts = dateTimeParts(new Date(timestamp), timezone)
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    const adjustment = desiredTimestamp - represented
    timestamp += adjustment
    if (adjustment === 0) break
  }
  if (shiftTimeToInput(new Date(timestamp).toISOString(), timezone) !== value) {
    throw new RangeError('This local time does not exist in the selected timezone.')
  }
  return new Date(timestamp).toISOString()
}

function isActive(s: Shift): boolean {
  const now = new Date()
  return new Date(s.startTime) <= now && new Date(s.endTime) > now
}

function ShiftModal({ shift, onClose, onSave }: { shift?: Shift; onClose: () => void; onSave: () => void }) {
  const [name, setName]         = useState(shift?.name ?? 'Primary On-Call')
  const [userEmail, setEmail]   = useState(shift?.userEmail ?? '')
  const [userName, setUserName] = useState(shift?.userName ?? '')
  const [startTime, setStart]   = useState(shift?.startTime ? shiftTimeToInput(shift.startTime, shift.timezone) : '')
  const [endTime, setEnd]       = useState(shift?.endTime   ? shiftTimeToInput(shift.endTime, shift.timezone)   : '')
  const [timezone, setTz]       = useState(shift?.timezone ?? 'UTC')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function submit() {
    if (!userEmail.trim() || !userName.trim() || !startTime || !endTime) { setError('All fields are required.'); return }
    setSaving(true)
    setError('')
    try {
      const start = shiftInputToIso(startTime, timezone)
      const end = shiftInputToIso(endTime, timezone)
      if (Date.parse(end) <= Date.parse(start)) throw new Error('End time must be later than start time.')
      const body = { name, userEmail, userName, startTime: start, endTime: end, timezone }
      if (shift) {
        await requestJson(`/api/oncall/${shift.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await requestJson('/api/oncall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSave()
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the on-call shift.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">{shift ? 'Edit Shift' : 'Add On-Call Shift'}</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Shift Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Primary On-Call"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Assignee Name</label>
              <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Alice Chen"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Assignee Email</label>
              <input value={userEmail} onChange={e => setEmail(e.target.value)} placeholder="alice@example.com" type="email"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Start ({timezone})</label>
              <input type="datetime-local" value={startTime} onChange={e => setStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">End ({timezone})</label>
              <input type="datetime-local" value={endTime} onChange={e => setEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTz(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/50">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OnCallPage() {
  const { data: shiftData, mutate, error, isLoading } = useSWR<Shift[]>('/api/oncall', fetchList, { refreshInterval: 30000 })
  const shifts = shiftData ?? []
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [actionError, setActionError] = useState('')

  async function deleteShift(id: string) {
    if (!confirm('Delete this shift?')) return
    setActionError('')
    try {
      await requestJson(`/api/oncall/${id}`, { method: 'DELETE' })
      await mutate()
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Unable to delete the on-call shift.')
    }
  }

  const active  = shifts.filter(s => isActive(s))
  const upcoming = shifts.filter(s => new Date(s.startTime) > new Date())
  const past     = shifts.filter(s => new Date(s.endTime) <= new Date())

  function ShiftCard({ s }: { s: Shift }) {
    const active = isActive(s)
    return (
      <div className={cn('bg-[#0d1117] border rounded-xl p-4', active ? 'border-emerald-500/40 ring-1 ring-emerald-500/10' : 'border-slate-800/60')}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
            <span className="text-sm font-semibold text-white">{s.name}</span>
          </div>
          {active && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ON-CALL</span>}
        </div>
        <div className="text-sm text-white font-medium mb-1">{s.userName}</div>
        <div className="text-[11px] text-slate-500 mb-3">{s.userEmail}</div>
        <div className="text-[11px] text-slate-400 space-y-0.5">
          <div>Start: {new Date(s.startTime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: s.timezone })}</div>
          <div>End:   {new Date(s.endTime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: s.timezone })}</div>
          <div className="text-slate-600">{s.timezone}</div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setEditShift(s)} className="text-[10px] text-slate-500 hover:text-white border border-slate-700 px-2.5 py-1 rounded-lg transition-colors">Edit</button>
          <button onClick={() => deleteShift(s.id)} className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-screen-xl">
      {(showNew || editShift) && (
        <ShiftModal shift={editShift ?? undefined} onClose={() => { setShowNew(false); setEditShift(null) }} onSave={() => mutate()} />
      )}
      {actionError && <p role="alert" className="text-xs text-red-400">{actionError}</p>}

      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Shift
        </button>
      </div>

      {active.length > 0 && (
        <section>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Currently On-Call
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map(s => <ShiftCard key={s.id} s={s} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Upcoming Shifts
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(s => <ShiftCard key={s.id} s={s} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Past Shifts</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            {past.slice(0, 6).map(s => <ShiftCard key={s.id} s={s} />)}
          </div>
        </section>
      )}

      {error ? (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center text-sm text-red-300">
          Unable to load on-call shifts. <button onClick={() => mutate()} className="underline hover:text-white">Retry</button>
        </div>
      ) : isLoading ? (
        <div role="status" className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-8 text-center text-sm text-slate-500">Loading on-call shifts…</div>
      ) : shifts.length === 0 && (
        <div className="bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-12 text-center">
          <Phone className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">No on-call shifts configured</p>
          <p className="text-xs text-slate-600">Add shifts to enable on-call routing for pipeline incidents.</p>
        </div>
      )}
    </div>
  )
}
