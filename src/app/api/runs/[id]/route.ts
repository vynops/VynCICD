import { NextRequest, NextResponse } from 'next/server'
import { loadRuns, updateRun, loadEnvironments, type PipelineRunStatus } from '@/lib/data-store'
import { createIncident, loadIncidents } from '@/lib/oncall-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

// GET /api/runs/[id] — fetch single run (runner or authenticated user)
// Deploy stages are enriched with $DEPLOY_* env vars resolved from the environment record
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const runs = loadRuns()
  const run = runs.find(r => r.id === id)
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Enrich deploy stages with resolved environment variables
  const environments = loadEnvironments()
  const enriched = {
    ...run,
    stages: run.stages.map(stage => {
      if (stage.type !== 'deploy' || !stage.environment) return stage
      // Prefer env with clusterName set when there are duplicates by name
      const matching = environments.filter(e => e.name === stage.environment)
      const env = matching.find(e => e.clusterName || e.variables?.['CLUSTER']) ?? matching[0]
      // stage.clusterName takes priority over environment record lookup
      const resolvedCluster = stage.clusterName
        || env?.clusterName
        || (env?.variables?.['CLUSTER'] as string | undefined)
        || ''
      return {
        ...stage,
        deployEnvVars: {
          DEPLOY_ENV:     stage.environment,
          DEPLOY_CLUSTER: resolvedCluster,
          DEPLOY_URL:     env?.url ?? '',
        },
      }
    }),
  }
  return NextResponse.json(enriched)
}

// PATCH /api/runs/[id] — runner updates overall run status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!authRunner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json() as { status: PipelineRunStatus; error?: string; finishedAt?: string; durationMs?: number }
  if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const now = new Date().toISOString()
  const isTerminal = body.status === 'success' || body.status === 'failed' || body.status === 'cancelled'

  // Calculate durationMs server-side if not provided by runner and status is terminal
  let durationMs = body.durationMs
  if (durationMs === undefined && isTerminal) {
    const runs = loadRuns()
    const run = runs.find(r => r.id === id)
    if (run?.startedAt) {
      durationMs = new Date(now).getTime() - new Date(run.startedAt).getTime()
    }
  }

  const updated = updateRun(id, {
    status: body.status,
    ...(body.error ? { error: body.error } : {}),
    finishedAt: body.finishedAt ?? now,
    ...(durationMs !== undefined ? { durationMs } : {}),
  })

  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Auto-create incident if run transitions to failed
  if (body.status === 'failed') {
    try {
      const existing = loadIncidents().find(i => i.runId === id && i.status !== 'resolved')
      if (!existing) {
        createIncident({
          title: `Pipeline failed: ${updated.pipelineName} on ${updated.branch}`,
          severity: 'medium',
          status: 'open',
          category: 'build-failure',
          source: updated.pipelineName,
          runId: id,
          repo: updated.repoFullName,
          branch: updated.branch,
          commit: updated.commit,
          author: updated.author,
        })
      }
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true })
}
