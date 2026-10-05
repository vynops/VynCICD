import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadIncidentWorkerStatus } from '@/lib/oncall-store'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  try { return NextResponse.json(loadIncidentWorkerStatus()) }
  catch { return NextResponse.json({ error: 'Worker status unavailable' }, { status: 503 }) }
}