import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPipelines, savePipelines, loadRepos } from '@/lib/data-store'
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
  const { name, repoId, branch, triggerOn, stages, environments } = body

  if (!name || !repoId || !branch || !stages?.length) {
    return NextResponse.json({ error: 'name, repoId, branch, stages are required' }, { status: 400 })
  }

  const repo = loadRepos().find(r => r.id === repoId)
  if (!repo) return NextResponse.json({ error: 'repo not found' }, { status: 404 })

  const now = new Date().toISOString()
  const pipeline = {
    id: `p-${crypto.randomUUID().slice(0, 8)}`,
    name,
    repoId,
    repoFullName: repo.fullName,
    branch,
    triggerOn: triggerOn ?? ['push'],
    stages,
    environments: environments ?? [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }

  const pipelines = loadPipelines()
  pipelines.push(pipeline)
  savePipelines(pipelines)

  return NextResponse.json(pipeline, { status: 201 })
}
