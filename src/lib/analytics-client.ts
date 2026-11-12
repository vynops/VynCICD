import { fetchJson } from '@/lib/fetch-json'

export interface DoraSummary {
  deployFrequency: number
  leadTimeHours: number
  mttrMinutes: number | null
  changeFailureRate: number
  targets: { deploymentFrequency: number; leadTimeHours: number; mttrMinutes: number; changeFailureRate: number }
  sampleCounts: { successfulRuns: number; completedRuns: number; deployments: number }
  from: string
}

export interface DoraData extends DoraSummary {
  dailyRuns: { date: string; success: number; failed: number }[]
  buildTimeTrend: { date: string; avgMs: number }[]
  topFailingPipelines: { pipelineId: string; name: string; failRate: number; runs: number }[]
}

function validSummary(data: DoraSummary): boolean {
  return Boolean(data && data.targets && data.sampleCounts
    && [data.deployFrequency, data.leadTimeHours, data.changeFailureRate,
      data.targets.deploymentFrequency, data.targets.leadTimeHours, data.targets.mttrMinutes,
      data.targets.changeFailureRate, data.sampleCounts.successfulRuns,
      data.sampleCounts.completedRuns, data.sampleCounts.deployments].every(Number.isFinite)
    && (data.mttrMinutes === null || Number.isFinite(data.mttrMinutes))
    && typeof data.from === 'string' && Number.isFinite(Date.parse(data.from)))
}

export async function fetchAnalyticsSummary(url: string): Promise<DoraSummary> {
  const data = await fetchJson<DoraSummary>(url)
  if (!validSummary(data)) throw new Error('Invalid analytics summary response.')
  return data
}

export async function fetchAnalytics(url: string): Promise<DoraData> {
  const data = await fetchJson<DoraData>(url)
  if (!validSummary(data)
    || !Array.isArray(data.dailyRuns) || !Array.isArray(data.buildTimeTrend) || !Array.isArray(data.topFailingPipelines)
    || data.dailyRuns.some(day => !day || typeof day.date !== 'string' || !Number.isFinite(day.success) || !Number.isFinite(day.failed))
    || data.buildTimeTrend.some(day => !day || typeof day.date !== 'string' || !Number.isFinite(day.avgMs))
    || data.topFailingPipelines.some(row => !row || typeof row.pipelineId !== 'string' || typeof row.name !== 'string'
      || !Number.isFinite(row.failRate) || !Number.isFinite(row.runs))) {
    throw new Error('Invalid analytics response.')
  }
  return data
}
