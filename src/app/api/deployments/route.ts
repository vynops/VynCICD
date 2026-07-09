import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadDeployments, addDeployment } from '@/lib/data-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''
function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100')
  const env = req.nextUrl.searchParams.get('environment')
  let deps = loadDeployments()
  if (env) deps = deps.filter(d => d.environment === env)
  return NextResponse.json(deps.slice(0, limit))
}

export async function POST(req: NextRequest) {
  if (!authRunner(req)) {
    const auth = await requireRole(req, 'admin')
    if (auth instanceof NextResponse) return auth
  }
  const body = await req.json()
  const dep = addDeployment(body)
  return NextResponse.json(dep, { status: 201 })
}
