import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRuns, loadDeployments } from '@/lib/data-store'
import { loadIncidents } from '@/lib/oncall-store'

function dateKey(d: Date): string { return d.toISOString().slice(0, 10) }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d }

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  const runs        = loadRuns()
  const deployments = loadDeployments()
  const now         = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const recentRuns  = runs.filter(r => new Date(r.startedAt).getTime() > thirtyDaysAgo)
  const recentDeps  = deployments.filter(d => new Date(d.deployedAt).getTime() > thirtyDaysAgo)

  // DORA — Deployment Frequency (deploys per week over last 30 days)
  const deployFrequency = Math.round((recentDeps.length / 30) * 7 * 10) / 10

  // DORA — Lead Time (avg duration of successful runs as proxy)
  const successRuns = recentRuns.filter(r => r.status === 'success' && r.durationMs)
  const leadTimeHours = successRuns.length > 0
    ? Math.round(successRuns.reduce((s, r) => s + (r.durationMs! / 3600000), 0) / successRuns.length * 10) / 10
    : 0

  // DORA — MTTR (avg time to resolve: time from failed run to next success on same pipeline, mins)
  // DORA — MTTR: mean minutes from incident createdAt to resolvedAt (last 30 days)
  const incidents = loadIncidents()
  const resolvedIncidents = incidents.filter(i =>
    i.status === 'resolved' && new Date(i.createdAt).getTime() > thirtyDaysAgo
  )
  const mttrMinutes: number | null = resolvedIncidents.length > 0
    ? Math.round(
        resolvedIncidents.reduce((sum, i) => {
          const end = i.resolvedAt ?? i.updatedAt
          return sum + (new Date(end).getTime() - new Date(i.createdAt).getTime()) / 60000
        }, 0) / resolvedIncidents.length
      )
    : null

  // DORA — Change Failure Rate
  const total = recentRuns.length
  const failed = recentRuns.filter(r => r.status === 'failed').length
  const changeFailureRate = total > 0 ? Math.round((failed / total) * 100 * 10) / 10 : 0

  // Daily runs for chart (last 7 days)
  const dailyRuns: Record<string, { success: number; failed: number }> = {}
  for (let i = 6; i >= 0; i--) {
    dailyRuns[dateKey(daysAgo(i))] = { success: 0, failed: 0 }
  }
  for (const r of runs) {
    const key = dateKey(new Date(r.startedAt))
    if (dailyRuns[key]) {
      if (r.status === 'success') dailyRuns[key].success++
      else if (r.status === 'failed') dailyRuns[key].failed++
    }
  }

  // Build time trend (last 7 days avg duration in ms)
  const buildTimeTrend: Record<string, { total: number; count: number }> = {}
  for (let i = 6; i >= 0; i--) {
    buildTimeTrend[dateKey(daysAgo(i))] = { total: 0, count: 0 }
  }
  for (const r of successRuns) {
    const key = dateKey(new Date(r.startedAt))
    if (buildTimeTrend[key]) {
      buildTimeTrend[key].total += r.durationMs!
      buildTimeTrend[key].count++
    }
  }

  // Top failing pipelines
  const pipelineStats: Record<string, { name: string; runs: number; failed: number }> = {}
  for (const r of recentRuns) {
    if (!pipelineStats[r.pipelineId]) pipelineStats[r.pipelineId] = { name: r.pipelineName, runs: 0, failed: 0 }
    pipelineStats[r.pipelineId].runs++
    if (r.status === 'failed') pipelineStats[r.pipelineId].failed++
  }
  const topFailingPipelines = Object.values(pipelineStats)
    .filter(p => p.runs > 0 && p.failed > 0)
    .map(p => ({ name: p.name, failRate: (p.failed / p.runs) * 100, runs: p.runs }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5)

  return NextResponse.json({
    deployFrequency,
    leadTimeHours,
    mttrMinutes,
    changeFailureRate,
    dailyRuns: Object.entries(dailyRuns).map(([date, v]) => ({ date, ...v })),
    buildTimeTrend: Object.entries(buildTimeTrend).map(([date, v]) => ({ date, avgMs: v.count > 0 ? Math.round(v.total / v.count) : 0 })),
    topFailingPipelines,
  })
}
