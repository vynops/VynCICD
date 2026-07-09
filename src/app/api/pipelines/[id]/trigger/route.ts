import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPipelines, savePipelines, loadRepos, addRun, type StageRun } from '@/lib/data-store'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const pipelines = loadPipelines()
  const idx = pipelines.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })

  const pipeline = pipelines[idx]
  const repos = loadRepos()
  const repo = repos.find(r => r.id === pipeline.repoId)
  const now = new Date().toISOString()

  const stageRuns: StageRun[] = pipeline.stages.map(s => ({
    name: s.name,
    type: s.type,
    run: s.run,
    image: s.image,
    manifest: s.manifest,
    environment: s.environment,
    clusterName: s.clusterName,
    allowFailure: s.allowFailure,
    status: 'pending',
    logs: [],
    retries: 0,
  }))

  const run = addRun({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    repoFullName: repo?.fullName ?? pipeline.repoFullName,
    branch: pipeline.branch === '**' ? 'main' : pipeline.branch,
    commit: 'manual',
    commitMessage: 'Manual run triggered',
    author: auth.name,
    authorEmail: auth.email,
    trigger: 'manual',
    status: 'pending',
    cloneUrl: repo?.cloneUrl,
    provider: repo?.provider,
    stages: stageRuns,
    startedAt: now,
  })

  pipelines[idx] = { ...pipeline, lastRunId: run.id, lastRunStatus: 'pending', lastRunAt: now, updatedAt: now }
  savePipelines(pipelines)

  console.log(`[manual-trigger] pipeline=${pipeline.name} run=${run.id}`)
  return NextResponse.json({ ok: true, runId: run.id }, { status: 201 })
}
