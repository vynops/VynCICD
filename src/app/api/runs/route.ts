import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRuns, addRun } from '@/lib/data-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return Boolean(RUNNER_SECRET) && token === RUNNER_SECRET
}

export async function GET(req: NextRequest) {
  // Allow runner to poll pending runs without session auth
  const isRunner = authRunner(req) && req.headers.has('x-runner-token')

  if (!isRunner) {
    const auth = await requireRole(req, 'viewer')
    if (auth instanceof NextResponse) return auth
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100')
  if (!Number.isSafeInteger(limit) || limit < 1) {
    return NextResponse.json({ error: 'limit must be a positive safe integer.' }, { status: 400 })
  }
  const pipelineId = req.nextUrl.searchParams.get('pipelineId')
  const status = req.nextUrl.searchParams.get('status')
  const from = req.nextUrl.searchParams.get('from')
  const date = req.nextUrl.searchParams.get('date')
  if (status && !['pending', 'running', 'success', 'failed', 'cancelled', 'completed'].includes(status)
    || from && !Number.isFinite(Date.parse(from))
    || date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    return NextResponse.json({ error: 'Invalid run filter.' }, { status: 400 })
  }
  let runs = loadRuns()
  if (pipelineId) runs = runs.filter(r => r.pipelineId === pipelineId)
  if (status) runs = runs.filter(r => status === 'completed' ? r.status === 'success' || r.status === 'failed' : r.status === status)
  if (from) runs = runs.filter(r => Date.parse(r.startedAt) >= Date.parse(from))
  if (date) runs = runs.filter(r => new Date(r.startedAt).toISOString().slice(0, 10) === date)
  return NextResponse.json(runs.slice(0, limit))
}

