'use client'

import { usePathname } from 'next/navigation'
import { RefreshCw, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="h-[4.5rem] border-b border-slate-800/60 flex items-center justify-between px-4 sm:px-6 bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
      <div className="pl-10 lg:pl-0">
        <h1 className="text-base font-bold text-white tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-xs text-slate-400 mt-1 leading-tight">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
