'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import {
  LayoutDashboard, GitBranch, Play, BookOpen, Layers,
  Rocket, Shield, BarChart2, AlertTriangle, Phone,
  GitMerge, Bot, Users, Settings, LogOut, Menu, X, ChevronRight,
  GitCommit,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Pipeline',
    items: [
      { href: '/overview',     label: 'Overview',      icon: LayoutDashboard },
      { href: '/pipelines',    label: 'Pipelines',     icon: GitBranch },
      { href: '/runs',         label: 'Runs',          icon: Play },
      { href: '/repositories', label: 'Repositories',  icon: BookOpen },
    ],
  },
  {
    label: 'Deploy',
    items: [
      { href: '/environments', label: 'Environments',  icon: Layers },
      { href: '/deployments',  label: 'Deployments',   icon: Rocket },
      { href: '/security',     label: 'Security',      icon: Shield },
    ],
  },
  {
    label: 'Observe',
    items: [
      { href: '/analytics',    label: 'Analytics & DORA', icon: BarChart2 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/incidents',    label: 'Incidents',           icon: AlertTriangle },
      { href: '/oncall',       label: 'On-Call',             icon: Phone },
      { href: '/routing',      label: 'Routing & Escalations', icon: GitMerge },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/copilot',      label: 'AI Copilot',          icon: Bot },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/team',     label: 'Team',     icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
      <span className="truncate">{item.label}</span>
      {active && <ChevronRight className="w-3 h-3 ml-auto text-emerald-500 flex-shrink-0" />}
    </Link>
  )
}

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const router = useRouter()
  const { data: me } = useSWR('/api/auth/me', fetcher)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800/60">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <GitCommit className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base leading-none">VynCICD</div>
          <div className="text-slate-500 text-xs leading-none mt-0.5">CI/CD Platform</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.href} item={item} active={pathname === item.href} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-slate-800/60 pt-2 space-y-0.5">
          {BOTTOM_ITEMS.map(item => (
            <NavLink key={item.href} item={item} active={pathname === item.href} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-slate-800/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-xs font-bold">
              {me?.name ? me.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-white truncate">{me?.name ?? '…'}</div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider truncate">{me?.role ?? ''}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="px-2 pt-1 pb-0.5">
          <p className="text-[9px] text-slate-600 font-medium tracking-wide">Part of <span className="text-slate-500">VynOps Suite</span></p>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-[#0d1117] border-r border-slate-800/60 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile: hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 flex items-center justify-center rounded-lg bg-[#0d1117] border border-slate-800 text-slate-400 hover:text-white shadow"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile: drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-[#0d1117] border-r border-slate-800/60 h-full flex flex-col z-10">
            <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}

