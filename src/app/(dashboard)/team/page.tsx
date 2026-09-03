'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Users, Plus, Trash2, X, Loader2, Shield, Eye, EyeOff, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/user-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ROLE_BADGE: Record<string, string> = {
  admin:  'bg-red-500/15 text-red-400 border-red-500/30',
  editor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  viewer: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
}
const ROLE_DESC: Record<string, string> = {
  admin:  'Full access — manage users, settings, and all resources',
  editor: 'Can trigger pipelines and manage incidents',
  viewer: 'Read-only access to all dashboards',
}

function UserModal({ user, onClose, onSave }: { user?: User; onClose: () => void; onSave: () => void }) {
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [role, setRole]         = useState<'admin' | 'editor' | 'viewer'>(user?.role ?? 'viewer')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function submit() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    if (!user && !password) { setError('Password is required for new users.'); return }
    setSaving(true)
    const body: Record<string, unknown> = { name, email, role }
    if (password) body.password = password
    const res = user
      ? await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { onSave(); onClose() }
    else { const d = await res.json() as { error?: string }; setError(d.error ?? 'Failed') }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">{user ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Alice Chen"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="alice@example.com"
              disabled={!!user}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin', 'editor', 'viewer'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={cn('py-2 rounded-lg text-xs font-bold capitalize border transition-colors', role === r ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600')}>
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">{ROLE_DESC[role]}</p>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">{user ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : user ? 'Update' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { data: users = [], mutate } = useSWR<User[]>('/api/users', fetcher)
  const { data: me } = useSWR<{ id: string; role: string }>('/api/auth/me', fetcher)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [showNew, setShowNew]   = useState(false)

  async function deleteUser(id: string) {
    if (id === me?.id) { alert('You cannot delete your own account.'); return }
    if (!confirm('Delete this user?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function toggleUserActive(user: User) {
    if (user.id === me?.id) return
    const action = user.active ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} ${user.name}'s account?`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) })
    if (!res.ok) { const data = await res.json() as { error?: string }; alert(data.error ?? `Unable to ${action} account.`) }
    mutate()
  }

  const isAdmin = me?.role === 'admin'

  return (
    <div className="space-y-4 max-w-screen-lg">
      {(showNew || editUser) && (
        <UserModal user={editUser ?? undefined} onClose={() => { setShowNew(false); setEditUser(null) }} onSave={() => mutate()} />
      )}

      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </div>
      )}

      <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-[10px] font-bold">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-medium text-white">{u.name}</span>
                    {u.id === me?.id && <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">You</span>}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-slate-400 font-mono">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', ROLE_BADGE[u.role])}>{u.role}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', u.active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30')}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditUser(u)} className="text-[10px] text-slate-500 hover:text-white border border-slate-700 px-2 py-1 rounded-lg transition-colors">Edit</button>
                      <button onClick={() => toggleUserActive(u)} title={u.active ? 'Deactivate account' : 'Activate account'} aria-label={u.active ? 'Deactivate account' : 'Activate account'} className={cn('transition-colors disabled:opacity-30', u.active ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-white')} disabled={u.id === me?.id}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-30" disabled={u.id === me?.id}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role reference */}
      <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">Role Reference</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['admin', 'editor', 'viewer'] as const).map(r => (
            <div key={r} className="bg-slate-900/40 rounded-lg p-3">
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize', ROLE_BADGE[r])}>{r}</span>
              <p className="text-[11px] text-slate-500 mt-2">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
