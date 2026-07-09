import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRuns, loadDeployments } from '@/lib/data-store'
import { loadIncidents } from '@/lib/oncall-store'

// Summary endpoint for the overview DORA widget
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  const runs = loadRuns()
  const deps = loadDeployments()
  const incidents = loadIncidents()
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentDeps = deps.filter(d => new Date(d.deployedAt).getTime() > thirtyDaysAgo)
  const recentRuns = runs.filter(r => new Date(r.startedAt).getTime() > thirtyDaysAgo)

  const deployFrequency = Math.round((recentDeps.length / 30) * 7 * 10) / 10
  const successRuns = recentRuns.filter(r => r.status === 'success' && r.durationMs)
  const leadTimeHours = successRuns.length > 0
    ? Math.round(successRuns.reduce((s, r) => s + (r.durationMs! / 3600000), 0) / successRuns.length * 10) / 10
    : 0
  const total = recentRuns.length
  const failed = recentRuns.filter(r => r.status === 'failed').length
  const changeFailureRate = total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0

  // MTTR: mean time to resolve — average minutes from createdAt to resolvedAt (or updatedAt)
  // across all resolved incidents in the last 30 days
  const resolvedIncidents = incidents.filter(i =>
    i.status === 'resolved' &&
    new Date(i.createdAt).getTime() > thirtyDaysAgo
  )
  const mttrMinutes = resolvedIncidents.length > 0
    ? Math.round(
        resolvedIncidents.reduce((sum, i) => {
          const end = i.resolvedAt ?? i.updatedAt
          return sum + (new Date(end).getTime() - new Date(i.createdAt).getTime()) / 60000
        }, 0) / resolvedIncidents.length
      )
    : null  // null = no resolved incidents yet; UI should show '—' not a fake number

  return NextResponse.json({ deployFrequency, leadTimeHours, mttrMinutes, changeFailureRate })
}
