import { NextRequest, NextResponse } from 'next/server'
import { loadRuns, updateRun, savePipelines, loadPipelines, addDeployment, type PipelineRunStatus } from '@/lib/data-store'
import { createIncident, loadIncidents } from '@/lib/oncall-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

interface StageUpdate {
  stage: string
  status: PipelineRunStatus
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  exitCode?: number
  image?: string
  k8sNamespace?: string
}

// POST /api/runs/[id]/stage — runner reports stage status change
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!authRunner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json() as StageUpdate
  if (!body.stage || !body.status) {
    return NextResponse.json({ error: 'stage and status required' }, { status: 400 })
  }

  const runs = loadRuns()
  const run = runs.find(r => r.id === id)
  if (!run) return NextResponse.json({ error: 'run not found' }, { status: 404 })

  const stageIdx = run.stages.findIndex(s => s.name === body.stage)
  if (stageIdx === -1) return NextResponse.json({ error: 'stage not found' }, { status: 404 })

  run.stages[stageIdx] = {
    ...run.stages[stageIdx],
    status: body.status,
    ...(body.startedAt && { startedAt: body.startedAt }),
    ...(body.finishedAt && { finishedAt: body.finishedAt }),
    ...(body.durationMs !== undefined && { durationMs: body.durationMs }),
    ...(body.exitCode !== undefined && { exitCode: body.exitCode }),
  }

  // Derive overall run status from stages
  const statuses = run.stages.map(s => s.status)
  let runStatus: PipelineRunStatus = run.status
  if (statuses.every(s => s === 'pending')) runStatus = 'pending'
  else if (statuses.some(s => s === 'running')) runStatus = 'running'
  else if (statuses.some(s => s === 'failed')) runStatus = 'failed'
  else if (statuses.every(s => s === 'success' || s === 'skipped')) runStatus = 'success'
  else if (statuses.some(s => s === 'running' || s === 'pending')) runStatus = 'running'

  const now = new Date().toISOString()
  const isTerminal = runStatus === 'success' || runStatus === 'failed' || runStatus === 'cancelled'

  const updated = updateRun(id, {
    stages: run.stages,
    status: runStatus,
    ...(run.status === 'pending' && runStatus === 'running' ? { startedAt: now } : {}),
    ...(isTerminal && !run.finishedAt
      ? {
          finishedAt: now,
          durationMs: new Date(now).getTime() - new Date(run.startedAt).getTime(),
        }
      : {}),
  })

  if (!updated) return NextResponse.json({ error: 'update failed' }, { status: 500 })

  // Auto-create incident when a run transitions to failed
  if (runStatus === 'failed' && run.status !== 'failed') {
    try {
      const existing = loadIncidents().find(i => i.runId === id && i.status !== 'resolved')
      if (!existing) {
        const failedStage = run.stages.find(s => s.status === 'failed')
        const stageType = failedStage?.type ?? 'run'
        const category = stageType === 'deploy' ? 'deploy-failure'
          : stageType === 'test' ? 'test-failure'
          : stageType === 'scan' ? 'security'
          : stageType === 'build' ? 'build-failure'
          : 'build-failure'
        const severity = (stageType === 'deploy' || stageType === 'scan') ? 'high' : 'medium'
        createIncident({
          title: `Pipeline failed: ${run.pipelineName} on ${run.branch}`,
          severity,
          status: 'open',
          category,
          source: run.pipelineName,
          runId: id,
          repo: run.repoFullName,
          branch: run.branch,
          commit: run.commit,
          author: run.author,
        })
      }
    } catch { /* non-fatal */ }
  }

  // Sync pipeline lastRunStatus
  const pipelines = loadPipelines()
  const pIdx = pipelines.findIndex(p => p.id === updated.pipelineId)
  if (pIdx !== -1 && pipelines[pIdx].lastRunId === id) {
    pipelines[pIdx].lastRunStatus = runStatus
    pipelines[pIdx].updatedAt = now
    savePipelines(pipelines)
  }

  // Auto-create deployment record when a deploy stage succeeds
  const completedStage = run.stages[stageIdx]
  if (
    body.status === 'success' &&
    completedStage.type === 'deploy' &&
    completedStage.environment
  ) {
    try {
      // Parse k8sNamespace from manifest YAML if not provided by runner
      let k8sNamespace = body.k8sNamespace
      if (!k8sNamespace && completedStage.manifest) {
        const match = completedStage.manifest.match(/^\s*namespace:\s*(\S+)/m)
        if (match) k8sNamespace = match[1]
      }
      addDeployment({
        runId: id,
        pipelineName: run.pipelineName,
        repoFullName: run.repoFullName,
        environment: completedStage.environment,
        version: run.commit.slice(0, 7),
        commit: run.commit,
        author: run.author,
        status: 'healthy',
        healthGatePassed: true,
        rolledBack: false,
        deployedAt: now,
        finishedAt: body.finishedAt ?? now,
        ...(body.durationMs !== undefined && { durationMs: body.durationMs }),
        ...(body.image ? { image: body.image } : {}),
        ...(k8sNamespace ? { k8sNamespace } : {}),
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, runStatus })
}
