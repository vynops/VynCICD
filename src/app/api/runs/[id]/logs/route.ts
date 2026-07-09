import { NextRequest, NextResponse } from 'next/server'
import { loadRuns, appendStageLog } from '@/lib/data-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

// POST /api/runs/[id]/logs  — runner appends log lines to a stage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!authRunner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json() as { stage: string; lines: string[] }
  if (!body.stage || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: 'stage and lines[] required' }, { status: 400 })
  }

  const ok = appendStageLog(id, body.stage, body.lines)
  if (!ok) return NextResponse.json({ error: 'run or stage not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// GET /api/runs/[id]/logs?stage=build — authenticated users fetch logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const stage = req.nextUrl.searchParams.get('stage')
  const runs = loadRuns()
  const run = runs.find(r => r.id === id)
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (stage) {
    const s = run.stages.find(st => st.name === stage)
    return NextResponse.json(s ? s.logs : [])
  }
  // Return all stages with logs
  return NextResponse.json(run.stages.map(s => ({ name: s.name, logs: s.logs })))
}
