'use client'

import useSWR from 'swr'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, AlertTriangle, CheckCircle, XCircle, AlertCircle, RefreshCw, Key } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'
import type { SecurityScan, Vulnerability } from '@/lib/data-store'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status}).`)
  const data = await response.json()
  if (url === '/api/security' && !Array.isArray(data)) throw new Error('Invalid scan results response.')
  return data
}

type FindingFilter = 'all' | 'critical' | 'high' | 'secrets' | 'blocked'

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
  error:   { label: 'Scanner error', icon: <XCircle className="w-4 h-4 text-red-400" />, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
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
      <div className="text-[11px] text-slate-300 mt-2">
        {vuln.fixedVersion ? `Upgrade to ${vuln.fixedVersion}, then rerun the pipeline.` : 'No fixed version reported. Review the advisory for mitigations.'}
      </div>
      {vuln.cveId && (
        <a href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(vuln.cveId)}`} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 block font-mono">{vuln.cveId}</a>
      )}
    </div>
  )
}

function SecurityContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { data, error, isLoading, mutate } = useSWR<SecurityScan[]>('/api/security', fetcher, { refreshInterval: 30000 })
  const { data: account } = useSWR<{ role: string }>('/api/auth/me', fetcher)
  const scans = data ?? []
  const [focusedScanId, setFocusedScanId] = useState<string | null>(null)
  const [focusedRunId, setFocusedRunId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FindingFilter>('all')
  const [includeHistory, setIncludeHistory] = useState(false)
  const [rerunningId, setRerunningId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setFocusedScanId(params.get('scanId'))
    setFocusedRunId(params.get('runId'))
    setIncludeHistory(params.has('scanId') || params.has('runId'))
  }, [params])

  useEffect(() => {
    if (!focusedScanId || scans.length === 0) return
    document.getElementById(`scan-${focusedScanId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedScanId, scans])

  const sorted = [...scans].sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt))
  const latest = new Map<string, SecurityScan>()
  for (const scan of sorted) {
    const key = JSON.stringify([scan.pipelineId ?? scan.repoFullName, scan.stageName ?? '', scan.scanType])
    if (!latest.has(key)) latest.set(key, scan)
  }

  const selected = (includeHistory ? sorted : [...latest.values()]).filter(scan =>
    (!focusedRunId || scan.runId === focusedRunId) && (!focusedScanId || scan.id === focusedScanId)
  )
  const complete = selected.filter(scan => scan.status !== 'skipped' && scan.status !== 'error')
  const hasVulnerabilityResults = complete.some(scan => scan.scanType !== 'secret' && scan.scanType !== 'sbom')
  const hasSecretResults = complete.some(scan => scan.scanType === 'secret' || scan.secretsFound > 0)
  const totalCritical = selected.reduce((sum, scan) => sum + scan.vulnerabilities.filter(v => v.severity === 'critical').length, 0)
  const totalHigh = selected.reduce((sum, scan) => sum + scan.vulnerabilities.filter(v => v.severity === 'high').length, 0)
  const totalSecrets = selected.reduce((sum, scan) => sum + scan.secretsFound, 0)
  const blocked = new Set(selected.filter(scan => scan.blockedBuild).map(scan => scan.runId)).size
  const visible = selected.filter(scan => {
    if (filter === 'critical' || filter === 'high') return scan.vulnerabilities.some(v => v.severity === filter)
    if (filter === 'secrets') return scan.secretsFound > 0
    if (filter === 'blocked') return scan.blockedBuild
    return true
  })
  const canRerun = account?.role === 'admin' || account?.role === 'editor'
  const cards: { key: FindingFilter; label: string; value: number | null; icon: React.ReactNode }[] = [
    { key: 'critical', label: 'Critical CVEs', value: hasVulnerabilityResults || totalCritical ? totalCritical : null, icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'high', label: 'High CVEs', value: hasVulnerabilityResults || totalHigh ? totalHigh : null, icon: <AlertCircle className="w-4 h-4" /> },
    { key: 'secrets', label: 'Secrets Found', value: hasSecretResults || totalSecrets ? totalSecrets : null, icon: <Key className="w-4 h-4" /> },
    { key: 'blocked', label: 'Builds Blocked', value: selected.some(scan => scan.status !== 'skipped') ? blocked : null, icon: <Shield className="w-4 h-4" /> },
  ]

  async function rerun(scan: SecurityScan) {
    setActionError('')
    setRerunningId(scan.id)
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(scan.runId)}`)
      const run = await response.json()
      if (!response.ok || typeof run.pipelineId !== 'string') {
        throw new Error(run.error ?? 'The affected run is no longer available.')
      }
      if (run.status === 'pending' || run.status === 'running') throw new Error('This run is still active. Wait for it to finish.')
      if (!window.confirm('Start the full pipeline again using its current configuration and branch? This may include deployment stages.')) return
      const triggered = await fetch(`/api/pipelines/${encodeURIComponent(run.pipelineId)}/trigger`, { method: 'POST' })
      const result = await triggered.json()
      if (!triggered.ok || typeof result.runId !== 'string') throw new Error(result.error ?? 'Unable to start the pipeline.')
      router.push(`/runs?runId=${encodeURIComponent(result.runId)}`)
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Unable to start the pipeline.')
    } finally {
      setRerunningId(null)
    }
  }

  return (
    <div className="space-y-5 max-w-screen-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(card => {
          const color = card.value === null ? 'text-slate-500' : card.value > 0 ? card.key === 'high' ? 'text-orange-400' : 'text-red-400' : 'text-emerald-400'
          return (
            <button type="button" key={card.key} aria-pressed={filter === card.key}
              onClick={() => setFilter(filter === card.key ? 'all' : card.key)}
              className={cn('bg-[#0d1117] border rounded-xl p-4 text-left hover:border-slate-500 focus-visible:outline focus-visible:outline-emerald-500',
                filter === card.key ? 'border-emerald-500' : 'border-slate-800/60')}>
              <div className={cn('flex items-center gap-2 mb-2', color)}>{card.icon}<span className="text-xs font-medium text-slate-400">{card.label}</span></div>
              <div className={cn('text-2xl font-black', color)}>{card.value ?? '-'}</div>
              {card.value === null && <div className="text-[10px] text-slate-500 mt-1">No completed results</div>}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <button type="button" onClick={() => setFilter('all')} aria-pressed={filter === 'all'}
          className="rounded-lg border border-slate-700 px-3 py-1.5 hover:text-white">All findings</button>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={includeHistory} onChange={event => setIncludeHistory(event.target.checked)} />
          Include previous scans
        </label>
        <button type="button" onClick={() => mutate()} className="ml-auto flex items-center gap-1.5 hover:text-white">
          <RefreshCw size={13} /> Refresh results
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {includeHistory ? 'Showing recorded scan history.' : 'Showing the latest result per pipeline, stage and scan type; newer results replace older findings in these totals.'}
        {' '}Builds Blocked counts unique runs, not scan records.
      </p>
      {(focusedRunId || focusedScanId) && (
        <div className="text-xs text-slate-300 flex items-center gap-3">
          Viewing {focusedRunId ? `run ${focusedRunId}` : `scan ${focusedScanId}`}
          <button type="button" className="text-emerald-400 underline" onClick={() => {
            setFocusedRunId(null)
            setFocusedScanId(null)
            window.history.replaceState(null, '', '/security')
          }}>Clear reference</button>
        </div>
      )}
      {error && <div role="alert" className="text-sm text-red-400">Unable to load scan results. Refresh to retry; any displayed results may be stale.</div>}
      {actionError && <div role="alert" className="text-sm text-red-400">{actionError}</div>}
      {selected.some(scan => scan.status === 'error' || scan.status === 'skipped') && (
        <div role="status" className="text-xs text-amber-400">Some scans failed or were skipped. Missing results do not confirm that the code is clean.</div>
      )}
      <h2 className="text-sm font-semibold text-slate-300">
        {filter === 'all' ? 'Scan results' : `Filtered results: ${cards.find(card => card.key === filter)?.label}`} ({visible.length})
      </h2>
      <div className="space-y-4">
        {visible.map(scan => {
          const s = STATUS_MAP[scan.status] ?? STATUS_MAP.skipped
          const vulnerabilities = filter === 'secrets' ? [] : scan.vulnerabilities.filter(v =>
            filter !== 'critical' && filter !== 'high' || v.severity === filter
          )
          const showSecrets = filter !== 'critical' && filter !== 'high' && scan.secretsFound > 0
          return (
            <div key={scan.id} id={`scan-${scan.id}`} className={cn('bg-[#0d1117] border rounded-xl overflow-hidden scroll-mt-6',
              scan.id === focusedScanId ? 'border-emerald-500' : 'border-slate-800/60')}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-800/60">
                {s.icon}
                <div>
                  <div className="text-sm font-semibold text-white">{scan.repoFullName}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{scan.scanType} scan · {scan.image ?? 'source code'}</div>
                  {scan.stageName && <div className="text-[10px] text-slate-500">{scan.pipelineName} · {scan.stageName}</div>}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', s.color)}>{s.label}</span>
                  {scan.blockedBuild && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Build Blocked</span>
                  )}
                  <span className="text-[10px] text-slate-600">{timeAgo(scan.scannedAt)}</span>
                  <Link href={`/runs?runId=${encodeURIComponent(scan.runId)}`} className="text-xs text-emerald-400 hover:underline">View run</Link>
                  {canRerun && (
                    <button type="button" disabled={rerunningId !== null} onClick={() => rerun(scan)}
                      className="text-xs text-blue-400 hover:underline disabled:opacity-50">
                      {rerunningId === scan.id ? 'Starting...' : 'Run pipeline again'}
                    </button>
                  )}
                </div>
              </div>
              {scan.blockedBuild && <p className="px-4 pt-3 text-xs text-red-300">
                {scan.status === 'error' ? 'Blocked because the scanner could not verify this build.' : 'Blocked by the security gate. Fix the findings, then run the pipeline again.'}
              </p>}
              {scan.status === 'error' || scan.status === 'skipped' ? (
                <p className="px-4 py-4 text-sm text-slate-400">
                  {scan.status === 'error' ? scan.error ?? 'Scanner failed. Open the affected run for logs.' : 'Scan skipped; no clean result was established.'}
                </p>
              ) : vulnerabilities.length === 0 && !showSecrets && (
                <p className="px-4 py-4 text-sm text-slate-400">
                  {scan.scanType === 'secret' ? 'No secrets detected in this completed scan.' : scan.scanType === 'sbom' ? 'SBOM generation completed.' : 'No vulnerabilities found in this completed scan.'}
                </p>
              )}
              {vulnerabilities.length > 0 && (
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {vulnerabilities.map(v => <VulnBadge key={v.id} vuln={v} />)}
                  </div>
                </div>
              )}
              {showSecrets && (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-red-300">{scan.secretsFound} secret{scan.secretsFound === 1 ? '' : 's'} detected</p>
                  <p className="text-xs text-slate-400">Revoke or rotate the credential, remove it from source and history, then rerun. Secret values are never displayed.</p>
                  {scan.secretFindings?.map(finding => (
                    <div key={finding.id} className="text-xs rounded-lg border border-slate-800 p-3 text-slate-300">
                      <div>{finding.title} · {finding.ruleId}</div>
                      <div className="font-mono text-slate-400 mt-1">{finding.filePath}{finding.startLine ? `:${finding.startLine}` : ''}</div>
                    </div>
                  ))}
                  {!scan.secretFindings?.length && <p className="text-xs text-slate-500">This scanner did not record finding locations. See the affected run.</p>}
                </div>
              )}
            </div>
          )
        })}
        {isLoading && <div role="status" className="text-sm text-slate-400">Loading scan results...</div>}
        {!isLoading && !error && scans.length === 0 && (
          <div className="bg-[#0d1117] border border-dashed border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600">
            No recorded security scans yet. This does not mean the code is clean.
            {' '}<Link href="/settings" className="text-emerald-400 underline">Configure scanning</Link>,
            {' '}then <Link href="/pipelines" className="text-emerald-400 underline">run a pipeline with a scan stage</Link>.
          </div>
        )}
        {scans.length > 0 && visible.length === 0 && (
          <p className="text-sm text-slate-500">{selected.length === 0 ? 'No scan results recorded for this reference.' : 'No findings match this filter.'}</p>
        )}
      </div>
    </div>
  )
}

export default function SecurityPage() {
  return <Suspense fallback={<p role="status">Loading scan results...</p>}><SecurityContent /></Suspense>
}
