import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadScans, saveScans } from '@/lib/data-store'
import type { SecurityScan } from '@/lib/data-store'
import crypto from 'crypto'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''
function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return !RUNNER_SECRET || token === RUNNER_SECRET
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadScans())
}

export async function POST(req: NextRequest) {
  if (!authRunner(req)) {
    const auth = await requireRole(req, 'admin')
    if (auth instanceof NextResponse) return auth
  }
  const body = await req.json() as Omit<SecurityScan, 'id'>
  const scan: SecurityScan = { ...body, id: crypto.randomUUID() }
  const scans = loadScans()
  scans.unshift(scan)
  saveScans(scans.slice(0, 200))
  return NextResponse.json(scan, { status: 201 })
}
