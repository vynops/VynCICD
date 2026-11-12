'use client'

import { usePathname } from 'next/navigation'
import { RefreshCw, LogOut, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { useState } from 'react'
import { fetchJson, fetchList } from '@/lib/fetch-json'
import type { Incident } from '@/lib/oncall-store'


const TITLES: Record<string, string> = {
  '/overview':     'Overview',
  '/pipelines':    'Pipelines',
  '/runs':         'Pipeline Runs',
  '/repositories': 'Repositories',
  '/environments': 'Environments',
  '/deployments':  'Deployments',
  '/security':     'Security & Compliance',
  '/analytics':    'Analytics & DORA',
  '/incidents':    'Incidents',
  '/oncall':       'On-Call',
  '/routing':      'Routing & Escalations',
  '/copilot':      'AI Copilot',
  '/team':         'Team',
  '/settings':     'Settings',
}

const DESCRIPTIONS: Record<string, string> = {
  '/overview':     'Real-time snapshot of your CI/CD pipeline health and DORA metrics',
  '/pipelines':    'Manage and configure your CI/CD pipeline definitions',
  '/runs':         'Monitor all pipeline executions, view stage logs, and triage failures with AI',
  '/repositories': 'Connected source code repositories and webhook status',
  '/environments': 'Deployment targets and environment configuration',
  '/deployments':  'Track all deployments across environments with rollback support',
  '/security':     'Vulnerability scans, CVE tracking, and secrets detection across pipelines',
  '/analytics':    'Elite software delivery performance metrics and build activity trends',
  '/incidents':    'Manage and respond to pipeline failures and service incidents',
  '/oncall':       'Schedule and manage on-call shifts and rotations',
  '/routing':      'Route alerts to the right teams and auto-escalate unacknowledged incidents',
  '/copilot':      'Ask anything about your pipelines, failures, security findings, or DORA metrics',
  '/team':         'Manage team members and role-based access control',
  '/settings':     'Configure integrations, notifications, AI, and platform preferences',
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const title = TITLES[pathname] ?? 'VynCICD'
  const description = DESCRIPTIONS[pathname]
  const { mutate } = useSWRConfig()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const { data: incidents, error: incidentError } = useSWR<Incident[]>('/api/incidents', fetchList, { refreshInterval: 30000 })
  const openCount = Array.isArray(incidents)
    ? incidents.filter((i: { status: string }) => i.status !== 'resolved').length
    : 0

  async function handleLogout() {
    setLogoutError('')
    setLoggingOut(true)
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' })
      await mutate(key => typeof key === 'string' && key.startsWith('/api/'), undefined, { revalidate: false })
      router.push('/login')
      router.refresh()
    } catch {
      setLogoutError('Sign out failed. Please retry.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="h-[4.5rem] border-b border-slate-800/60 flex items-center justify-between px-4 sm:px-6 bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
      <div className="pl-10 lg:pl-0">
        <h1 className="text-base font-bold text-white tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-xs text-slate-400 mt-1 leading-tight">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {logoutError && <span role="alert" className="text-xs text-red-400">{logoutError}</span>}
        {incidentError && <span role="alert" className="text-xs text-red-400">Incident count unavailable</span>}
        <button
          onClick={() => window.location.reload()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <Link
          href="/incidents?status=open"
          title={openCount > 0 ? `${openCount} open incident${openCount > 1 ? 's' : ''}` : 'Incidents'}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {openCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-[#0d1117]" />
          )}
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          CICD Pipeline
        </span>
      </div>
    </header>
  )
}

