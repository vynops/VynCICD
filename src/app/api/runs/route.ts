import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRuns, addRun } from '@/lib/data-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

export async function GET(req: NextRequest) {
  // Allow runner to poll pending runs without session auth
  const isRunner = authRunner(req) && req.headers.has('x-runner-token')

  if (!isRunner) {
    const auth = await requireRole(req, 'viewer')
    if (auth instanceof NextResponse) return auth
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100')
  const pipelineId = req.nextUrl.searchParams.get('pipelineId')
  const status = req.nextUrl.searchParams.get('status')
  let runs = loadRuns()
  if (pipelineId) runs = runs.filter(r => r.pipelineId === pipelineId)
  if (status) runs = runs.filter(r => r.status === status)
  return NextResponse.json(runs.slice(0, limit))
}

