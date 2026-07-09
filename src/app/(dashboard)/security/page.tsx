'use client'

import useSWR from 'swr'
import { Shield, AlertTriangle, CheckCircle, XCircle, AlertCircle, Download, Key } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import type { SecurityScan, Vulnerability } from '@/lib/data-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SEV_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/15 border-red-500/30',
  high:     'text-orange-400 bg-orange-500/15 border-orange-500/30',
  medium:   'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  low:      'text-blue-400 bg-blue-500/15 border-blue-500/20',
  informational: 'text-slate-400 bg-slate-500/10 border-slate-700',
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  passed:  { label: 'Passed',  icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  warning: { label: 'Warning', icon: <AlertCircle className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  failed:  { label: 'Failed',  icon: <XCircle className="w-4 h-4 text-red-400" />,         color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  skipped: { label: 'Skipped', icon: <Shield className="w-4 h-4 text-slate-500" />,        color: 'text-slate-500 bg-slate-800 border-slate-700' },
}

function VulnBadge({ vuln }: { vuln: Vulnerability }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-mono font-bold text-white">{vuln.packageName}</span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 capitalize', SEV_COLOR[vuln.severity])}>{vuln.severity}</span>
      </div>
      <div className="text-[11px] text-slate-500 mb-1">
        {vuln.installedVersion} → {vuln.fixedVersion ?? 'no fix available'}
      </div>
      <div className="text-[11px] text-slate-400 line-clamp-2">{vuln.description}</div>
      {vuln.cveId && (
        <a href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 block font-mono">{vuln.cveId}</a>
      )}
    </div>
  )
}

export default function SecurityPage() {
  const { data: scans = [] } = useSWR<SecurityScan[]>('/api/security', fetcher, { refreshInterval: 30000 })

  const totalCritical = scans.reduce((sum, s) => sum + s.vulnerabilities.filter(v => v.severity === 'critical').length, 0)
  const totalHigh     = scans.reduce((sum, s) => sum + s.vulnerabilities.filter(v => v.severity === 'high').length, 0)
  const totalSecrets  = scans.reduce((sum, s) => sum + s.secretsFound, 0)
  const blocked       = scans.filter(s => s.blockedBuild).length

  return (
    <div className="space-y-5 max-w-screen-2xl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Critical CVEs', value: totalCritical, color: totalCritical > 0 ? 'text-red-400' : 'text-emerald-400', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'High CVEs',     value: totalHigh,     color: totalHigh > 0 ? 'text-orange-400' : 'text-emerald-400', icon: <AlertCircle className="w-4 h-4" /> },
          { label: 'Secrets Found', value: totalSecrets,  color: totalSecrets > 0 ? 'text-red-400' : 'text-emerald-400', icon: <Key className="w-4 h-4" /> },
          { label: 'Builds Blocked', value: blocked,      color: blocked > 0 ? 'text-red-400' : 'text-emerald-400', icon: <Shield className="w-4 h-4" /> },
        ].map(c => (
          <div key={c.label} className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-4">
            <div className={cn('flex items-center gap-2 mb-2', c.color)}>{c.icon}<span className="text-xs font-medium text-slate-400">{c.label}</span></div>
            <div className={cn('text-2xl font-black', c.color)}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Scan results */}
      <div className="space-y-4">
        {scans.map(scan => {
          const s = STATUS_MAP[scan.status] ?? STATUS_MAP.skipped
          return (
            <div key={scan.id} className="bg-[#0d1117] border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60">
                {s.icon}
                <div>
                  <div className="text-sm font-semibold text-white">{scan.repoFullName}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{scan.scanType} scan · {scan.image ?? 'source code'}</div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', s.color)}>{s.label}</span>
                  {scan.blockedBuild && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Build Blocked</span>
                  )}
                  <span className="text-[10px] text-slate-600">{timeAgo(scan.scannedAt)}</span>
                </div>
              </div>

              {scan.vulnerabilities.length > 0 ? (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    {['critical', 'high', 'medium', 'low'].map(sev => {
                      const count = scan.vulnerabilities.filter(v => v.severity === sev).length
                      if (count === 0) return null
                      return (
                        <span key={sev} className={cn('font-bold px-2 py-0.5 rounded border capitalize', SEV_COLOR[sev])}>
                          {count} {sev}
                        </span>
                      )
                    })}
                    {scan.secretsFound > 0 && (
                      <span className="font-bold px-2 py-0.5 rounded border text-red-400 bg-red-500/15 border-red-500/30">
                        {scan.secretsFound} secret{scan.secretsFound > 1 ? 's' : ''} detected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scan.vulnerabilities.map(v => <VulnBadge key={v.id} vuln={v} />)}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-600 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  No vulnerabilities found
                  {scan.secretsFound === 0 && ' · No secrets detected'}
                </div>
              )}
            </div>
          )
        })}
        {scans.length === 0 && (
          <div className="bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600">
            No security scans yet. Enable Trivy scanning in Settings.
          </div>
        )}
      </div>
    </div>
  )
}
