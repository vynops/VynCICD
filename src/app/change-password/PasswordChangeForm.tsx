'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function PasswordChangeForm() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Unable to change your password.')
        return
      }
      router.replace('/overview')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500/60'

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-black text-white text-center mb-2">Change your initial password</h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Choose a different password of 8 to 128 characters before continuing.
        </p>
        <form onSubmit={handleSubmit} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          <label className="text-xs font-medium text-slate-400 block">
            Current password
            <input type="password" autoComplete="current-password" required
              placeholder="Default: changeme (unless customized)"
              value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}
              className={`${inputClass} mt-1.5 placeholder-slate-500`} />
          </label>
          <label className="text-xs font-medium text-slate-400 block">
            New password
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              value={newPassword} onChange={event => setNewPassword(event.target.value)}
              className={`${inputClass} mt-1.5`} />
          </label>
          <label className="text-xs font-medium text-slate-400 block">
            Confirm new password
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
              className={`${inputClass} mt-1.5`} />
          </label>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : 'Change password'}
          </button>
          <a href="/login" className="block text-center text-xs text-slate-400 hover:text-white">
            Back to sign in
          </a>
        </form>
      </div>
    </div>
  )
}
