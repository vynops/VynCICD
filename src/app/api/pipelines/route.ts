import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPipelines, savePipelines, loadRepos, type Pipeline } from '@/lib/data-store'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadPipelines())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { name, repoId, branch, triggerOn, stages, environments, executionMode, jenkinsJob, jenkinsfilePath, jenkinsParameters } = body

  if (!name || !repoId || !branch) {
    return NextResponse.json({ error: 'name, repoId, and branch are required' }, { status: 400 })
  }
  if (executionMode !== 'jenkinsfile' && !stages?.length) {
    return NextResponse.json({ error: 'native pipelines require at least one stage' }, { status: 400 })
  }
  if (executionMode === 'jenkinsfile' && !jenkinsJob) {
    return NextResponse.json({ error: 'jenkinsJob is required for Jenkinsfile pipelines' }, { status: 400 })
  }

  const repo = loadRepos().find(r => r.id === repoId)
  if (!repo) return NextResponse.json({ error: 'repo not found' }, { status: 404 })

  const now = new Date().toISOString()
  const pipeline: Pipeline = {
    id: `p-${crypto.randomUUID().slice(0, 8)}`,
    name,
    repoId,
    repoFullName: repo.fullName,
    executionMode: executionMode === 'jenkinsfile' ? 'jenkinsfile' : 'native',
    branch,
    triggerOn: triggerOn ?? ['push'],
    stages,
    environments: environments ?? [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...(executionMode === 'jenkinsfile' ? { jenkinsJob, jenkinsfilePath: jenkinsfilePath || 'Jenkinsfile', jenkinsParameters: jenkinsParameters ?? {} } : {}),
  }

  const pipelines = loadPipelines()
  pipelines.push(pipeline)
  savePipelines(pipelines)

  return NextResponse.json(pipeline, { status: 201 })
}
